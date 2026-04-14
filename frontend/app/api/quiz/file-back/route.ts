import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin';
import {
  createRequestLogContext,
  getRequestDurationMs,
  logRequestError,
  logRequestInfo,
  logRequestWarn,
} from '@/lib/server/observability';
import { readQuizToken } from '@/lib/server/quiz-token';
import { applyRateLimit, getClientAddress } from '@/lib/server/rate-limit';
import { saveQuizResults } from '@/lib/server/save-quiz-results';
import type {
  McqOptionId,
  QuizResultItem,
  SaveQuizResultsInput,
  SubmitQuizAttemptInput,
} from '@/lib/types/quiz';

const isOptionId = (value: unknown): value is McqOptionId =>
  value === 'A' || value === 'B' || value === 'C' || value === 'D';

const parseSubmitQuizAttemptInput = (body: Record<string, unknown>): SubmitQuizAttemptInput => {
  const quizToken = typeof body.quizToken === 'string' ? body.quizToken.trim() : '';
  const selectedAnswers = Array.isArray(body.selectedAnswers)
    ? body.selectedAnswers.filter((answer): answer is McqOptionId => isOptionId(answer))
    : [];

  if (!quizToken) {
    throw new Error('Quiz token is required.');
  }

  if (!selectedAnswers.length) {
    throw new Error('Selected answers are required.');
  }

  return {
    sourceUploadId:
      typeof body.sourceUploadId === 'string' && body.sourceUploadId.trim()
        ? body.sourceUploadId.trim()
        : undefined,
    quizToken,
    selectedAnswers,
    durationSeconds:
      typeof body.durationSeconds === 'number' && Number.isFinite(body.durationSeconds)
        ? body.durationSeconds
        : undefined,
  };
};

const assertOwnedSourceUpload = async (userId: string, sourceUploadId?: string) => {
  if (!sourceUploadId) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('source_uploads')
    .select('id')
    .eq('id', sourceUploadId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    throw new Error('The selected source could not be linked to this quiz session.');
  }
};

const buildSaveQuizResultsInput = (
  submission: SubmitQuizAttemptInput,
): SaveQuizResultsInput => {
  const signedQuiz = readQuizToken(submission.quizToken);

  if (submission.selectedAnswers.length !== signedQuiz.mcqs.length) {
    throw new Error('Every question must have a selected answer before saving.');
  }

  const results: QuizResultItem[] = signedQuiz.mcqs.map((mcq, index) => {
    const selectedAnswer = submission.selectedAnswers[index];

    if (!isOptionId(selectedAnswer)) {
      throw new Error(`Question ${index + 1} is missing a valid selected answer.`);
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

  const correctCount = results.filter((result) => result.isCorrect).length;
  const scorePercent = Math.round((correctCount / results.length) * 10000) / 100;

  return {
    sourceUploadId: submission.sourceUploadId,
    title: signedQuiz.title,
    questionCount: results.length,
    correctCount,
    scorePercent,
    durationSeconds: submission.durationSeconds,
    results,
  };
};

export async function POST(request: Request) {
  const context = createRequestLogContext('/api/quiz/file-back', request);
  const rateLimit = applyRateLimit({
    key: `quiz-save:${getClientAddress(request)}`,
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    logRequestWarn(context, 'rate_limit_rejected', {
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });

    return NextResponse.json(
      {
        error: 'Too many save attempts. Please wait a few minutes and try again.',
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
    const authorization = request.headers.get('authorization') ?? '';
    const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

    if (!accessToken) {
      logRequestWarn(context, 'request_rejected', {
        status: 401,
        durationMs: getRequestDurationMs(context),
        reason: 'missing_access_token',
      });

      return NextResponse.json(
        { error: 'Sign in again before saving quiz results.', requestId: context.requestId },
        {
          status: 401,
          headers: {
            'X-Request-Id': context.requestId,
          },
        },
      );
    }

    const supabase = getSupabaseAdminClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      logRequestWarn(context, 'request_rejected', {
        status: 401,
        durationMs: getRequestDurationMs(context),
        reason: 'invalid_session',
      });

      return NextResponse.json(
        { error: 'Your session could not be verified.', requestId: context.requestId },
        {
          status: 401,
          headers: {
            'X-Request-Id': context.requestId,
          },
        },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const submission = parseSubmitQuizAttemptInput(body);
    await assertOwnedSourceUpload(user.id, submission.sourceUploadId);
    const input = buildSaveQuizResultsInput(submission);
    const result = await saveQuizResults(user.id, input);

    logRequestInfo(context, 'request_completed', {
      status: 200,
      durationMs: getRequestDurationMs(context),
      correctCount: result.correctCount,
      questionCount: result.questionCount,
      scorePercent: result.scorePercent,
    });

    return NextResponse.json(
      { result, requestId: context.requestId },
      {
        headers: {
          'X-Request-Id': context.requestId,
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Quiz results could not be saved.';
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
