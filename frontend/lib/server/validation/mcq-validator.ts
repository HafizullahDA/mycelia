import type { PromptMcq, PromptMcqPayload, McqOptionId } from '@/lib/server/validation/mcq-types';

const OPTION_IDS = ['A', 'B', 'C', 'D'] as const;

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
    .slice(0, 6);
};

const asOptionId = (value: unknown, errorMessage: string): McqOptionId => {
  if (value === 'A' || value === 'B' || value === 'C' || value === 'D') {
    return value;
  }

  throw new Error(errorMessage);
};

const validateOptions = (value: unknown, index: number): [string, string, string, string] => {
  if (!Array.isArray(value) || value.length !== 4) {
    throw new Error(`Question ${index + 1} must contain exactly 4 options.`);
  }

  const options = value.map((option, optionIndex) => {
    const text = asTrimmedString(
      option,
      `Question ${index + 1} option ${optionIndex + 1} is invalid.`,
    );
    const expectedPrefix = `${OPTION_IDS[optionIndex]}.`;

    if (!text.startsWith(expectedPrefix)) {
      throw new Error(
        `Question ${index + 1} option ${optionIndex + 1} must start with "${expectedPrefix}"`,
      );
    }

    return text;
  }) as [string, string, string, string];

  const normalizedOptionBodies = options.map((option) => option.slice(2).trim().toLowerCase());

  if (new Set(normalizedOptionBodies).size !== 4) {
    throw new Error(`Question ${index + 1} contains duplicate or near-duplicate options.`);
  }

  return options;
};

const ensureQuestionQuality = ({
  question,
  options,
  explanation,
  sourceSupport,
  index,
}: {
  question: string;
  options: [string, string, string, string];
  explanation: string;
  sourceSupport: string;
  index: number;
}) => {
  if (question.length < 20) {
    throw new Error(`Question ${index + 1} is too short to be meaningful.`);
  }

  if (explanation.length < 20) {
    throw new Error(`Question ${index + 1} explanation is too weak.`);
  }

  if (sourceSupport.length < 12) {
    throw new Error(`Question ${index + 1} sourceSupport is too weak.`);
  }

  for (const body of options.map((option) => option.slice(2).trim())) {
    if (body.length < 3) {
      throw new Error(`Question ${index + 1} has an unusably short option.`);
    }
  }
};

const validateSingleQuestion = (value: unknown, index: number): PromptMcq => {
  if (!value || typeof value !== 'object') {
    throw new Error(`Question ${index + 1} is not a valid object.`);
  }

  const item = value as Record<string, unknown>;
  const question = asTrimmedString(item.question, `Question ${index + 1} is missing question text.`);
  const explanation = asTrimmedString(
    item.explanation,
    `Question ${index + 1} is missing explanation.`,
  );
  const sourceSupport = asTrimmedString(
    item.sourceSupport,
    `Question ${index + 1} is missing sourceSupport.`,
  );
  const correctAnswer = asOptionId(
    item.correctAnswer,
    `Question ${index + 1} has invalid correctAnswer.`,
  );
  const concepts = asStringArray(item.concepts, `Question ${index + 1} has invalid concepts.`);
  const options = validateOptions(item.options, index);

  ensureQuestionQuality({
    question,
    options,
    explanation,
    sourceSupport,
    index,
  });

  return {
    question,
    options,
    correctAnswer,
    explanation,
    concepts,
    sourceSupport,
  };
};

const validateQualityCheck = (value: unknown): { sourceAdequate: boolean; notes: string } => {
  if (!value || typeof value !== 'object') {
    throw new Error('qualityCheck is invalid.');
  }

  const item = value as Record<string, unknown>;

  if (typeof item.sourceAdequate !== 'boolean') {
    throw new Error('qualityCheck.sourceAdequate must be boolean.');
  }

  return {
    sourceAdequate: item.sourceAdequate,
    notes: asTrimmedString(item.notes, 'qualityCheck.notes is required.'),
  };
};

export const validatePromptMcqPayload = (payload: unknown): PromptMcqPayload => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('MCQ payload is not an object.');
  }

  const candidate = payload as Record<string, unknown>;
  const questions = candidate.questions;
  const qualityCheck = candidate.qualityCheck;

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('MCQ payload must contain a non-empty questions array.');
  }

  return {
    questions: questions.map((question, index) => validateSingleQuestion(question, index)),
    qualityCheck: validateQualityCheck(qualityCheck),
  };
};
