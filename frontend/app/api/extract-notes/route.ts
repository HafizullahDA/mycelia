import { NextResponse } from 'next/server';
import { extractNotes } from '@/lib/server/extract-notes';
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
  const context = createRequestLogContext('/api/extract-notes', request);
  const rateLimit = applyRateLimit({
    key: `extract-notes:${getClientAddress(request)}`,
    limit: 8,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    logRequestWarn(context, 'rate_limit_rejected', {
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });

    return NextResponse.json(
      {
        error: 'Too many extraction requests. Please wait a few minutes and try again.',
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
    const inputType = body.inputType;

    if (inputType === 'text') {
      const rawText = typeof body.rawText === 'string' ? body.rawText : '';
      const title = typeof body.title === 'string' ? body.title : undefined;

      if (!rawText.trim()) {
        return NextResponse.json({ error: 'Paste some notes before extracting.' }, { status: 400 });
      }

      const result = await extractNotes({
        inputType: 'text',
        rawText,
        title,
      });

      logRequestInfo(context, 'request_completed', {
        status: 200,
        durationMs: getRequestDurationMs(context),
        characterCount: result.characterCount,
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
      const title = typeof body.title === 'string' ? body.title : undefined;

      if (!storagePath || !mimeType) {
        return NextResponse.json(
          { error: 'storagePath and mimeType are required for file extraction.' },
          { status: 400 },
        );
      }

      const result = await extractNotes({
        inputType: 'storage',
        storagePath,
        mimeType,
        title,
      });

      logRequestInfo(context, 'request_completed', {
        status: 200,
        durationMs: getRequestDurationMs(context),
        characterCount: result.characterCount,
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
      reason: 'unsupported_request',
    });

    return NextResponse.json(
      { error: 'Unsupported extraction request.', requestId: context.requestId },
      {
        status: 400,
        headers: {
          'X-Request-Id': context.requestId,
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Extraction failed.';
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
