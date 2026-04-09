'use client';

import { useState } from 'react';
import { QuizSessionPanel } from '@/components/quiz-session-panel';
import type { McqGenerationResult } from '@/lib/types/quiz';

type ExtractionResult = {
  sourceUploadId?: string;
  title: string;
  extractedText: string;
  keyTopics: string[];
  method: 'normalized_text' | 'gemini_flash';
  characterCount: number;
};

type McqGenerationPanelProps = {
  extractionResult: ExtractionResult | null;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

const QUESTION_COUNT_OPTIONS = [5, 7, 10] as const;

export function McqGenerationPanel({
  extractionResult,
  onError,
  onSuccess,
}: McqGenerationPanelProps) {
  const [questionCount, setQuestionCount] = useState<(typeof QUESTION_COUNT_OPTIONS)[number]>(5);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<McqGenerationResult | null>(null);

  const handleGenerate = async () => {
    if (!extractionResult || generating) {
      return;
    }

    setGenerating(true);
    setResult(null);
    onError('');
    onSuccess('');

    try {
      const response = await fetch('/api/generate-mcqs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: extractionResult.title,
          extractedText: extractionResult.extractedText,
          keyTopics: extractionResult.keyTopics,
          questionCount,
        }),
      });

      const data = (await response.json()) as { error?: string; result?: McqGenerationResult };

      if (!response.ok || !data.result) {
        onError(data.error ?? 'MCQ generation failed.');
        return;
      }

      setResult(data.result);
      onSuccess(`${data.result.questionCount} UPSC-style MCQs generated.`);
    } catch {
      onError('MCQ generation request failed. Try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <section className="rounded-[20px] border border-white/10 bg-[#111827] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#F9FAFB]">MCQ generation</p>
            <p className="mt-1 text-sm leading-6 text-[#9CA3AF]">
              Once extraction looks correct, generate a UPSC-style set through Gemini 3.1 Pro.
            </p>
          </div>
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">
            Section C
          </span>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-[13px] font-medium tracking-[0.025em] text-[#9CA3AF]">Question count</p>
            <div className="mt-3 flex gap-2">
              {QUESTION_COUNT_OPTIONS.map((count) => (
                <button
                  key={count}
                  className={`flex h-10 flex-1 items-center justify-center rounded-lg border text-sm font-medium transition ${
                    questionCount === count
                      ? 'border-[#C8A44A] bg-[#C8A44A]/10 text-[#C8A44A]'
                      : 'border-white/10 bg-transparent text-[#9CA3AF] hover:text-[#F9FAFB]'
                  }`}
                  onClick={() => setQuestionCount(count)}
                  type="button"
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <button
            className="flex h-11 w-full items-center justify-center rounded-lg bg-[#C8A44A] px-4 text-[15px] font-semibold text-[#0A0F1A] transition duration-150 ease-in hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[#8B6914]"
            disabled={!extractionResult || generating}
            onClick={() => {
              void handleGenerate();
            }}
            type="button"
          >
            {generating ? 'Generating MCQs...' : 'Generate UPSC MCQs'}
          </button>
        </div>
      </section>

      <QuizSessionPanel
        generationResult={result}
        onError={onError}
        onSuccess={onSuccess}
        sourceUploadId={extractionResult?.sourceUploadId}
      />
    </>
  );
}
