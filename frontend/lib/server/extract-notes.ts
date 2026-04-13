import { promptRegistry } from '@/lib/server/prompts';
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin';
import { validateExtractionPayload } from '@/lib/server/validation/extraction-validator';
import { fetchVertexAiGenerateContent } from '@/lib/server/vertex-ai';
import { createRequire } from 'node:module';
import { PDFDocument } from 'pdf-lib';

export type ExtractNotesInput =
  | {
      inputType: 'text';
      rawText: string;
      title?: string;
    }
  | {
      inputType: 'storage';
      storagePath: string;
      mimeType: string;
      title?: string;
    };

export type ExtractNotesResult = {
  title: string;
  extractedText: string;
  keyTopics: string[];
  method: 'normalized_text' | 'gemini_flash';
  characterCount: number;
};

const MAX_VERTEX_INLINE_FILE_BYTES = 10 * 1024 * 1024;
const MAX_PDF_PAGES_PER_CHUNK = 12;
const require = createRequire(import.meta.url);

const normalizeText = (value: string): string =>
  value
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const deriveKeyTopicsFromText = (value: string): string[] =>
  dedupeTopics(
    value
      .split(/\n+/)
      .map((line) => line.replace(/^[-*#\d.\s]+/, '').trim())
      .filter((line) => line.length > 8),
  ).slice(0, 8);

const parseJsonCandidate = (value: string): unknown | null => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    const match = value.match(/\{[\s\S]*\}/);

    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]) as unknown;
    } catch {
      return null;
    }
  }
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => Buffer.from(buffer).toString('base64');

const toOwnedArrayBuffer = (value: Uint8Array): ArrayBuffer => Uint8Array.from(value).buffer;

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

const splitPdfIntoVertexChunks = async (fileBytes: ArrayBuffer): Promise<ArrayBuffer[]> => {
  const pdfDocument = await PDFDocument.load(fileBytes);
  const totalPages = pdfDocument.getPageCount();

  if (totalPages === 0) {
    throw new Error('The uploaded PDF does not contain any pages to process.');
  }

  const chunks: ArrayBuffer[] = [];
  let currentPage = 0;

  while (currentPage < totalPages) {
    let pageSpan = Math.min(MAX_PDF_PAGES_PER_CHUNK, totalPages - currentPage);
    let chunkBytes: Uint8Array | null = null;
    let usedPageSpan = 0;

    while (pageSpan >= 1) {
      const chunkDocument = await PDFDocument.create();
      const pageIndexes = Array.from({ length: pageSpan }, (_, index) => currentPage + index);
      const copiedPages = await chunkDocument.copyPages(pdfDocument, pageIndexes);

      copiedPages.forEach((page) => {
        chunkDocument.addPage(page);
      });

      const savedChunk = await chunkDocument.save();

      if (savedChunk.byteLength <= MAX_VERTEX_INLINE_FILE_BYTES || pageSpan === 1) {
        chunkBytes = savedChunk;
        usedPageSpan = pageSpan;
        break;
      }

      pageSpan -= 1;
    }

    if (!chunkBytes || usedPageSpan === 0) {
      throw new Error('The uploaded PDF could not be split into smaller processing batches.');
    }

    if (chunkBytes.byteLength > MAX_VERTEX_INLINE_FILE_BYTES) {
      throw new Error(
        'One or more PDF pages are too large for the current processing pipeline. Try a cleaner export, lower-resolution scan, or paste the relevant notes as text.',
      );
    }

    chunks.push(toOwnedArrayBuffer(chunkBytes));
    currentPage += usedPageSpan;
  }

  return chunks;
};

const extractTextWithVertexAi = async (
  fileBytes: ArrayBuffer,
  mimeType: string,
  title?: string,
) => {
  const model = process.env.GEMINI_FLASH_MODEL;

  if (!model) {
    throw new Error(
      'Missing Vertex AI model configuration. Add GEMINI_FLASH_MODEL to the frontend environment.',
    );
  }

  let lastValidationError: Error | null = null;
  const maxAttempts = 2;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const prompt = promptRegistry.extraction.upscGs1({
      title,
      validationFeedback: lastValidationError?.message,
    });

    const response = await fetchVertexAiGenerateContent(model, {
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: arrayBufferToBase64(fileBytes),
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
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
      const parsed = validateExtractionPayload(parseJsonCandidate(candidateText));

      return {
        title: parsed.documentTitle || title || 'Uploaded notes',
        extractedText: normalizeText(parsed.extractedText),
        keyTopics: parsed.keyTopics,
      };
    } catch (error) {
      lastValidationError =
        error instanceof Error ? error : new Error('Vertex AI Flash did not return valid extraction output.');
    }
  }

  throw new Error(
    lastValidationError?.message ?? 'Vertex AI Flash did not return valid extraction output.',
  );
};

const extractPdfWithVertexAi = async (fileBytes: ArrayBuffer, title?: string) => {
  const pdfChunks = await splitPdfIntoVertexChunks(fileBytes);
  const extractedSections: string[] = [];
  const collectedTopics: string[] = [];

  for (let index = 0; index < pdfChunks.length; index += 1) {
    const chunkLabel =
      pdfChunks.length > 1
        ? `${title ?? 'Uploaded notes'} (pages batch ${index + 1} of ${pdfChunks.length})`
        : title;
    const chunkExtraction = await extractTextWithVertexAi(
      pdfChunks[index],
      'application/pdf',
      chunkLabel,
    );

    if (chunkExtraction.extractedText.trim()) {
      extractedSections.push(chunkExtraction.extractedText.trim());
    }

    collectedTopics.push(...chunkExtraction.keyTopics);
  }

  const extractedText = normalizeText(extractedSections.join('\n\n'));

  if (!extractedText) {
    throw new Error('The uploaded PDF did not produce any readable extracted text.');
  }

  return {
    title: title?.trim() || 'Uploaded notes',
    extractedText,
    keyTopics: dedupeTopics(collectedTopics).slice(0, 8),
  };
};

const extractPdfTextLocally = async (fileBytes: ArrayBuffer) => {
  const parsePdf = require('pdf-parse/lib/pdf-parse.js') as (
    dataBuffer: Buffer | Uint8Array,
  ) => Promise<{ text: string }>;

  const textResult = await parsePdf(Buffer.from(fileBytes));

  return normalizeText(textResult.text);
};

export const extractNotes = async (input: ExtractNotesInput): Promise<ExtractNotesResult> => {
  if (input.inputType === 'text') {
    const extractedText = normalizeText(input.rawText);

    if (!extractedText) {
      throw new Error('There was no readable text to extract.');
    }

    const keyTopics = extractedText
      ? deriveKeyTopicsFromText(extractedText)
      : [];

    return {
      title: input.title?.trim() || 'Pasted notes',
      extractedText,
      keyTopics,
      method: 'normalized_text',
      characterCount: extractedText.length,
    };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.storage.from('raw-notes').download(input.storagePath);

  if (error || !data) {
    throw new Error('The uploaded file could not be loaded from storage.');
  }

  const fileBytes = await data.arrayBuffer();

  if (input.mimeType === 'application/pdf') {
    const localPdfText = await extractPdfTextLocally(fileBytes);

    if (localPdfText.length >= 500) {
      return {
        title: input.title?.trim() || 'Uploaded notes',
        extractedText: localPdfText,
        keyTopics: deriveKeyTopicsFromText(localPdfText),
        method: 'normalized_text',
        characterCount: localPdfText.length,
      };
    }

    const extracted = await extractPdfWithVertexAi(fileBytes, input.title);

    return {
      ...extracted,
      method: 'gemini_flash',
      characterCount: extracted.extractedText.length,
    };
  }

  if (fileBytes.byteLength > MAX_VERTEX_INLINE_FILE_BYTES) {
    throw new Error(
      'This PDF or image is too large for the current processing pipeline. Use a smaller file, split the document, or paste the relevant notes as text.',
    );
  }

  const extracted = await extractTextWithVertexAi(fileBytes, input.mimeType, input.title);

  return {
    ...extracted,
    method: 'gemini_flash',
    characterCount: extracted.extractedText.length,
  };
};
