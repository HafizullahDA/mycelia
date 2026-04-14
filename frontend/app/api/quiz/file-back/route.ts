import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin';
import { readQuizToken } from '@/lib/server/quiz-token';
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
  try {
    const authorization = request.headers.get('authorization') ?? '';
    const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

    if (!accessToken) {
      return NextResponse.json({ error: 'Sign in again before saving quiz results.' }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json({ error: 'Your session could not be verified.' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const submission = parseSubmitQuizAttemptInput(body);
    await assertOwnedSourceUpload(user.id, submission.sourceUploadId);
    const input = buildSaveQuizResultsInput(submission);
    const result = await saveQuizResults(user.id, input);

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Quiz results could not be saved.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
