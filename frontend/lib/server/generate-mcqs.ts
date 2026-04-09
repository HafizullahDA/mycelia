import { buildVertexAiGenerateContentUrl } from '@/lib/server/vertex-ai';
import { createQuizToken } from '@/lib/server/quiz-token';
import type { GeneratedMcq, McqOption, McqGenerationResult } from '@/lib/types/quiz';

export type GenerateMcqsInput = {
  title?: string;
  extractedText: string;
  keyTopics?: string[];
  questionCount?: number;
};

type ParsedMcqPayload = {
  title?: string;
  mcqs?: Array<{
    question?: string;
    options?: Array<{
      id?: string;
      text?: string;
    }>;
    correctAnswer?: string;
    explanation?: string;
    conceptTag?: string;
  }>;
};

const MIN_QUESTION_COUNT = 5;
const MAX_QUESTION_COUNT = 10;

const normalizeQuestionCount = (value?: number): number => {
  if (!value || Number.isNaN(value)) {
    return 5;
  }

  return Math.min(MAX_QUESTION_COUNT, Math.max(MIN_QUESTION_COUNT, Math.round(value)));
};

const parseJsonCandidate = (value: string): ParsedMcqPayload | null => {
  try {
    return JSON.parse(value) as ParsedMcqPayload;
  } catch {
    const match = value.match(/\{[\s\S]*\}/);

    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]) as ParsedMcqPayload;
    } catch {
      return null;
    }
  }
};

const isOptionId = (value: string): value is McqOption['id'] =>
  value === 'A' || value === 'B' || value === 'C' || value === 'D';

const validateMcq = (
  mcq: NonNullable<ParsedMcqPayload['mcqs']>[number],
  index: number,
): GeneratedMcq => {
  const question = mcq?.question?.trim();
  const explanation = mcq?.explanation?.trim();
  const correctAnswer = mcq?.correctAnswer?.trim().toUpperCase();
  const options = mcq?.options ?? [];

  if (!question) {
    throw new Error(`Generated MCQ ${index + 1} is missing a question.`);
  }

  if (!explanation) {
    throw new Error(`Generated MCQ ${index + 1} is missing an explanation.`);
  }

  if (!isOptionId(correctAnswer ?? '')) {
    throw new Error(`Generated MCQ ${index + 1} has an invalid correct answer.`);
  }

  if (options.length !== 4) {
    throw new Error(`Generated MCQ ${index + 1} must include exactly 4 options.`);
  }

  const normalizedOptions = options.map((option, optionIndex) => {
    const id = option?.id?.trim().toUpperCase();
    const text = option?.text?.trim();

    if (!isOptionId(id ?? '')) {
      throw new Error(`Generated MCQ ${index + 1} has an invalid option label.`);
    }

    if (!text) {
      throw new Error(`Generated MCQ ${index + 1} option ${optionIndex + 1} is empty.`);
    }

    return {
      id,
      text,
    };
  });

  const orderedOptions = ['A', 'B', 'C', 'D'].map((expectedId) => {
    const matchedOption = normalizedOptions.find((option) => option.id === expectedId);

    if (!matchedOption) {
      throw new Error(`Generated MCQ ${index + 1} is missing option ${expectedId}.`);
    }

    return matchedOption;
  }) as [McqOption, McqOption, McqOption, McqOption];

  return {
    question,
    options: orderedOptions,
    correctAnswer: correctAnswer as McqOption['id'],
    explanation,
    conceptTag: mcq?.conceptTag?.trim() || undefined,
  };
};

export const generateMcqs = async (input: GenerateMcqsInput): Promise<McqGenerationResult> => {
  const model = process.env.GEMINI_PRO_MODEL;

  if (!model) {
    throw new Error(
      'Missing Vertex AI configuration. Add GEMINI_PRO_MODEL to the frontend environment.',
    );
  }

  const extractedText = input.extractedText.trim();

  if (!extractedText) {
    throw new Error('There is no extracted text available yet. Run extraction first.');
  }

  const questionCount = normalizeQuestionCount(input.questionCount);
  const topics = (input.keyTopics ?? []).filter(Boolean).slice(0, 8);

  const prompt = [
    'You write premium UPSC Civil Services preliminary exam style MCQs.',
    'Return valid JSON only.',
    'Use this exact shape:',
    '{"title":"string","mcqs":[{"question":"string","options":[{"id":"A","text":"string"},{"id":"B","text":"string"},{"id":"C","text":"string"},{"id":"D","text":"string"}],"correctAnswer":"A","explanation":"string","conceptTag":"string"}]}',
    `Generate exactly ${questionCount} MCQs.`,
    'The questions must feel like serious UPSC preparation material, not generic school trivia.',
    'Prefer concept clarity, constitutional nuance, historical precision, governance framing, and close distractors when the material supports it.',
    'Every question must have exactly 4 options and exactly 1 correct answer.',
    'Each explanation should briefly justify the correct answer and, when useful, explain why the distractors are wrong.',
    'Do not invent facts that are not grounded in the source notes.',
    input.title ? `Source title: ${input.title}` : 'Source title: Uploaded notes',
    topics.length > 0 ? `Priority topics: ${topics.join(', ')}` : 'Priority topics: none provided',
    'Source notes:',
    extractedText,
  ].join('\n');

  const response = await fetch(buildVertexAiGenerateContentUrl(model), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vertex AI Pro request failed: ${errorText}`);
  }

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
  const parsed = parseJsonCandidate(candidateText);

  if (!parsed?.mcqs?.length) {
    throw new Error('Vertex AI Pro did not return valid MCQ output.');
  }

  const mcqs = parsed.mcqs.slice(0, questionCount).map((mcq, index) => validateMcq(mcq, index));

  if (mcqs.length < MIN_QUESTION_COUNT) {
    throw new Error('The model returned too few valid MCQs. Try again.');
  }

  const title = parsed.title?.trim() || input.title?.trim() || 'Generated quiz';

  return {
    title,
    questionCount: mcqs.length,
    mcqs,
    quizToken: createQuizToken({
      title,
      mcqs,
    }),
  };
};
