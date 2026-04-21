import type { PromptMcq, PromptMcqPayload, McqOptionId } from '@/lib/server/validation/mcq-types';

const OPTION_IDS = ['A', 'B', 'C', 'D'] as const;
const DISALLOWED_QUESTION_PATTERNS = [
  /table of contents/i,
  /major thematic area/i,
  /major section/i,
  /under which (major )?(section|category|heading|thematic area)/i,
  /falls under which/i,
  /discussed under which/i,
  /mentioned .* falls under/i,
  /provided table of contents/i,
  /digest.*topic.*under/i,
] as const;

const asTrimmedString = (value: unknown, errorMessage: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(errorMessage);
  }

  return value.trim();
};

const asOptionalStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
};

const asOptionId = (value: unknown, errorMessage: string): McqOptionId => {
  if (value === 'A' || value === 'B' || value === 'C' || value === 'D') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase().replace(/[^A-D]/g, '');

    if (
      normalized[0] === 'A' ||
      normalized[0] === 'B' ||
      normalized[0] === 'C' ||
      normalized[0] === 'D'
    ) {
      return normalized[0];
    }
  }

  throw new Error(errorMessage);
};

const normalizeOptionText = (option: unknown, optionIndex: number): string => {
  const optionRecord =
    option && typeof option === 'object' ? (option as Record<string, unknown>) : null;
  const optionBody =
    typeof option === 'string'
      ? option
      : typeof optionRecord?.text === 'string'
        ? optionRecord.text
        : typeof optionRecord?.label === 'string'
          ? optionRecord.label
          : typeof optionRecord?.value === 'string'
            ? optionRecord.value
            : '';
  const text = asTrimmedString(optionBody, `Option ${optionIndex + 1} is invalid.`);
  const expectedPrefix = `${OPTION_IDS[optionIndex]}.`;

  if (text.startsWith(expectedPrefix)) {
    return text;
  }

  const strippedPrefix = text.replace(/^\(?[A-Da-d]\)?[.)-]?\s*/, '').trim();

  return `${expectedPrefix} ${strippedPrefix || text}`;
};

const validateOptions = (value: unknown, index: number): [string, string, string, string] => {
  if (!Array.isArray(value) || value.length !== 4) {
    throw new Error(`Generated MCQ ${index + 1} must include exactly 4 options.`);
  }

  return value.map((option, optionIndex) =>
    normalizeOptionText(option, optionIndex),
  ) as [string, string, string, string];
};

const validateSingleQuestion = (value: unknown, index: number): PromptMcq => {
  if (!value || typeof value !== 'object') {
    throw new Error(`Generated MCQ ${index + 1} is not a valid object.`);
  }

  const item = value as Record<string, unknown>;
  const question = asTrimmedString(
    item.question ?? item.stem ?? item.questionText,
    `Generated MCQ ${index + 1} is missing a question.`,
  );

  if (DISALLOWED_QUESTION_PATTERNS.some((pattern) => pattern.test(question))) {
    throw new Error(`Generated MCQ ${index + 1} asks about document structure instead of content.`);
  }

  const explanation = asTrimmedString(
    item.explanation ?? item.rationale,
    `Generated MCQ ${index + 1} is missing an explanation.`,
  );
  const correctAnswer = asOptionId(
    item.correctAnswer ?? item.answer,
    `Generated MCQ ${index + 1} has an invalid correct answer.`,
  );
  const options = validateOptions(item.options, index);
  const conceptTag = typeof item.conceptTag === 'string' ? item.conceptTag.trim() : '';
  const concepts = asOptionalStringArray(item.concepts);
  const sourceSupport =
    typeof item.sourceSupport === 'string' && item.sourceSupport.trim()
      ? item.sourceSupport.trim()
      : typeof item.support === 'string' && item.support.trim()
        ? item.support.trim()
        : typeof item.evidence === 'string' && item.evidence.trim()
          ? item.evidence.trim()
          : explanation;

  return {
    question,
    options,
    correctAnswer,
    explanation,
    concepts: concepts.length > 0 ? concepts : [conceptTag].filter(Boolean),
    sourceSupport,
  };
};

const validateQualityCheck = (value: unknown): { sourceAdequate: boolean; notes: string } => {
  if (!value || typeof value !== 'object') {
    return {
      sourceAdequate: true,
      notes: 'Generated quiz passed structural validation.',
    };
  }

  const item = value as Record<string, unknown>;

  return {
    sourceAdequate:
      typeof item.sourceAdequate === 'boolean' ? item.sourceAdequate : true,
    notes:
      typeof item.notes === 'string' && item.notes.trim()
        ? item.notes.trim()
        : 'Generated quiz passed structural validation.',
  };
};

export const validatePromptMcqPayload = (payload: unknown): PromptMcqPayload => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('MCQ payload is not an object.');
  }

  const candidate = Array.isArray(payload)
    ? {
        questions: payload,
        qualityCheck: {
          sourceAdequate: true,
          notes: 'Generated quiz returned as a question array.',
        },
      }
    : (payload as Record<string, unknown>);
  const questions = candidate.questions ?? candidate.mcqs ?? candidate.items;
  const qualityCheck = candidate.qualityCheck;

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('MCQ payload must contain a non-empty questions array.');
  }

  return {
    questions: questions.map((question, index) => validateSingleQuestion(question, index)),
    qualityCheck: validateQualityCheck(qualityCheck),
  };
};
