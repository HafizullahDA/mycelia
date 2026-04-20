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

const MAX_FEEDBACK_WORDS = 100;

const countWords = (value: string): number => value.trim().split(/\s+/).filter(Boolean).length;

const getUserFromRequest = async (request: Request) => {
  const authorization = request.headers.get('authorization') ?? '';
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

  if (!accessToken) {
    throw new Error('Sign in again before sending quiz feedback.');
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

const parseFeedbackInput = (body: Record<string, unknown>) => {
  const feedbackText = typeof body.feedbackText === 'string' ? body.feedbackText.trim() : '';
  const quizTitle = typeof body.quizTitle === 'string' && body.quizTitle.trim()
    ? body.quizTitle.trim()
    : 'Generated quiz';
  const questionCount =
    typeof body.questionCount === 'number' && Number.isFinite(body.questionCount)
      ? Math.max(1, Math.round(body.questionCount))
      : 0;
  const sourceUploadId =
    typeof body.sourceUploadId === 'string' && body.sourceUploadId.trim()
      ? body.sourceUploadId.trim()
      : undefined;

  if (!feedbackText) {
    throw new Error('Write a short note before sending feedback.');
  }

  if (countWords(feedbackText) > MAX_FEEDBACK_WORDS) {
    throw new Error('Keep feedback under 100 words.');
  }

  if (!questionCount) {
    throw new Error('Question count is required for quiz feedback.');
  }

  return {
    sourceUploadId,
    quizTitle,
    questionCount,
    feedbackText,
  };
};

export async function POST(request: Request) {
  const context = createRequestLogContext('/api/quiz/generation-feedback', request);
  const rateLimit = applyRateLimit({
    key: `quiz-generation-feedback:${getClientAddress(request)}`,
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    logRequestWarn(context, 'rate_limit_rejected', {
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });

    return NextResponse.json(
      {
        error: 'Too many feedback submissions. Please wait a few minutes and try again.',
        requestId: context.requestId,
      },
      { status: 429 },
    );
  }

  try {
    const user = await getUserFromRequest(request);
    const body = (await request.json()) as Record<string, unknown>;
    const input = parseFeedbackInput(body);
    const supabase = getSupabaseAdminClient();

    if (input.sourceUploadId) {
      const { data: sourceUpload, error: sourceError } = await supabase
        .from('source_uploads')
        .select('id')
        .eq('id', input.sourceUploadId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (sourceError || !sourceUpload) {
        throw new Error('The selected source could not be linked to this feedback.');
      }
    }

    const { data, error } = await supabase
      .from('quiz_generation_feedback')
      .insert({
        user_id: user.id,
        source_upload_id: input.sourceUploadId ?? null,
        quiz_title: input.quizTitle,
        question_count: input.questionCount,
        feedback_text: input.feedbackText,
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error('Quiz feedback could not be saved. Run the latest Supabase SQL migration.');
    }

    logRequestInfo(context, 'request_completed', {
      status: 200,
      durationMs: getRequestDurationMs(context),
      feedbackId: data.id,
      questionCount: input.questionCount,
      wordCount: countWords(input.feedbackText),
    });

    return NextResponse.json(
      {
        result: {
          feedbackId: data.id,
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
    const message = error instanceof Error ? error.message : 'Quiz feedback could not be saved.';

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
