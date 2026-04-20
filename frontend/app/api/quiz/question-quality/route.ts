import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin';
import {
  createRequestLogContext,
  getRequestDurationMs,
  logRequestError,
  logRequestInfo,
  logRequestWarn,
} from '@/lib/server/observability';
import { applyRateLimit, getClientAddress } from '@/lib/server/rate-limit';
import type { MarkQuestionQualityInput, QuestionQualityLabel } from '@/lib/types/quiz';

const isQualityLabel = (value: unknown): value is QuestionQualityLabel =>
  value === 'good' ||
  value === 'too_easy' ||
  value === 'malformed' ||
  value === 'off_style' ||
  value === 'unsupported';

const parseInput = (body: Record<string, unknown>): MarkQuestionQualityInput => {
  const questionResultId =
    typeof body.questionResultId === 'string' ? body.questionResultId.trim() : '';
  const label = body.label;

  if (!questionResultId) {
    throw new Error('Question result ID is required.');
  }

  if (!isQualityLabel(label)) {
    throw new Error('Choose a valid quality label.');
  }

  return {
    questionResultId,
    label,
    note: typeof body.note === 'string' && body.note.trim() ? body.note.trim() : undefined,
  };
};

const getUserFromRequest = async (request: Request) => {
  const authorization = request.headers.get('authorization') ?? '';
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

  if (!accessToken) {
    throw new Error('Sign in again before marking question quality.');
  }

  const supabase = getSupabaseAdminClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    throw new Error('Your session could not be verified.');
  }

  return user;
};

export async function POST(request: Request) {
  const context = createRequestLogContext('/api/quiz/question-quality', request);
  const rateLimit = applyRateLimit({
    key: `question-quality:${getClientAddress(request)}`,
    limit: 120,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    logRequestWarn(context, 'rate_limit_rejected', {
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });

    return NextResponse.json(
      {
        error: 'Too many quality updates. Please wait a few minutes and try again.',
        requestId: context.requestId,
      },
      { status: 429 },
    );
  }

  try {
    const user = await getUserFromRequest(request);
    const body = (await request.json()) as Record<string, unknown>;
    const input = parseInput(body);
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('question_results')
      .update({
        quality_label: input.label,
        quality_note: input.note ?? null,
        quality_marked_at: new Date().toISOString(),
      })
      .eq('id', input.questionResultId)
      .eq('user_id', user.id)
      .select('id, quality_label, quality_note, quality_marked_at')
      .maybeSingle();

    if (error || !data) {
      throw new Error('Question quality could not be saved. Run the latest Supabase SQL migrations.');
    }

    logRequestInfo(context, 'request_completed', {
      status: 200,
      durationMs: getRequestDurationMs(context),
      questionResultId: data.id,
      label: data.quality_label,
    });

    return NextResponse.json(
      {
        result: {
          questionResultId: data.id,
          label: data.quality_label,
          note: data.quality_note,
          markedAt: data.quality_marked_at,
        },
        requestId: context.requestId,
      },
      {
        headers: {
          'X-Request-Id': context.requestId,
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Question quality could not be saved.';

    logRequestError(context, 'request_failed', error, {
      status: 400,
      durationMs: getRequestDurationMs(context),
    });

    return NextResponse.json(
      { error: message, requestId: context.requestId },
      {
        status: 400,
        headers: {
          'X-Request-Id': context.requestId,
        },
      },
    );
  }
}
