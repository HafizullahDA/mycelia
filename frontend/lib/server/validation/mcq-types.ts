export type McqOptionId = 'A' | 'B' | 'C' | 'D';

export type PromptMcq = {
  question: string;
  options: [string, string, string, string];
  correctAnswer: McqOptionId;
  explanation: string;
  concepts: string[];
  sourceSupport: string;
};

export type PromptMcqPayload = {
  questions: PromptMcq[];
  qualityCheck: {
    sourceAdequate: boolean;
    notes: string;
  };
};

export type ExtractionPayload = {
  documentTitle: string;
  extractedText: string;
  keyTopics: string[];
};
