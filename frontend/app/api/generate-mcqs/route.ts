import { NextResponse } from 'next/server';
import { generateMcqs } from '@/lib/server/generate-mcqs';

export const maxDuration = 300;

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
    const inputType = body.inputType;

    if (extractedText.trim()) {
      const result = await generateMcqs({
        title,
        extractedText,
        keyTopics,
        questionCount,
      });

      return NextResponse.json({ result });
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

      return NextResponse.json({ result });
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

      return NextResponse.json({ result });
    }

    return NextResponse.json(
      { error: 'A source file, pasted text, or extracted text is required before MCQs can be generated.' },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'MCQ generation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
