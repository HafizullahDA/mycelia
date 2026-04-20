export type McqOptionId = 'A' | 'B' | 'C' | 'D';

export type McqOption = {
  id: McqOptionId;
  text: string;
};

export type QuestionQualityLabel = 'good' | 'too_easy' | 'malformed' | 'off_style' | 'unsupported';

export type GeneratedMcq = {
  question: string;
  options: [McqOption, McqOption, McqOption, McqOption];
  correctAnswer: McqOptionId;
  explanation: string;
  conceptTag?: string;
  sourceSupport?: string;
};

export type McqGenerationDiagnostics = {
  sourceCharacters: number;
  contextCharacters: number;
  compressionChunkCount: number;
  extractionMs: number;
  compressionMs: number;
  mcqGenerationMs: number;
  totalMs: number;
  extractionMethod?: 'normalized_text' | 'gemini_flash';
  extractionCacheStatus?: 'hit' | 'miss' | 'not_applicable';
  modelUsed: string;
  fallbackCount: number;
  returnedPartialSet?: boolean;
};

export type McqGenerationResult = {
  title: string;
  questionCount: number;
  mcqs: GeneratedMcq[];
  quizToken: string;
  diagnostics?: McqGenerationDiagnostics;
  qualityCheck?: {
    sourceAdequate: boolean;
    notes: string;
  };
};

export type QuizResultItem = {
  id?: string;
  questionIndex: number;
  question: string;
  options: [McqOption, McqOption, McqOption, McqOption];
  selectedAnswer: McqOptionId;
  correctAnswer: McqOptionId;
  isCorrect: boolean;
  explanation: string;
  conceptTag?: string;
  sourceSupport?: string;
  qualityLabel?: QuestionQualityLabel;
  qualityNote?: string;
  qualityMarkedAt?: string;
};

export type SaveQuizResultsInput = {
  sourceUploadId?: string;
  title: string;
  questionCount: number;
  correctCount: number;
  scorePercent: number;
  durationSeconds?: number;
  results: QuizResultItem[];
};

export type SaveQuizResultsResult = {
  sessionId: string;
  questionCount: number;
  correctCount: number;
  scorePercent: number;
};

export type SubmitQuizAttemptInput = {
  sourceUploadId?: string;
  quizToken: string;
  selectedAnswers: McqOptionId[];
  durationSeconds?: number;
};

export type SavedQuizSessionSummary = {
  id: string;
  title: string;
  questionCount: number;
  correctCount: number;
  scorePercent: number;
  durationSeconds: number | null;
  createdAt: string;
};

export type SavedQuizSessionDetail = SavedQuizSessionSummary & {
  results: QuizResultItem[];
};

export type MarkQuestionQualityInput = {
  questionResultId: string;
  label: QuestionQualityLabel;
  note?: string;
};
