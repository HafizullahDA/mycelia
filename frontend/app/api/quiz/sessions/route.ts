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
import type { SavedQuizSessionSummary } from '@/lib/types/quiz';

const getUserFromRequest = async (request: Request) => {
  const authorization = request.headers.get('authorization') ?? '';
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

  if (!accessToken) {
    throw new Error('Sign in again before loading quiz history.');
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

export async function GET(request: Request) {
  const context = createRequestLogContext('/api/quiz/sessions', request);
  const rateLimit = applyRateLimit({
    key: `quiz-history:${getClientAddress(request)}`,
    limit: 60,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    logRequestWarn(context, 'rate_limit_rejected', {
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });

    return NextResponse.json(
      {
        error: 'Too many quiz history requests. Please wait a few minutes and try again.',
        requestId: context.requestId,
      },
      { status: 429 },
    );
  }

  try {
    const user = await getUserFromRequest(request);
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('quiz_sessions')
      .select('id, title, question_count, correct_count, score_percent, duration_seconds, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw new Error('Past quiz sessions could not be loaded.');
    }

    const sessions: SavedQuizSessionSummary[] = (data ?? []).map((session) => ({
      id: String(session.id),
      title: String(session.title ?? 'Saved quiz'),
      questionCount: Number(session.question_count ?? 0),
      correctCount: Number(session.correct_count ?? 0),
      scorePercent: Number(session.score_percent ?? 0),
      durationSeconds:
        typeof session.duration_seconds === 'number' ? session.duration_seconds : null,
      createdAt: String(session.created_at),
    }));

    logRequestInfo(context, 'request_completed', {
      status: 200,
      durationMs: getRequestDurationMs(context),
      sessionCount: sessions.length,
    });

    return NextResponse.json(
      { sessions, requestId: context.requestId },
      {
        headers: {
          'X-Request-Id': context.requestId,
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Past quiz sessions could not be loaded.';

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
