import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin';
import {
  createRequestLogContext,
  getRequestDurationMs,
  logRequestError,
  logRequestInfo,
} from '@/lib/server/observability';
import type {
  McqOption,
  McqOptionId,
  QuestionQualityLabel,
  SavedQuizSessionDetail,
} from '@/lib/types/quiz';

type RouteContext = {
  params: {
    sessionId: string;
  };
};

const isOptionId = (value: unknown): value is McqOptionId =>
  value === 'A' || value === 'B' || value === 'C' || value === 'D';

const isQualityLabel = (value: unknown): value is QuestionQualityLabel =>
  value === 'good' ||
  value === 'too_easy' ||
  value === 'malformed' ||
  value === 'off_style' ||
  value === 'unsupported';

const toQuizOptions = (
  value: unknown,
): [McqOption, McqOption, McqOption, McqOption] => {
  if (!Array.isArray(value) || value.length !== 4) {
    throw new Error('A saved quiz question has invalid options.');
  }

  return value.map((option, index) => {
    const optionRecord =
      option && typeof option === 'object' ? (option as Record<string, unknown>) : {};
    const id = isOptionId(optionRecord.id) ? optionRecord.id : (['A', 'B', 'C', 'D'][index] as McqOptionId);
    const text = typeof optionRecord.text === 'string' ? optionRecord.text : String(option ?? '');

    return {
      id,
      text,
    };
  }) as [McqOption, McqOption, McqOption, McqOption];
};

const getUserFromRequest = async (request: Request) => {
  const authorization = request.headers.get('authorization') ?? '';
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

  if (!accessToken) {
    throw new Error('Sign in again before opening quiz history.');
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

export async function GET(request: Request, { params }: RouteContext) {
  const context = createRequestLogContext('/api/quiz/sessions/[sessionId]', request);

  try {
    const user = await getUserFromRequest(request);
    const supabase = getSupabaseAdminClient();
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select('id, title, question_count, correct_count, score_percent, duration_seconds, created_at')
      .eq('id', params.sessionId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (sessionError || !session) {
      throw new Error('This quiz session could not be found.');
    }

    const { data: questionRows, error: questionsError } = await supabase
      .from('question_results')
      .select(
        'id, question_index, question, options_json, selected_answer, correct_answer, is_correct, explanation, concept_tag, quality_label, quality_note, quality_marked_at',
      )
      .eq('session_id', params.sessionId)
      .eq('user_id', user.id)
      .order('question_index', { ascending: true });

    if (questionsError) {
      throw new Error('Saved quiz questions could not be loaded. Run the latest Supabase SQL migrations.');
    }

    const detail: SavedQuizSessionDetail = {
      id: String(session.id),
      title: String(session.title ?? 'Saved quiz'),
      questionCount: Number(session.question_count ?? 0),
      correctCount: Number(session.correct_count ?? 0),
      scorePercent: Number(session.score_percent ?? 0),
      durationSeconds:
        typeof session.duration_seconds === 'number' ? session.duration_seconds : null,
      createdAt: String(session.created_at),
      results: (questionRows ?? []).map((row) => ({
        id: String(row.id),
        questionIndex: Number(row.question_index ?? 0),
        question: String(row.question ?? ''),
        options: toQuizOptions(row.options_json),
        selectedAnswer: isOptionId(row.selected_answer) ? row.selected_answer : 'A',
        correctAnswer: isOptionId(row.correct_answer) ? row.correct_answer : 'A',
        isCorrect: Boolean(row.is_correct),
        explanation: String(row.explanation ?? ''),
        conceptTag: typeof row.concept_tag === 'string' ? row.concept_tag : undefined,
        qualityLabel: isQualityLabel(row.quality_label) ? row.quality_label : undefined,
        qualityNote: typeof row.quality_note === 'string' ? row.quality_note : undefined,
        qualityMarkedAt:
          typeof row.quality_marked_at === 'string' ? row.quality_marked_at : undefined,
      })),
    };

    logRequestInfo(context, 'request_completed', {
      status: 200,
      durationMs: getRequestDurationMs(context),
      sessionId: detail.id,
      questionCount: detail.results.length,
    });

    return NextResponse.json(
      { session: detail, requestId: context.requestId },
      {
        headers: {
          'X-Request-Id': context.requestId,
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Saved quiz session could not be loaded.';

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
