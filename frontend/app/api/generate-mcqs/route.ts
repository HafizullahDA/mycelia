import { NextResponse } from 'next/server';
import { generateMcqs } from '@/lib/server/generate-mcqs';
import {
  createRequestLogContext,
  getRequestDurationMs,
  logRequestError,
  logRequestInfo,
  logRequestWarn,
} from '@/lib/server/observability';
import { applyRateLimit, getClientAddress } from '@/lib/server/rate-limit';
import type { McqGenerationResult } from '@/lib/types/quiz';

export const maxDuration = 300;

const toPublicGenerationError = (message: string): string => {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('resource_exhausted') ||
    normalized.includes('quota is temporarily exhausted') ||
    normalized.includes('"code": 429') ||
    normalized.includes('code: 429')
  ) {
    return 'Google AI quota is temporarily exhausted. Wait a few minutes and try again, or switch GEMINI_MCQ_MODEL to another available model.';
  }

  if (
    normalized.includes('mcq payload') ||
    normalized.includes('question ') ||
    normalized.includes('returned only') ||
    normalized.includes('too few valid mcqs') ||
    normalized.includes('qualitycheck') ||
    normalized.includes('valid mcq output') ||
    normalized.includes('valid quiz')
  ) {
    return 'myCELIA could not create enough reliable MCQs from this source yet. Try 5 MCQs or use a more focused section of the notes.';
  }

  return message;
};

const getGenerationLogMetadata = (
  result: McqGenerationResult,
): Record<string, string | number | boolean | undefined> => ({
  questionCount: result.questionCount,
  sourceCharacters: result.diagnostics?.sourceCharacters,
  contextCharacters: result.diagnostics?.contextCharacters,
  compressionChunkCount: result.diagnostics?.compressionChunkCount,
  extractionMs: result.diagnostics?.extractionMs,
  compressionMs: result.diagnostics?.compressionMs,
  mcqGenerationMs: result.diagnostics?.mcqGenerationMs,
  pipelineTotalMs: result.diagnostics?.totalMs,
  extractionMethod: result.diagnostics?.extractionMethod,
  extractionCacheStatus: result.diagnostics?.extractionCacheStatus,
  modelUsed: result.diagnostics?.modelUsed,
  fallbackCount: result.diagnostics?.fallbackCount,
  returnedPartialSet: result.diagnostics?.returnedPartialSet,
});

export async function POST(request: Request) {
  const context = createRequestLogContext('/api/generate-mcqs', request);
  const rateLimit = applyRateLimit({
    key: `generate-mcqs:${getClientAddress(request)}`,
    limit: 6,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    logRequestWarn(context, 'rate_limit_rejected', {
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });

    return NextResponse.json(
      {
        error: 'Too many quiz generation requests. Please wait a few minutes and try again.',
        requestId: context.requestId,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
          'X-Request-Id': context.requestId,
        },
      },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const extractedText = typeof body.extractedText === 'string' ? body.extractedText : '';
    const title = typeof body.title === 'string' ? body.title : undefined;
    const questionCount =
      typeof body.questionCount === 'number'
        ? body.questionCount
        : typeof body.questionCount === 'string'
          ? Number(body.questionCount)
          : undefined;
    const keyTopics = Array.isArray(body.keyTopics)
      ? body.keyTopics.filter((topic): topic is string => typeof topic === 'string')
      : [];
    const sourceUploadId = typeof body.sourceUploadId === 'string' ? body.sourceUploadId : undefined;
    const inputType = body.inputType;

    if (extractedText.trim()) {
      const result = await generateMcqs({
        title,
        extractedText,
        keyTopics,
        questionCount,
      });

      logRequestInfo(context, 'request_completed', {
        status: 200,
        durationMs: getRequestDurationMs(context),
        ...getGenerationLogMetadata(result),
      });

      return NextResponse.json(
        { result, requestId: context.requestId },
        {
          headers: {
            'X-Request-Id': context.requestId,
          },
        },
      );
    }

    if (inputType === 'text') {
      const rawText = typeof body.rawText === 'string' ? body.rawText : '';

      if (!rawText.trim()) {
        return NextResponse.json(
          { error: 'Paste some notes before generating MCQs.' },
          { status: 400 },
        );
      }

      const result = await generateMcqs({
        title,
        questionCount,
        source: {
          inputType: 'text',
          sourceUploadId,
          rawText,
        },
      });

      logRequestInfo(context, 'request_completed', {
        status: 200,
        durationMs: getRequestDurationMs(context),
        ...getGenerationLogMetadata(result),
      });

      return NextResponse.json(
        { result, requestId: context.requestId },
        {
          headers: {
            'X-Request-Id': context.requestId,
          },
        },
      );
    }

    if (inputType === 'storage') {
      const storagePath = typeof body.storagePath === 'string' ? body.storagePath : '';
      const mimeType = typeof body.mimeType === 'string' ? body.mimeType : '';

      if (!storagePath || !mimeType) {
        return NextResponse.json(
          { error: 'storagePath and mimeType are required for file generation.' },
          { status: 400 },
        );
      }

      const result = await generateMcqs({
        title,
        questionCount,
        source: {
          inputType: 'storage',
          sourceUploadId,
          storagePath,
          mimeType,
        },
      });

      logRequestInfo(context, 'request_completed', {
        status: 200,
        durationMs: getRequestDurationMs(context),
        ...getGenerationLogMetadata(result),
      });

      return NextResponse.json(
        { result, requestId: context.requestId },
        {
          headers: {
            'X-Request-Id': context.requestId,
          },
        },
      );
    }

    if (inputType === 'storage_batch') {
      const storageItems = Array.isArray(body.storageItems)
        ? body.storageItems
            .map((item) => {
              if (!item || typeof item !== 'object') {
                return null;
              }

              const record = item as Record<string, unknown>;
              const storagePath = typeof record.storagePath === 'string' ? record.storagePath : '';
              const mimeType = typeof record.mimeType === 'string' ? record.mimeType : '';
              const itemTitle = typeof record.title === 'string' ? record.title : 'Uploaded image';
              const itemSourceUploadId =
                typeof record.sourceUploadId === 'string' ? record.sourceUploadId : undefined;

              if (!storagePath || !mimeType) {
                return null;
              }

              return {
                sourceUploadId: itemSourceUploadId,
                storagePath,
                mimeType,
                title: itemTitle,
              };
            })
            .filter((item): item is NonNullable<typeof item> => Boolean(item))
        : [];

      if (storageItems.length === 0) {
        return NextResponse.json(
          { error: 'At least one image is required for batch generation.' },
          { status: 400 },
        );
      }

      if (storageItems.length > 10) {
        return NextResponse.json(
          { error: 'Select up to 10 images at once.' },
          { status: 400 },
        );
      }

      const result = await generateMcqs({
        title,
        questionCount,
        source: {
          inputType: 'storage_batch',
          sourceUploadId,
          storageItems,
        },
      });

      logRequestInfo(context, 'request_completed', {
        status: 200,
        durationMs: getRequestDurationMs(context),
        ...getGenerationLogMetadata(result),
      });

      return NextResponse.json(
        { result, requestId: context.requestId },
        {
          headers: {
            'X-Request-Id': context.requestId,
          },
        },
      );
    }

    logRequestWarn(context, 'request_rejected', {
      status: 400,
      durationMs: getRequestDurationMs(context),
      reason: 'missing_source',
    });

    return NextResponse.json(
      {
        error: 'A source file, pasted text, or extracted text is required before MCQs can be generated.',
        requestId: context.requestId,
      },
      {
        status: 400,
        headers: {
          'X-Request-Id': context.requestId,
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'MCQ generation failed.';
    const publicMessage = toPublicGenerationError(message);
    logRequestError(context, 'request_failed', error, {
      status: 500,
      durationMs: getRequestDurationMs(context),
    });
    return NextResponse.json(
      { error: publicMessage, requestId: context.requestId },
      {
        status: 500,
        headers: {
          'X-Request-Id': context.requestId,
        },
      },
    );
  }
}
