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

export const maxDuration = 300;

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
        questionCount: result.questionCount,
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
          rawText,
        },
      });

      logRequestInfo(context, 'request_completed', {
        status: 200,
        durationMs: getRequestDurationMs(context),
        questionCount: result.questionCount,
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
          storagePath,
          mimeType,
        },
      });

      logRequestInfo(context, 'request_completed', {
        status: 200,
        durationMs: getRequestDurationMs(context),
        questionCount: result.questionCount,
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
    logRequestError(context, 'request_failed', error, {
      status: 500,
      durationMs: getRequestDurationMs(context),
    });
    return NextResponse.json(
      { error: message, requestId: context.requestId },
      {
        status: 500,
        headers: {
          'X-Request-Id': context.requestId,
        },
      },
    );
  }
}
