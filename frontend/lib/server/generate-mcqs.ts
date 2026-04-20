import { promptRegistry } from '@/lib/server/prompts';
import { extractNotes } from '@/lib/server/extract-notes';
import { validatePromptMcqPayload } from '@/lib/server/validation/mcq-validator';
import { fetchVertexAiGenerateContent } from '@/lib/server/vertex-ai';
import { createQuizToken } from '@/lib/server/quiz-token';
import type {
  GeneratedMcq,
  McqGenerationDiagnostics,
  McqGenerationResult,
  McqOption,
} from '@/lib/types/quiz';

type GenerateMcqsInput =
  | {
      title?: string;
      extractedText: string;
      keyTopics?: string[];
      questionCount?: number;
    }
  | {
      title?: string;
      questionCount?: number;
      source: {
        inputType: 'text';
        sourceUploadId?: string;
        rawText: string;
      };
    }
  | {
      title?: string;
      questionCount?: number;
      source: {
        inputType: 'storage';
        sourceUploadId?: string;
        storagePath: string;
        mimeType: string;
      };
    };

const MIN_QUESTION_COUNT = 5;
const MAX_QUESTION_COUNT = 15;
const MAX_DIRECT_MCQ_SOURCE_CHARS = 22_000;
const COMPRESSION_CHUNK_CHARS = 40_000;
const MAX_COMPRESSED_CONTEXT_CHARS = 20_000;
const MAX_TRACKED_TOPICS = 10;
const COMPRESSION_CONCURRENCY = 3;

type McqSourceContext = {
  sourceText: string;
  keyTopics: string[];
  sourceCharacters: number;
  contextCharacters: number;
  compressionChunkCount: number;
};

const getElapsedMs = (startMs: number): number => Math.max(0, Date.now() - startMs);

const getSafeModelLabel = (model: string): string => model.split('/').pop() || model;

const normalizeQuestionCount = (value?: number): number => {
  if (!value || Number.isNaN(value)) {
    return 5;
  }

  return Math.min(MAX_QUESTION_COUNT, Math.max(MIN_QUESTION_COUNT, Math.round(value)));
};

const parseJsonCandidate = (value: string): unknown | null => {
  const cleaned = value
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    const candidates: string[] = [];
    const objectStart = cleaned.indexOf('{');
    const objectEnd = cleaned.lastIndexOf('}');
    const arrayStart = cleaned.indexOf('[');
    const arrayEnd = cleaned.lastIndexOf(']');

    if (objectStart >= 0 && objectEnd > objectStart) {
      candidates.push(cleaned.slice(objectStart, objectEnd + 1));
    }

    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      candidates.push(cleaned.slice(arrayStart, arrayEnd + 1));
    }

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate) as unknown;
      } catch {
        // Try the next plausible JSON boundary.
      }
    }

    return null;
  }
};

const dedupeTopics = (topics: string[]): string[] => {
  const seen = new Set<string>();

  return topics.filter((topic) => {
    const normalized = topic.trim().toLowerCase();

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
};

const stripRepeatedBoilerplate = (value: string): string => {
  const lines = value.split('\n').map((line) => line.trim());
  const counts = new Map<string, number>();

  for (const line of lines) {
    if (line) {
      counts.set(line, (counts.get(line) ?? 0) + 1);
    }
  }

  return lines
    .filter((line) => {
      if (!line) {
        return false;
      }

      if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line)) {
        return false;
      }

      if ((counts.get(line) ?? 0) >= 3 && line.length <= 120) {
        return false;
      }

      return true;
    })
    .join('\n');
};

const splitTextIntoChunks = (value: string, maxChunkChars: number): string[] => {
  const paragraphs = value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (!currentChunk) {
      currentChunk = paragraph;
      continue;
    }

    if (`${currentChunk}\n\n${paragraph}`.length <= maxChunkChars) {
      currentChunk = `${currentChunk}\n\n${paragraph}`;
      continue;
    }

    chunks.push(currentChunk);
    currentChunk = paragraph;
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
};

const runWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await task(items[currentIndex], currentIndex);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
};

const getMcqOutputTokenLimit = (questionCount: number): number => {
  if (questionCount <= 5) {
    return 4_096;
  }

  if (questionCount <= 10) {
    return 6_144;
  }

  return 8_192;
};

const buildChunkCompressionPrompt = (input: {
  title?: string;
  keyTopics: string[];
  chunkIndex: number;
  chunkCount: number;
  chunkText: string;
}): string => `
You are preparing source-grounded UPSC GS Paper 1 revision context from one chunk of notes.

GOAL
Extract only the highest-yield facts and concepts from this chunk so another model can later generate precise MCQs.

RULES
1. Use only the source chunk below.
2. Do not add outside knowledge.
3. Remove noise such as repeated headers, institute branding, page markers, contact details, and duplicate boilerplate.
4. Preserve important facts, dates, constitutional articles, committee names, judgments, schemes, places, institutions, numbers, and cause-effect links.
5. Prefer concise bullet-like revision notes over prose.
6. Keep the summary dense and useful for MCQ writing.

Return valid JSON only in this shape:
{
  "summary": "string",
  "keyTopics": ["string"]
}

SOURCE TITLE:
${input.title ?? 'Uploaded notes'}

KNOWN TOPICS:
${input.keyTopics.join(', ') || 'Not provided'}

CHUNK:
${input.chunkIndex + 1} of ${input.chunkCount}

SOURCE TEXT:
${input.chunkText}
`;

const buildCompressionMergePrompt = (input: {
  title?: string;
  keyTopics: string[];
  combinedSummary: string;
}): string => `
You are merging chunk-level UPSC GS Paper 1 revision notes into one final MCQ-ready context.

GOAL
Create one concise, source-grounded revision brief that preserves the most important concepts and facts for MCQ generation.

RULES
1. Use only the material below.
2. Do not add outside knowledge.
3. Remove repetition.
4. Preserve specificity: dates, articles, institutions, places, committees, numbers, and distinctions.
5. Keep the final context compact but information-dense.

Return valid JSON only in this shape:
{
  "summary": "string",
  "keyTopics": ["string"]
}

SOURCE TITLE:
${input.title ?? 'Uploaded notes'}

KNOWN TOPICS:
${input.keyTopics.join(', ') || 'Not provided'}

CHUNK SUMMARIES:
${input.combinedSummary}
`;

const compressLargeSourceForMcqs = async (input: {
  title?: string;
  extractedText: string;
  keyTopics: string[];
}): Promise<McqSourceContext> => {
  const flashModel = process.env.GEMINI_FLASH_MODEL;

  if (!flashModel) {
    const sourceText = input.extractedText.slice(0, MAX_DIRECT_MCQ_SOURCE_CHARS);

    return {
      sourceText,
      keyTopics: input.keyTopics,
      sourceCharacters: input.extractedText.length,
      contextCharacters: sourceText.length,
      compressionChunkCount: 0,
    };
  }

  const cleanedText = stripRepeatedBoilerplate(input.extractedText);

  if (cleanedText.length <= MAX_DIRECT_MCQ_SOURCE_CHARS) {
    return {
      sourceText: cleanedText,
      keyTopics: input.keyTopics,
      sourceCharacters: cleanedText.length,
      contextCharacters: cleanedText.length,
      compressionChunkCount: 0,
    };
  }

  const chunks = splitTextIntoChunks(cleanedText, COMPRESSION_CHUNK_CHARS);
  const chunkResults = await runWithConcurrency(
    chunks,
    COMPRESSION_CONCURRENCY,
    async (chunkText, index) => {
      const response = await fetchVertexAiGenerateContent(flashModel, {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: buildChunkCompressionPrompt({
                  title: input.title,
                  keyTopics: input.keyTopics,
                  chunkIndex: index,
                  chunkCount: chunks.length,
                  chunkText,
                }),
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1_200,
          responseMimeType: 'application/json',
        },
      });

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              text?: string;
            }>;
          };
        }>;
      };

      const candidateText =
        data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('\n') ?? '';
      return parseJsonCandidate(candidateText) as
        | {
            summary?: string;
            keyTopics?: string[];
          }
        | null;
    },
  );

  const summarySections: string[] = [];
  const collectedTopics = [...input.keyTopics];

  for (const parsed of chunkResults) {
    if (parsed?.summary?.trim()) {
      summarySections.push(parsed.summary.trim());
    }

    if (Array.isArray(parsed?.keyTopics)) {
      collectedTopics.push(
        ...parsed.keyTopics.filter((topic): topic is string => typeof topic === 'string'),
      );
    }
  }

  const combinedSummary = summarySections.join('\n\n');

  if (!combinedSummary.trim()) {
    const sourceText = cleanedText.slice(0, MAX_DIRECT_MCQ_SOURCE_CHARS);

    return {
      sourceText,
      keyTopics: dedupeTopics(collectedTopics).slice(0, MAX_TRACKED_TOPICS),
      sourceCharacters: cleanedText.length,
      contextCharacters: sourceText.length,
      compressionChunkCount: chunks.length,
    };
  }

  if (combinedSummary.length <= MAX_COMPRESSED_CONTEXT_CHARS) {
    return {
      sourceText: combinedSummary,
      keyTopics: dedupeTopics(collectedTopics).slice(0, MAX_TRACKED_TOPICS),
      sourceCharacters: cleanedText.length,
      contextCharacters: combinedSummary.length,
      compressionChunkCount: chunks.length,
    };
  }

  const mergeResponse = await fetchVertexAiGenerateContent(flashModel, {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: buildCompressionMergePrompt({
              title: input.title,
              keyTopics: dedupeTopics(collectedTopics).slice(0, MAX_TRACKED_TOPICS),
              combinedSummary,
            }),
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2_000,
      responseMimeType: 'application/json',
    },
  });

  const mergeData = (await mergeResponse.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  const mergedCandidateText =
    mergeData.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('\n') ?? '';
  const mergedParsed = parseJsonCandidate(mergedCandidateText) as
    | {
        summary?: string;
        keyTopics?: string[];
      }
    | null;

  const sourceText =
    mergedParsed?.summary?.trim()?.slice(0, MAX_COMPRESSED_CONTEXT_CHARS) ??
    combinedSummary.slice(0, MAX_COMPRESSED_CONTEXT_CHARS);

  return {
    sourceText,
    keyTopics: dedupeTopics([
      ...collectedTopics,
      ...(Array.isArray(mergedParsed?.keyTopics)
        ? mergedParsed.keyTopics.filter((topic): topic is string => typeof topic === 'string')
        : []),
    ]).slice(0, MAX_TRACKED_TOPICS),
    sourceCharacters: cleanedText.length,
    contextCharacters: sourceText.length,
    compressionChunkCount: chunks.length,
  };
};

const mapPromptOptionToQuizOption = (value: string): McqOption => {
  const [id, ...rest] = value.split('.');

  return {
    id: id.trim() as McqOption['id'],
    text: rest.join('.').trim(),
  };
};

const mapPromptQuestionToGeneratedMcq = (
  question: ReturnType<typeof validatePromptMcqPayload>['questions'][number],
): GeneratedMcq => ({
  question: question.question,
  options: question.options.map(mapPromptOptionToQuizOption) as [
    McqOption,
    McqOption,
    McqOption,
    McqOption,
  ],
  correctAnswer: question.correctAnswer,
  explanation: question.explanation,
  conceptTag: question.concepts[0] || undefined,
  sourceSupport: question.sourceSupport,
});

export const generateMcqs = async (input: GenerateMcqsInput): Promise<McqGenerationResult> => {
  const totalStartMs = Date.now();
  const proModel = process.env.GEMINI_PRO_MODEL;
  const flashModel = process.env.GEMINI_FLASH_MODEL;

  if (!proModel && !flashModel) {
    throw new Error(
      'Missing Vertex AI configuration. Add GEMINI_FLASH_MODEL or GEMINI_PRO_MODEL to the frontend environment.',
    );
  }

  let extractedText = '';
  let topics: string[] = [];
  let resolvedTitle = input.title?.trim();
  let extractionMs = 0;
  let extractionMethod: McqGenerationDiagnostics['extractionMethod'];
  let extractionCacheStatus: McqGenerationDiagnostics['extractionCacheStatus'];

  if ('extractedText' in input) {
    extractedText = input.extractedText.trim();
    topics = (input.keyTopics ?? []).filter(Boolean).slice(0, 8);
    extractionMethod = 'normalized_text';
    extractionCacheStatus = 'not_applicable';
  } else {
    const extractionStartMs = Date.now();
    const extraction = await extractNotes(
      input.source.inputType === 'text'
        ? {
            inputType: 'text',
            rawText: input.source.rawText,
            sourceUploadId: input.source.sourceUploadId,
            title: input.title,
          }
        : {
            inputType: 'storage',
            sourceUploadId: input.source.sourceUploadId,
            storagePath: input.source.storagePath,
            mimeType: input.source.mimeType,
            title: input.title,
          },
    );

    extractedText = extraction.extractedText.trim();
    topics = extraction.keyTopics.slice(0, 8);
    resolvedTitle = extraction.title;
    extractionMs = getElapsedMs(extractionStartMs);
    extractionMethod = extraction.method;
    extractionCacheStatus = extraction.cacheStatus;
  }

  if (!extractedText) {
    throw new Error('There is no extracted text available yet. Run extraction first.');
  }

  const questionCount = normalizeQuestionCount(input.questionCount);
  const compressionStartMs = Date.now();
  const mcqSource = await compressLargeSourceForMcqs({
    title: resolvedTitle,
    extractedText,
    keyTopics: topics,
  });
  const compressionMs = getElapsedMs(compressionStartMs);
  const mcqGenerationStartMs = Date.now();
  let lastValidationError: Error | null = null;
  const generationModels = Array.from(
    new Set([flashModel, proModel].filter((model): model is string => Boolean(model))),
  );
  let bestParsedPayload: ReturnType<typeof validatePromptMcqPayload> | null = null;
  let bestParsedPayloadModel = generationModels[0] ?? 'unknown';
  let bestParsedPayloadAttempt = 0;
  let generationAttemptCount = 0;

  const buildDiagnostics = (inputDiagnostics: {
    modelUsed: string;
    fallbackCount: number;
    returnedPartialSet?: boolean;
  }): McqGenerationDiagnostics => ({
    sourceCharacters: mcqSource.sourceCharacters,
    contextCharacters: mcqSource.contextCharacters,
    compressionChunkCount: mcqSource.compressionChunkCount,
    extractionMs,
    compressionMs,
    mcqGenerationMs: getElapsedMs(mcqGenerationStartMs),
    totalMs: getElapsedMs(totalStartMs),
    extractionMethod,
    extractionCacheStatus,
    modelUsed: getSafeModelLabel(inputDiagnostics.modelUsed),
    fallbackCount: inputDiagnostics.fallbackCount,
    returnedPartialSet: inputDiagnostics.returnedPartialSet,
  });

  for (let modelIndex = 0; modelIndex < generationModels.length; modelIndex += 1) {
    const model = generationModels[modelIndex];
    const isFinalModel = modelIndex === generationModels.length - 1;
    const retryCount = isFinalModel || generationModels.length === 1 ? 2 : 1;

    for (let retryIndex = 0; retryIndex < retryCount; retryIndex += 1) {
      const currentAttempt = generationAttemptCount;
      generationAttemptCount += 1;
      const prompt = promptRegistry.mcq.upscGs1({
        title: resolvedTitle,
        questionCount,
        keyTopics: mcqSource.keyTopics,
        sourceText: mcqSource.sourceText,
        validationFeedback: lastValidationError?.message,
        prioritizeCorrectness: model === proModel || isFinalModel || retryIndex > 0,
      });

      const response = await fetchVertexAiGenerateContent(model, {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: retryIndex > 0 ? 0.15 : 0.25,
          maxOutputTokens: getMcqOutputTokenLimit(questionCount),
          responseMimeType: 'application/json',
        },
      });

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              text?: string;
            }>;
          };
        }>;
      };

      const candidateText =
        data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('\n') ?? '';

      try {
        const parsed = validatePromptMcqPayload(parseJsonCandidate(candidateText));

        if (!bestParsedPayload || parsed.questions.length > bestParsedPayload.questions.length) {
          bestParsedPayload = parsed;
          bestParsedPayloadModel = model;
          bestParsedPayloadAttempt = currentAttempt;
        }

        if (parsed.questions.length < questionCount) {
          throw new Error(`The model returned only ${parsed.questions.length} valid questions.`);
        }

        const mcqs = parsed.questions.slice(0, questionCount).map(mapPromptQuestionToGeneratedMcq);

        if (mcqs.length < MIN_QUESTION_COUNT) {
          throw new Error('The model returned too few valid MCQs. Try again.');
        }

        const title = resolvedTitle || 'Generated quiz';

        return {
          title,
          questionCount: mcqs.length,
          mcqs,
          quizToken: createQuizToken({
            title,
            mcqs,
          }),
          diagnostics: buildDiagnostics({
            modelUsed: model,
            fallbackCount: currentAttempt,
          }),
          qualityCheck: parsed.qualityCheck,
        };
      } catch (error) {
        lastValidationError =
          error instanceof Error ? error : new Error('Vertex AI did not return valid MCQ output.');
      }
    }
  }

  if (bestParsedPayload && bestParsedPayload.questions.length >= MIN_QUESTION_COUNT) {
    const mcqs = bestParsedPayload.questions
      .slice(0, questionCount)
      .map(mapPromptQuestionToGeneratedMcq);
    const title = resolvedTitle || 'Generated quiz';

    return {
      title,
      questionCount: mcqs.length,
      mcqs,
      quizToken: createQuizToken({
        title,
        mcqs,
      }),
      diagnostics: buildDiagnostics({
        modelUsed: bestParsedPayloadModel,
        fallbackCount: bestParsedPayloadAttempt,
        returnedPartialSet: true,
      }),
      qualityCheck: {
        ...bestParsedPayload.qualityCheck,
        notes:
          bestParsedPayload.questions.length < questionCount
            ? `Generated ${bestParsedPayload.questions.length} valid MCQs from this source.`
            : bestParsedPayload.qualityCheck.notes,
      },
    };
  }

  throw new Error(
    lastValidationError?.message ??
      'The model response could not be shaped into a valid quiz. Please try again.',
  );
};
