import { NextResponse } from 'next/server';
import { extractNotes } from '@/lib/server/extract-notes';

export async function POST(request: Request) {
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

      return NextResponse.json({ result });
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

      return NextResponse.json({ result });
    }

    return NextResponse.json({ error: 'Unsupported extraction request.' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Extraction failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
