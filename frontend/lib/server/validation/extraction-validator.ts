import type { ExtractionPayload } from '@/lib/server/validation/mcq-types';

const asTrimmedString = (value: unknown, errorMessage: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(errorMessage);
  }

  return value.trim();
};

const asStringArray = (value: unknown, errorMessage: string): string[] => {
  if (!Array.isArray(value)) {
    throw new Error(errorMessage);
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
};

export const validateExtractionPayload = (payload: unknown): ExtractionPayload => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Extraction payload is invalid.');
  }

  const item = payload as Record<string, unknown>;

  const documentTitle = asTrimmedString(item.documentTitle, 'documentTitle is required.');
  const extractedText = asTrimmedString(item.extractedText, 'extractedText is required.');
  const keyTopics = asStringArray(item.keyTopics, 'keyTopics must be an array.');

  if (extractedText.length < 50) {
    throw new Error('Extracted text is too short to be useful.');
  }

  return {
    documentTitle,
    extractedText,
    keyTopics,
  };
};
