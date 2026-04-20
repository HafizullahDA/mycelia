'use client';

import { useEffect, useRef, useState } from 'react';
import { BrandWordmark } from '@/components/brand/wordmark';
import { QuizSessionPanel } from '@/components/quiz/quiz-session-panel';
import type { McqGenerationResult } from '@/lib/types/quiz';

type GenerationSource =
  | {
      sourceUploadId?: string;
      title: string;
      inputType: 'text';
      rawText: string;
    }
  | {
      sourceUploadId?: string;
      title: string;
      inputType: 'storage';
      storagePath: string;
      mimeType: string;
    };

type McqGenerationPanelProps = {
  generationSource: GenerationSource | null;
  questionCount: number;
  autoGenerateToken?: number;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  onGenerationStart?: () => void;
  onGenerationComplete?: (result: McqGenerationResult) => void;
  onGenerationError?: () => void;
};

const generationProgressStages = [
  {
    label: 'Reading source',
    detail: 'Checking saved extraction and preparing the uploaded material.',
    thresholdSeconds: 0,
  },
  {
    label: 'Building revision context',
    detail: 'Compressing large notes into high-yield exam-ready facts.',
    thresholdSeconds: 12,
  },
  {
    label: 'Writing MCQs',
    detail: 'Drafting UPSC-style questions, options, answer keys, and explanations.',
    thresholdSeconds: 28,
  },
  {
    label: 'Quality check',
    detail: 'Checking structure, answerability, source support, and final quiz shape.',
    thresholdSeconds: 50,
  },
];

export function McqGenerationPanel({
  generationSource,
  questionCount,
  autoGenerateToken = 0,
  onError,
  onSuccess,
  onGenerationStart,
  onGenerationComplete,
  onGenerationError,
}: McqGenerationPanelProps) {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<McqGenerationResult | null>(null);
  const [progressStageIndex, setProgressStageIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const lastAutoGenerateToken = useRef(0);

  const handleGenerate = async () => {
    if (!generationSource || generating) {
      return;
    }

    setGenerating(true);
    setResult(null);
    setProgressStageIndex(0);
    setElapsedSeconds(0);
    onError('');
    onSuccess('');
    onGenerationStart?.();

    try {
      const response = await fetch('/api/generate-mcqs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: generationSource.title,
          sourceUploadId: generationSource.sourceUploadId,
          inputType: generationSource.inputType,
          ...(generationSource.inputType === 'text'
            ? {
                rawText: generationSource.rawText,
              }
            : {
                storagePath: generationSource.storagePath,
                mimeType: generationSource.mimeType,
              }),
          questionCount,
        }),
      });

      const data = (await response.json()) as { error?: string; result?: McqGenerationResult };

      if (!response.ok || !data.result) {
        onGenerationError?.();
        onError(data.error ?? 'MCQ generation failed.');
        return;
      }

      setResult(data.result);
      onGenerationComplete?.(data.result);
      onSuccess(`${data.result.questionCount} MCQs are ready.`);
    } catch {
      onGenerationError?.();
      onError('MCQ generation request failed. Try again.');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (!generationSource || autoGenerateToken === 0 || autoGenerateToken === lastAutoGenerateToken.current) {
      return;
    }

    lastAutoGenerateToken.current = autoGenerateToken;
    void handleGenerate();
  }, [autoGenerateToken, generationSource]);

  useEffect(() => {
    if (!generating || result) {
      return;
    }

    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      const nextElapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const nextStageIndex = generationProgressStages.reduce((activeIndex, stage, index) => {
        if (nextElapsedSeconds >= stage.thresholdSeconds) {
          return index;
        }

        return activeIndex;
      }, 0);

      setElapsedSeconds(nextElapsedSeconds);
      setProgressStageIndex(nextStageIndex);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [generating, result]);

  if (generating && !result) {
    const activeStage = generationProgressStages[progressStageIndex];

    return (
      <section className="rounded-[24px] border border-white/10 bg-[#111827] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-6">
        <div className="mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#F9FAFB]">Quiz session</p>
            <span className="rounded-full border border-[#C8A44A]/15 bg-[#C8A44A]/10 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.28em] text-[#E7C66D]">
              {elapsedSeconds}s elapsed
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-[#9CA3AF]">
            Your next UPSC practice set is being prepared.
          </p>
        </div>

        <div className="flex min-h-[320px] items-center justify-center rounded-[20px] border border-white/8 bg-[#0A0F1A] px-4 py-10 text-center">
          <div className="max-w-sm">
            <div className="mx-auto flex w-fit flex-col items-center">
              <div className="animate-spin [animation-duration:3s]">
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[#C8A44A]/20 bg-[#C8A44A]/[0.07] shadow-[0_0_36px_rgba(200,164,74,0.12)]">
                  <span className="absolute -rotate-45 h-8 w-px bg-[#C8A44A]/80" />
                  <span className="absolute rotate-45 h-8 w-px bg-[#C8A44A]/80" />
                  <span className="absolute rotate-45 h-px w-8 bg-[#C8A44A]/65" />
                  <span className="absolute -rotate-45 h-px w-8 bg-[#C8A44A]/65" />
                  <span className="h-2 w-2 rounded-full bg-[#C8A44A]" />
                </span>
              </div>
              <BrandWordmark className="mt-5 items-center" size="sm" />
            </div>

            <p className="mt-5 text-base font-semibold text-[#F9FAFB]">Generating MCQs...</p>
            <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">
              {activeStage.detail}
            </p>
            <div className="mt-6 space-y-3 text-left">
              {generationProgressStages.map((stage, index) => {
                const isComplete = index < progressStageIndex;
                const isActive = index === progressStageIndex;

                return (
                  <div
                    className={`flex gap-3 rounded-2xl border px-4 py-3 transition ${
                      isActive
                        ? 'border-[#C8A44A]/35 bg-[#C8A44A]/10 text-[#F9FAFB]'
                        : isComplete
                          ? 'border-[#1FA970]/25 bg-[#1FA970]/10 text-[#B8F5D3]'
                          : 'border-white/8 bg-white/[0.02] text-[#6B7280]'
                    }`}
                    key={stage.label}
                  >
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        isActive
                          ? 'animate-pulse bg-[#C8A44A]'
                          : isComplete
                            ? 'bg-[#1FA970]'
                            : 'bg-[#374151]'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-semibold">{stage.label}</p>
                      {isActive ? (
                        <p className="mt-1 text-xs leading-5 text-[#B8C2D6]">{stage.detail}</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-5 text-xs leading-5 text-[#6B7280]">
              Large PDFs take longer on the first run. Once extracted, myCELIA reuses the saved text
              for faster follow-up quizzes.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <QuizSessionPanel
      generationResult={result}
      onError={onError}
      onSuccess={onSuccess}
      sourceUploadId={generationSource?.sourceUploadId}
    />
  );
}
