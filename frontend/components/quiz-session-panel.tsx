'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import type {
  McqGenerationResult,
  McqOptionId,
  QuizResultItem,
  SaveQuizResultsResult,
} from '@/lib/types/quiz';

type QuizSessionPanelProps = {
  generationResult: McqGenerationResult | null;
  sourceUploadId?: string;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
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
    };
  });

export function QuizSessionPanel({
  generationResult,
  sourceUploadId,
  onError,
  onSuccess,
}: QuizSessionPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, McqOptionId>>({});
  const [submitted, setSubmitted] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedResult, setSavedResult] = useState<SaveQuizResultsResult | null>(null);

  useEffect(() => {
    setCurrentIndex(0);
    setAnswers({});
    setSubmitted(false);
    setDurationSeconds(null);
    setSaving(false);
    setSavedResult(null);
    setStartedAt(generationResult ? Date.now() : null);
  }, [generationResult]);

  if (!generationResult) {
    return (
      <section className="rounded-[20px] border border-white/10 bg-[#111827] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-6">
        <p className="text-sm font-semibold text-[#F9FAFB]">Quiz session</p>
        <div className="mt-5 rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-[#4B5563]">
          Generate MCQs first to start the quiz session.
        </div>
      </section>
    );
  }

  const currentQuestion = generationResult.mcqs[currentIndex];
  const totalQuestions = generationResult.mcqs.length;
  const answeredCount = Object.keys(answers).length;
  const hasAnsweredCurrent = answers[currentIndex] !== undefined;
  const results = submitted ? buildResults(generationResult, answers) : [];
  const correctCount = results.filter((result) => result.isCorrect).length;
  const scorePercent = results.length > 0 ? Math.round((correctCount / results.length) * 10000) / 100 : 0;

  const handleAnswerSelect = (answerId: McqOptionId) => {
    if (submitted) {
      return;
    }

    setAnswers((current) => ({
      ...current,
      [currentIndex]: answerId,
    }));
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
    setDurationSeconds(startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : null);
  };

  const handleSaveResults = async () => {
    if (!submitted || saving || savedResult) {
      return;
    }

    const {
      data: { session },
    } = await getSupabaseBrowserClient().auth.getSession();

    const accessToken = session?.access_token;

    if (!accessToken) {
      onError('Sign in again before saving quiz results.');
      return;
    }

    setSaving(true);
    onError('');
    onSuccess('');

    try {
      const selectedAnswers = generationResult.mcqs.map((_, index) => {
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
          quizToken: generationResult.quizToken,
          selectedAnswers,
          durationSeconds,
        }),
      });

      const data = (await response.json()) as { error?: string; result?: SaveQuizResultsResult };

      if (!response.ok || !data.result) {
        onError(data.error ?? 'Quiz results could not be saved.');
        return;
      }

      setSavedResult(data.result);
      onSuccess('Quiz results saved to Supabase.');
    } catch {
      onError('Quiz results request failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[20px] border border-white/10 bg-[#111827] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#F9FAFB]">Quiz session</p>
          <p className="mt-1 text-sm leading-6 text-[#9CA3AF]">
            Attempt the generated MCQs first, then review explanations and save the result.
          </p>
        </div>

        <span className="rounded-full bg-[#C8A44A]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C8A44A]">
          {answeredCount}/{totalQuestions} answered
        </span>
      </div>

      {!submitted ? (
        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            {generationResult.mcqs.map((_, index) => (
              <button
                key={index}
                className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition ${
                  index === currentIndex
                    ? 'border-[#C8A44A] bg-[#C8A44A]/10 text-[#C8A44A]'
                    : answers[index]
                      ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                      : 'border-white/10 text-[#9CA3AF] hover:text-[#F9FAFB]'
                }`}
                onClick={() => setCurrentIndex(index)}
                type="button"
              >
                {index + 1}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-white/8 bg-[#0A0F1A] px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold leading-6 text-[#F9FAFB]">
                Q{currentIndex + 1}. {currentQuestion.question}
              </p>
              {currentQuestion.conceptTag ? (
                <span className="rounded-full border border-[#C8A44A]/20 bg-[#C8A44A]/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#E7D29B]">
                  {currentQuestion.conceptTag}
                </span>
              ) : null}
            </div>

            <div className="mt-4 space-y-2">
              {currentQuestion.options.map((option) => {
                const isSelected = answers[currentIndex] === option.id;

                return (
                  <button
                    key={option.id}
                    className={`w-full rounded-lg border px-3 py-3 text-left text-sm transition ${
                      isSelected
                        ? 'border-[#C8A44A] bg-[#C8A44A]/10 text-[#F9FAFB]'
                        : 'border-white/8 bg-white/[0.02] text-[#C9D1DE] hover:border-white/15 hover:bg-white/[0.04]'
                    }`}
                    onClick={() => handleAnswerSelect(option.id)}
                    type="button"
                  >
                    <span className="font-semibold">{option.id}.</span> {option.text}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              className="flex h-10 items-center justify-center rounded-lg border border-white/10 px-4 text-sm font-medium text-[#F9FAFB] transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
              type="button"
            >
              Previous
            </button>

            {currentIndex < totalQuestions - 1 ? (
              <button
                className="flex h-10 items-center justify-center rounded-lg bg-[#C8A44A] px-4 text-sm font-semibold text-[#0A0F1A] transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[#8B6914]"
                disabled={!hasAnsweredCurrent}
                onClick={() => setCurrentIndex((value) => Math.min(totalQuestions - 1, value + 1))}
                type="button"
              >
                Next question
              </button>
            ) : (
              <button
                className="flex h-10 items-center justify-center rounded-lg bg-[#C8A44A] px-4 text-sm font-semibold text-[#0A0F1A] transition hover:brightness-110"
                onClick={handleSubmitQuiz}
                type="button"
              >
                Submit quiz
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#F9FAFB]">Quiz complete</p>
                <p className="mt-1 text-sm text-emerald-200">
                  {correctCount} of {results.length} correct
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold tracking-[-0.04em] text-[#F9FAFB]">{scorePercent}%</p>
                <p className="text-xs uppercase tracking-[0.16em] text-emerald-200">
                  {durationSeconds ? `${durationSeconds}s session` : 'Scored'}
                </p>
              </div>
            </div>

            <button
              className="mt-4 flex h-10 items-center justify-center rounded-lg bg-[#C8A44A] px-4 text-sm font-semibold text-[#0A0F1A] transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[#8B6914]"
              disabled={saving || !!savedResult}
              onClick={() => {
                void handleSaveResults();
              }}
              type="button"
            >
              {savedResult ? 'Results saved' : saving ? 'Saving results...' : 'Save results'}
            </button>

            {savedResult ? (
              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-emerald-200">
                Session ID: {savedResult.sessionId}
              </p>
            ) : null}
          </div>

          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={`${result.question}-${index}`} className="rounded-xl border border-white/8 bg-[#0A0F1A] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold leading-6 text-[#F9FAFB]">
                    Q{index + 1}. {result.question}
                  </p>
                  {result.conceptTag ? (
                    <span className="rounded-full border border-[#C8A44A]/20 bg-[#C8A44A]/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#E7D29B]">
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
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
