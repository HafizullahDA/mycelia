import { getSupabaseAdminClient } from '@/lib/server/supabase-admin';
import type { SaveQuizResultsInput, SaveQuizResultsResult } from '@/lib/types/quiz';

const roundScorePercent = (value: number): number => Math.round(value * 100) / 100;

export const saveQuizResults = async (
  userId: string,
  input: SaveQuizResultsInput,
): Promise<SaveQuizResultsResult> => {
  if (!userId) {
    throw new Error('A signed-in user is required before quiz results can be saved.');
  }

  if (!input.title.trim()) {
    throw new Error('Quiz title is required.');
  }

  if (!input.results.length) {
    throw new Error('At least one question result is required.');
  }

  const questionCount = input.results.length;
  const correctCount = input.results.filter((result) => result.isCorrect).length;
  const scorePercent = roundScorePercent((correctCount / questionCount) * 100);
  const durationSeconds =
    typeof input.durationSeconds === 'number' && Number.isFinite(input.durationSeconds)
      ? Math.max(0, Math.round(input.durationSeconds))
      : null;

  const supabase = getSupabaseAdminClient();

  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .insert({
      user_id: userId,
      source_upload_id: input.sourceUploadId ?? null,
      title: input.title.trim(),
      question_count: questionCount,
      correct_count: correctCount,
      score_percent: scorePercent,
      duration_seconds: durationSeconds,
    })
    .select('id')
    .single();

  if (sessionError || !session) {
    throw new Error('Quiz session could not be saved.');
  }

  const questionRows = input.results.map((result) => ({
    session_id: session.id,
    user_id: userId,
    question_index: result.questionIndex,
    question: result.question,
    options_json: result.options,
    selected_answer: result.selectedAnswer,
    correct_answer: result.correctAnswer,
    is_correct: result.isCorrect,
    explanation: result.explanation,
    concept_tag: result.conceptTag ?? null,
  }));

  const { error: resultsError } = await supabase.from('question_results').insert(questionRows);

  if (resultsError) {
    await supabase.from('quiz_sessions').delete().eq('id', session.id);
    throw new Error('Question results could not be saved.');
  }

  return {
    sessionId: session.id,
    questionCount,
    correctCount,
    scorePercent,
  };
};
