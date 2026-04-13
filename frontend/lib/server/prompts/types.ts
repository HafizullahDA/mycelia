export type ExtractionPromptInput = {
  title?: string;
  validationFeedback?: string;
};

export type McqPromptInput = {
  title?: string;
  questionCount: number;
  keyTopics?: string[];
  sourceText: string;
  validationFeedback?: string;
  prioritizeCorrectness?: boolean;
};
