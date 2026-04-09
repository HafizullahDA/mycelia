import { NextResponse } from 'next/server';
import { generateMcqs } from '@/lib/server/generate-mcqs';

export async function POST(request: Request) {
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

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: 'Extracted notes are required before MCQs can be generated.' },
        { status: 400 },
      );
    }

    const result = await generateMcqs({
      title,
      extractedText,
      keyTopics,
      questionCount,
    });

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'MCQ generation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}