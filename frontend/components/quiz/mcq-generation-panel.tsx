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
  const lastAutoGenerateToken = useRef(0);

  const handleGenerate = async () => {
    if (!generationSource || generating) {
      return;
    }

    setGenerating(true);
    setResult(null);
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

  if (generating && !result) {
    return (
      <section className="rounded-[24px] border border-white/10 bg-[#111827] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-6">
        <div className="mb-5">
          <p className="text-sm font-semibold text-[#F9FAFB]">Quiz session</p>
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
              myCELIA is preparing your UPSC practice set. It will appear here as soon as it is ready.
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
