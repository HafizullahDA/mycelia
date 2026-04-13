export type McqOptionId = 'A' | 'B' | 'C' | 'D';

export type McqOption = {
  id: McqOptionId;
  text: string;
};

export type GeneratedMcq = {
  question: string;
  options: [McqOption, McqOption, McqOption, McqOption];
  correctAnswer: McqOptionId;
  explanation: string;
  conceptTag?: string;
  sourceSupport?: string;
};

export type McqGenerationResult = {
  title: string;
  questionCount: number;
  mcqs: GeneratedMcq[];
  quizToken: string;
  qualityCheck?: {
    sourceAdequate: boolean;
    notes: string;
  };
};

export type QuizResultItem = {
  questionIndex: number;
  question: string;
  options: [McqOption, McqOption, McqOption, McqOption];
  selectedAnswer: McqOptionId;
  correctAnswer: McqOptionId;
  isCorrect: boolean;
  explanation: string;
  conceptTag?: string;
  sourceSupport?: string;
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
