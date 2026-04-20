'use client';

import { useEffect, useState } from 'react';
import {
  getSupabaseBrowserClient,
  getSupabaseBrowserEnvErrorMessage,
} from '@/lib/supabase/client';
import type {
  McqGenerationResult,
  McqOptionId,
  QuestionQualityLabel,
  QuizResultItem,
  SaveQuizResultsResult,
  SavedQuizSessionDetail,
} from '@/lib/types/quiz';

type LocalQuizSaveSnapshot = {
  id: string;
  title: string;
  sourceUploadId?: string;
  savedAt: string;
  durationSeconds: number | null;
  questionCount: number;
  correctCount: number;
  scorePercent: number;
  results: QuizResultItem[];
};

type SaveState =
  | {
      mode: 'cloud';
      sessionId: string;
      questionCount: number;
      correctCount: number;
      scorePercent: number;
    }
  | {
      mode: 'local';
      sessionId: string;
      questionCount: number;
      correctCount: number;
      scorePercent: number;
    };

const LOCAL_QUIZ_SESSION_STORAGE_KEY = 'mycelia.localQuizSessions';

const isQuizPersistenceSetupIssue = (message: string): boolean => {
  const normalized = message.toLowerCase();

  return (
    normalized.includes('quiz persistence is not set up') ||
    normalized.includes('quiz_sessions') ||
    normalized.includes('question_results') ||
    normalized.includes('schema cache') ||
    normalized.includes('could not find the table')
  );
};

const persistQuizSessionLocally = (snapshot: LocalQuizSaveSnapshot): SaveState => {
  if (typeof window === 'undefined') {
    throw new Error('Local quiz persistence is not available in this environment.');
  }

  const raw = window.localStorage.getItem(LOCAL_QUIZ_SESSION_STORAGE_KEY);
  const sessions = raw ? ((JSON.parse(raw) as LocalQuizSaveSnapshot[]) ?? []) : [];
  const nextSessions = [snapshot, ...sessions].slice(0, 12);

  window.localStorage.setItem(LOCAL_QUIZ_SESSION_STORAGE_KEY, JSON.stringify(nextSessions));

  return {
    mode: 'local',
    sessionId: snapshot.id,
    questionCount: snapshot.questionCount,
    correctCount: snapshot.correctCount,
    scorePercent: snapshot.scorePercent,
  };
};

type QuizSessionPanelProps = {
  generationResult: McqGenerationResult | null;
  reviewSession?: SavedQuizSessionDetail | null;
  sourceUploadId?: string;
  onError: (message: string) => void;
  onMoreQuestions?: () => void;
  onResultsSaved?: () => void;
  onSuccess: (message: string) => void;
};

const QUALITY_LABELS: Array<{
  label: QuestionQualityLabel;
  text: string;
}> = [
  { label: 'good', text: 'Good' },
  { label: 'too_easy', text: 'Too easy' },
  { label: 'malformed', text: 'Malformed' },
  { label: 'off_style', text: 'Off-style' },
  { label: 'unsupported', text: 'Unsupported' },
];

const MAX_USER_FEEDBACK_WORDS = 100;

const countWords = (value: string): number => value.trim().split(/\s+/).filter(Boolean).length;

const FeedbackCheckIcon = () => (
  <svg
    aria-hidden="true"
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3.5 8.5 6.5 11.5 12.5 5.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

const FeedbackCrossIcon = () => (
  <svg
    aria-hidden="true"
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="m5 5 6 6M11 5l-6 6"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
    />
  </svg>
);

const QUESTION_INSTRUCTION_PATTERN =
  /\s(?=(Which of the following|Which one of the following|Which of the statements given above|Which of the above statements|How many of the above|How many of the following|Select the correct answer using the code given below|Arrange the following))/gi;

const NUMBERED_ITEM_PATTERN = /^(?:\d+|[IVXLCDM]+)\.\s/i;

const formatQuestionLines = (question: string): string[] => {
  const collapsed = question.replace(/\s+/g, ' ').trim();

  const structured = collapsed
    .replace(/:\s(?=(?:\d+|[IVXLCDM]+)\.\s)/g, ':\n')
    .replace(/([^\n])\s(?=(?:\d+|[IVXLCDM]+)\.\s)/g, '$1\n')
    .replace(QUESTION_INSTRUCTION_PATTERN, '\n');

  return structured
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
};

const QuestionStem = ({
  prefix,
  question,
}: {
  prefix: string;
  question: string;
}) => {
  const lines = formatQuestionLines(question);

  if (lines.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold leading-6 text-[#F9FAFB] sm:text-[15px]">
        {prefix} {lines[0]}
      </p>

      {lines.slice(1).map((line, index) => {
        const isNumberedItem = NUMBERED_ITEM_PATTERN.test(line);
        const isInstructionLine =
          !isNumberedItem &&
          /^(which|how many|select the correct answer|arrange the following)/i.test(line);

        return (
          <p
            key={`${prefix}-${index}-${line}`}
            className={`text-sm leading-6 sm:text-[15px] ${
              isNumberedItem
                ? 'pl-4 text-[#F3F4F6] sm:pl-5'
                : isInstructionLine
                  ? 'pt-1 font-medium text-[#E5E7EB]'
                  : 'text-[#F9FAFB]'
            }`}
          >
            {line}
          </p>
        );
      })}
    </div>
  );
};

const buildResults = (
  generationResult: McqGenerationResult,
  answers: Record<number, McqOptionId>,
): QuizResultItem[] =>
  generationResult.mcqs.map((mcq, index) => {
    const selectedAnswer = answers[index];

    if (!selectedAnswer) {
      throw new Error(`Question ${index + 1} is missing an answer.`);
    }

    return {
      questionIndex: index,
      question: mcq.question,
      options: mcq.options,
      selectedAnswer,
      correctAnswer: mcq.correctAnswer,
      isCorrect: selectedAnswer === mcq.correctAnswer,
      explanation: mcq.explanation,
      conceptTag: mcq.conceptTag,
      sourceSupport: mcq.sourceSupport,
    };
  });

const formatSessionDate = (value?: string): string => {
  if (!value) {
    return 'Saved session';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
};

export function QuizSessionPanel({
  generationResult,
  reviewSession,
  sourceUploadId,
  onError,
  onMoreQuestions,
  onResultsSaved,
  onSuccess,
}: QuizSessionPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, McqOptionId>>({});
  const [submitted, setSubmitted] = useState(false);
  const [reviewExpanded, setReviewExpanded] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(true);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedResult, setSavedResult] = useState<SaveState | null>(null);
  const [qualityOverrides, setQualityOverrides] = useState<Record<string, QuestionQualityLabel>>({});
  const [markingQuestionId, setMarkingQuestionId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentIndex(0);
    setAnswers({});
    setSubmitted(false);
    setReviewExpanded(false);
    setFeedbackOpen(true);
    setFeedbackText('');
    setFeedbackSaving(false);
    setFeedbackSaved(false);
    setDurationSeconds(null);
    setSaving(false);
    setSavedResult(null);
    setStartedAt(generationResult ? Date.now() : null);
    setQualityOverrides({});
  }, [generationResult, reviewSession?.id]);

  if (!generationResult && !reviewSession) {
    return (
      <section className="rounded-[24px] border border-white/10 bg-[#111827] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-6">
        <p className="text-sm font-semibold text-[#F9FAFB]">Quiz session</p>
        <p className="mt-1 text-sm leading-6 text-[#9CA3AF]">
          Your generated UPSC questions will appear here once a new set is ready.
        </p>
        <div className="mt-5 flex min-h-[260px] items-center justify-center rounded-[20px] border border-dashed border-white/10 bg-[#0A0F1A] px-5 py-8 text-center sm:min-h-[320px] sm:px-6">
          <div className="max-w-sm">
            <p className="text-base font-semibold text-[#F9FAFB]">No quiz generated yet</p>
            <p className="mt-2 text-sm leading-6 text-[#6B7280]">
              Upload or paste notes, choose your question count, and the generated set will take over this space.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const handleMarkQuestionQuality = async (
    questionResultId: string | undefined,
    label: QuestionQualityLabel,
  ) => {
    if (!questionResultId || markingQuestionId) {
      return;
    }

    let accessToken = '';

    try {
      const response = await getSupabaseBrowserClient().auth.getSession();
      accessToken = response.data.session?.access_token ?? '';
    } catch {
      onError(getSupabaseBrowserEnvErrorMessage());
      return;
    }

    if (!accessToken) {
      onError('Sign in again before marking question quality.');
      return;
    }

    setMarkingQuestionId(questionResultId);
    onError('');

    try {
      const response = await fetch('/api/quiz/question-quality', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          questionResultId,
          label,
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        onError(data.error ?? 'Question quality could not be saved.');
        return;
      }

      setQualityOverrides((current) => ({
        ...current,
        [questionResultId]: label,
      }));
      onSuccess('Question quality label saved.');
    } catch {
      onError('Question quality request failed. Try again.');
    } finally {
      setMarkingQuestionId(null);
    }
  };

  const renderReviewResults = (reviewResults: QuizResultItem[]) => (
    <div className="space-y-4">
      {reviewResults.map((result, index) => {
        const qualityLabel = result.id
          ? qualityOverrides[result.id] ?? result.qualityLabel
          : result.qualityLabel;

        return (
          <div key={`${result.question}-${index}`} className="rounded-xl border border-white/8 bg-[#0A0F1A] px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <QuestionStem prefix={`Q${index + 1}.`} question={result.question} />
              {result.conceptTag ? (
                <span className="w-fit rounded-full border border-[#C8A44A]/20 bg-[#C8A44A]/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#E7D29B]">
                  {result.conceptTag}
                </span>
              ) : null}
            </div>

            <div className="mt-3 space-y-2">
              {result.options.map((option) => {
                const isCorrect = option.id === result.correctAnswer;
                const isSelected = option.id === result.selectedAnswer;

                return (
                  <div
                    key={option.id}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      isCorrect
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                        : isSelected
                          ? 'border-red-500/25 bg-red-500/10 text-red-200'
                          : 'border-white/8 bg-white/[0.02] text-[#C9D1DE]'
                    }`}
                  >
                    <span className="font-semibold">{option.id}.</span> {option.text}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em] text-[#6B7280]">
              <span>Your answer: {result.selectedAnswer}</span>
              <span>Correct answer: {result.correctAnswer}</span>
              <span>{result.isCorrect ? 'Correct' : 'Incorrect'}</span>
            </div>

            <p className="mt-3 text-sm leading-6 text-[#9CA3AF]">{result.explanation}</p>

            {result.id ? (
              <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                  Internal quality label
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUALITY_LABELS.map((quality) => (
                    <button
                      key={quality.label}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        qualityLabel === quality.label
                          ? 'border-[#C8A44A] bg-[#C8A44A]/15 text-[#E7C66D]'
                          : 'border-white/10 bg-[#0A0F1A] text-[#9CA3AF] hover:border-white/20 hover:text-[#F9FAFB]'
                      }`}
                      disabled={markingQuestionId === result.id}
                      onClick={() => {
                        void handleMarkQuestionQuality(result.id, quality.label);
                      }}
                      type="button"
                    >
                      {quality.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );

  if (reviewSession) {
    const wrongCount = Math.max(0, reviewSession.questionCount - reviewSession.correctCount);

    return (
      <section className="rounded-[24px] border border-white/10 bg-[#111827] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#F9FAFB]">Past quiz session</p>
            <p className="mt-1 text-sm leading-6 text-[#9CA3AF]">
              {reviewSession.title} · {formatSessionDate(reviewSession.createdAt)}
            </p>
          </div>

          <span className="w-fit rounded-full bg-[#C8A44A]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C8A44A]">
            Saved result
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/8 bg-[#0A0F1A] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">Score</p>
            <p className="mt-3 text-3xl font-semibold text-[#F9FAFB]">
              {reviewSession.correctCount}/{reviewSession.questionCount}
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-[#0A0F1A] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">Accuracy</p>
            <p className="mt-3 text-3xl font-semibold text-[#F9FAFB]">{reviewSession.scorePercent}%</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-[#0A0F1A] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">Right / Wrong</p>
            <p className="mt-3 text-3xl font-semibold text-[#F9FAFB]">
              {reviewSession.correctCount} / {wrongCount}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            className="flex h-11 items-center justify-center rounded-lg border border-white/10 px-4 text-sm font-medium text-[#F9FAFB] transition hover:bg-white/5"
            onClick={() => setReviewExpanded((value) => !value)}
            type="button"
          >
            {reviewExpanded ? 'Hide review' : 'Review quiz'}
          </button>
          <button
            className="flex h-11 items-center justify-center rounded-lg bg-[#C8A44A] px-4 text-sm font-semibold text-[#0A0F1A] transition hover:brightness-110"
            onClick={onMoreQuestions}
            type="button"
          >
            More questions
          </button>
        </div>

        {reviewExpanded ? <div className="mt-5">{renderReviewResults(reviewSession.results)}</div> : null}
      </section>
    );
  }

  const activeGenerationResult = generationResult;

  if (!activeGenerationResult) {
    return null;
  }

  const currentQuestion = activeGenerationResult.mcqs[currentIndex];
  const totalQuestions = activeGenerationResult.mcqs.length;
  const answeredCount = Object.keys(answers).length;
  const currentAnswer = answers[currentIndex];
  const hasAnsweredCurrent = currentAnswer !== undefined;
  const currentAnswerIsCorrect =
    hasAnsweredCurrent && currentAnswer === currentQuestion.correctAnswer;
  const results = submitted ? buildResults(activeGenerationResult, answers) : [];
  const correctCount = results.filter((result) => result.isCorrect).length;
  const scorePercent = results.length > 0 ? Math.round((correctCount / results.length) * 10000) / 100 : 0;
  const wrongCount = Math.max(0, results.length - correctCount);
  const feedbackWordCount = countWords(feedbackText);

  const handleAnswerSelect = (answerId: McqOptionId) => {
    if (submitted || hasAnsweredCurrent) {
      return;
    }

    setAnswers((current) => ({
      ...current,
      [currentIndex]: answerId,
    }));
  };

  const handleFeedbackChange = (value: string) => {
    const words = value.trim().split(/\s+/).filter(Boolean);

    if (words.length <= MAX_USER_FEEDBACK_WORDS) {
      setFeedbackText(value);
      return;
    }

    setFeedbackText(words.slice(0, MAX_USER_FEEDBACK_WORDS).join(' '));
  };

  const handleFeedbackSubmit = async () => {
    if (feedbackSaving || feedbackSaved || !feedbackText.trim()) {
      return;
    }

    let accessToken = '';

    try {
      const response = await getSupabaseBrowserClient().auth.getSession();
      accessToken = response.data.session?.access_token ?? '';
    } catch {
      onError(getSupabaseBrowserEnvErrorMessage());
      return;
    }

    if (!accessToken) {
      onError('Sign in again before sending quiz feedback.');
      return;
    }

    setFeedbackSaving(true);
    onError('');

    try {
      const response = await fetch('/api/quiz/generation-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          sourceUploadId,
          quizTitle: activeGenerationResult.title,
          questionCount: activeGenerationResult.questionCount,
          feedbackText: feedbackText.trim(),
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        onError(data.error ?? 'Quiz feedback could not be saved.');
        return;
      }

      setFeedbackSaved(true);
      setFeedbackOpen(false);
      onSuccess('Thanks. Your feedback was saved.');
    } catch {
      onError('Quiz feedback request failed. Try again.');
    } finally {
      setFeedbackSaving(false);
    }
  };

  const handleSubmitQuiz = () => {
    if (submitted) {
      return;
    }

    if (answeredCount !== totalQuestions) {
      onError('Answer every question before submitting the quiz.');
      return;
    }

    onError('');
    onSuccess('');
    setSubmitted(true);
    setReviewExpanded(false);
    setDurationSeconds(startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : null);
  };

  const handleSaveResults = async () => {
    if (!submitted || saving || savedResult) {
      return;
    }

    let session: { access_token?: string } | null = null;

    try {
      const response = await getSupabaseBrowserClient().auth.getSession();
      session = response.data.session;
    } catch (clientError) {
      onError(
        clientError instanceof Error ? clientError.message : getSupabaseBrowserEnvErrorMessage(),
      );
      return;
    }

    const accessToken = session?.access_token;

    if (!accessToken) {
      onError('Sign in again before saving quiz results.');
      return;
    }

    setSaving(true);
    onError('');
    onSuccess('');

    try {
      const selectedAnswers = activeGenerationResult.mcqs.map((_, index) => {
        const selectedAnswer = answers[index];

        if (!selectedAnswer) {
          throw new Error(`Question ${index + 1} is missing an answer.`);
        }

        return selectedAnswer;
      });

      const response = await fetch('/api/quiz/file-back', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          sourceUploadId,
          quizToken: activeGenerationResult.quizToken,
          selectedAnswers,
          durationSeconds,
        }),
      });

      const data = (await response.json()) as { error?: string; result?: SaveQuizResultsResult };

      if (!response.ok || !data.result) {
        const errorMessage = data.error ?? 'Quiz results could not be saved.';

        if (submitted && isQuizPersistenceSetupIssue(errorMessage)) {
          const localSave = persistQuizSessionLocally({
            id: `local-${Date.now()}`,
            title: activeGenerationResult.title,
            sourceUploadId,
            savedAt: new Date().toISOString(),
            durationSeconds,
            questionCount: results.length,
            correctCount,
            scorePercent,
            results,
          });

          setSavedResult(localSave);
          onResultsSaved?.();
          onSuccess(
            'Quiz saved locally in this browser. Run supabase/sql/002_phase1_quiz_results.sql to enable cloud save.',
          );
          return;
        }

        onError(errorMessage);
        return;
      }

      setSavedResult({
        mode: 'cloud',
        ...data.result,
      });
      onResultsSaved?.();
      onSuccess('Quiz results saved to Supabase.');
    } catch {
      onError('Quiz results request failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[24px] border border-white/10 bg-[#111827] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#F9FAFB]">Quiz session</p>
          <p className="mt-1 text-sm leading-6 text-[#9CA3AF]">
            Select an answer to reveal feedback instantly, then move through the set and save the result at the end.
          </p>
        </div>

        <span className="w-fit rounded-full bg-[#C8A44A]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C8A44A]">
          {answeredCount}/{totalQuestions} answered
        </span>
      </div>

      {!submitted ? (
        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            {activeGenerationResult.mcqs.map((mcq, index) => (
              <button
                key={index}
                className={`flex h-10 min-w-[2.5rem] items-center justify-center rounded-full border px-2 text-sm font-semibold transition sm:h-9 sm:w-9 sm:min-w-0 sm:px-0 ${
                  index === currentIndex
                    ? 'border-[#C8A44A] bg-[#C8A44A]/10 text-[#C8A44A]'
                    : answers[index]
                      ? answers[index] === mcq.correctAnswer
                        ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                        : 'border-red-500/35 bg-red-500/10 text-red-300'
                      : 'border-white/10 text-[#9CA3AF] hover:text-[#F9FAFB]'
                }`}
                onClick={() => setCurrentIndex(index)}
                type="button"
              >
                {index + 1}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-white/8 bg-[#0A0F1A] px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <QuestionStem prefix={`Q${currentIndex + 1}.`} question={currentQuestion.question} />
              {currentQuestion.conceptTag ? (
                <span className="w-fit rounded-full border border-[#C8A44A]/20 bg-[#C8A44A]/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#E7D29B]">
                  {currentQuestion.conceptTag}
                </span>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              {currentQuestion.options.map((option) => {
                const isSelected = currentAnswer === option.id;
                const isCorrectOption = option.id === currentQuestion.correctAnswer;
                const isWrongSelection =
                  hasAnsweredCurrent && isSelected && !currentAnswerIsCorrect;
                const shouldShowCorrect = hasAnsweredCurrent && isCorrectOption;
                const optionClassName = hasAnsweredCurrent
                  ? shouldShowCorrect
                    ? 'border-emerald-500/55 bg-emerald-500/10 text-emerald-100 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]'
                    : isWrongSelection
                      ? 'border-red-500/55 bg-red-500/10 text-red-100 shadow-[0_0_0_1px_rgba(239,68,68,0.08)]'
                      : 'border-white/8 bg-white/[0.02] text-[#7C8696]'
                  : isSelected
                    ? 'border-[#C8A44A] bg-[#C8A44A]/10 text-[#F9FAFB]'
                    : 'border-white/8 bg-white/[0.02] text-[#C9D1DE] hover:border-white/15 hover:bg-white/[0.04]';
                const feedbackToneClass = shouldShowCorrect ? 'text-emerald-300' : 'text-red-300';
                const feedbackLabel = shouldShowCorrect ? 'Right answer' : 'Not quite';
                const feedbackText = currentQuestion.explanation;

                return (
                  <button
                    key={option.id}
                    className={`w-full rounded-[18px] border px-3 py-3 text-left text-sm transition sm:px-4 sm:py-3.5 ${
                      optionClassName
                    }`}
                    onClick={() => handleAnswerSelect(option.id)}
                    type="button"
                  >
                    <div className="flex items-start gap-3">
                      <span className="pt-0.5 font-semibold">{option.id}.</span>
                      <div className="min-w-0 flex-1">
                        <p className="leading-6 sm:text-[15px]">{option.text}</p>

                        {hasAnsweredCurrent && (shouldShowCorrect || isWrongSelection) ? (
                          <div className={`mt-3 border-t border-current/20 pt-3 ${feedbackToneClass}`}>
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              {shouldShowCorrect ? <FeedbackCheckIcon /> : <FeedbackCrossIcon />}
                              <span>{feedbackLabel}</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 opacity-95">{feedbackText}</p>
                            {currentQuestion.sourceSupport ? (
                              <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">
                                {currentQuestion.sourceSupport}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              className="flex h-11 w-full items-center justify-center rounded-lg border border-white/10 px-4 text-sm font-medium text-[#F9FAFB] transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-auto"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
              type="button"
            >
              Previous
            </button>

            {currentIndex < totalQuestions - 1 ? (
              <button
                className="flex h-11 w-full items-center justify-center rounded-lg bg-[#C8A44A] px-4 text-sm font-semibold text-[#0A0F1A] transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[#8B6914] sm:h-10 sm:w-auto"
                disabled={!hasAnsweredCurrent}
                onClick={() => setCurrentIndex((value) => Math.min(totalQuestions - 1, value + 1))}
                type="button"
              >
                Next question
              </button>
            ) : (
              <button
                className="flex h-11 w-full items-center justify-center rounded-lg bg-[#C8A44A] px-4 text-sm font-semibold text-[#0A0F1A] transition hover:brightness-110 sm:h-10 sm:w-auto"
                onClick={handleSubmitQuiz}
                type="button"
              >
                Submit quiz
              </button>
            )}
          </div>

          {feedbackOpen && !feedbackSaved ? (
            <div className="rounded-2xl border border-[#C8A44A]/20 bg-[#C8A44A]/[0.07] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#F9FAFB]">Improve this quiz</p>
                  <p className="mt-1 text-sm leading-6 text-[#B8C2D6]">
                    Optional: tell us what you would like changed, added, or improved in this generated set.
                  </p>
                </div>
                <button
                  className="w-fit text-xs font-semibold uppercase tracking-[0.16em] text-[#9CA3AF] transition hover:text-[#F9FAFB]"
                  onClick={() => setFeedbackOpen(false)}
                  type="button"
                >
                  Skip
                </button>
              </div>

              <textarea
                className="mt-3 min-h-[96px] w-full rounded-xl border border-white/10 bg-[#0A0F1A] px-3.5 py-3 text-sm leading-6 text-[#F9FAFB] outline-none transition placeholder:text-[#4B5563] focus:border-[#C8A44A]/50 focus:shadow-[0_0_0_3px_rgba(200,164,74,0.08)]"
                onChange={(event) => handleFeedbackChange(event.target.value)}
                placeholder="Example: Make polity questions more statement-based, reduce easy recall, add more elimination traps..."
                value={feedbackText}
              />

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-[#9CA3AF]">{feedbackWordCount}/{MAX_USER_FEEDBACK_WORDS} words</p>
                <button
                  className="flex h-10 items-center justify-center rounded-lg bg-[#C8A44A] px-4 text-sm font-semibold text-[#0A0F1A] transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[#8B6914]"
                  disabled={feedbackSaving || !feedbackText.trim()}
                  onClick={() => {
                    void handleFeedbackSubmit();
                  }}
                  type="button"
                >
                  {feedbackSaving ? 'Sending...' : 'Send feedback'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-[#F9FAFB]">Quiz complete</p>
              <p className="mt-1 text-sm text-emerald-200">
                You did it. Save the result, review mistakes, or generate another set from the same source.
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-[#0A0F1A]/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">Score</p>
                <p className="mt-3 text-3xl font-semibold text-[#F9FAFB]">
                  {correctCount}/{results.length}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-[#0A0F1A]/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">Accuracy</p>
                <p className="mt-3 text-3xl font-semibold text-[#F9FAFB]">{scorePercent}%</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-[#0A0F1A]/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">Right / Wrong</p>
                <p className="mt-3 text-3xl font-semibold text-[#F9FAFB]">
                  {correctCount} / {wrongCount}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-emerald-200">
                  {durationSeconds ? `${durationSeconds}s session` : 'Scored'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                className="flex h-10 items-center justify-center rounded-lg bg-[#C8A44A] px-4 text-sm font-semibold text-[#0A0F1A] transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[#8B6914]"
                disabled={saving || !!savedResult}
                onClick={() => {
                  void handleSaveResults();
                }}
                type="button"
              >
                {savedResult
                  ? savedResult.mode === 'cloud'
                    ? 'Results saved'
                    : 'Saved locally'
                  : saving
                    ? 'Saving results...'
                    : 'Save results'}
              </button>
              <button
                className="flex h-10 items-center justify-center rounded-lg border border-white/10 px-4 text-sm font-medium text-[#F9FAFB] transition hover:bg-white/5"
                onClick={() => setReviewExpanded((value) => !value)}
                type="button"
              >
                {reviewExpanded ? 'Hide review' : 'Review quiz'}
              </button>
              <button
                className="flex h-10 items-center justify-center rounded-lg border border-[#C8A44A]/30 px-4 text-sm font-semibold text-[#E7C66D] transition hover:bg-[#C8A44A]/10"
                onClick={onMoreQuestions}
                type="button"
              >
                More questions
              </button>
            </div>

            {savedResult ? (
              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-emerald-200">
                {savedResult.mode === 'cloud'
                  ? `Session ID: ${savedResult.sessionId}`
                  : `Local session: ${savedResult.sessionId}`}
              </p>
            ) : null}
          </div>

          {reviewExpanded ? <div>{renderReviewResults(results)}</div> : null}
        </div>
      )}
    </section>
  );
}
