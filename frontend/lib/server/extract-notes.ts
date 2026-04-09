import { getSupabaseAdminClient } from '@/lib/server/supabase-admin';

export type ExtractNotesInput =
  | {
      inputType: 'text';
      rawText: string;
      title?: string;
    }
  | {
      inputType: 'storage';
      storagePath: string;
      mimeType: string;
      title?: string;
    };

export type ExtractNotesResult = {
  title: string;
  extractedText: string;
  keyTopics: string[];
  method: 'normalized_text' | 'gemini_flash';
  characterCount: number;
};

const normalizeText = (value: string): string =>
  value
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const parseJsonCandidate = (value: string): { extractedText: string; keyTopics?: string[]; documentTitle?: string } | null => {
  try {
    return JSON.parse(value) as { extractedText: string; keyTopics?: string[]; documentTitle?: string };
  } catch {
    const match = value.match(/\{[\s\S]*\}/);

    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]) as { extractedText: string; keyTopics?: string[]; documentTitle?: string };
    } catch {
      return null;
    }
  }
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => Buffer.from(buffer).toString('base64');

const extractTextWithGeminiFlash = async (fileBytes: ArrayBuffer, mimeType: string, title?: string) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_FLASH_MODEL;

  if (!apiKey || !model) {
    throw new Error('Missing Gemini Flash configuration. Add GEMINI_API_KEY and GEMINI_FLASH_MODEL to the frontend environment.');
  }

  const prompt = [
    'You extract clean study notes for a UPSC preparation system.',
    'Return valid JSON only.',
    'Use this exact shape:',
    '{"documentTitle":"string","extractedText":"string","keyTopics":["string"]}',
    'Preserve important facts, headings, bullet points, and article/case names.',
    'Do not invent content. If some text is unreadable, skip it instead of hallucinating.',
    title ? `Suggested title: ${title}` : 'Suggested title: Uploaded notes',
  ].join('\n');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: arrayBufferToBase64(fileBytes),
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Flash request failed: ${errorText}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  const candidateText = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('\n') ?? '';
  const parsed = parseJsonCandidate(candidateText);

  if (!parsed?.extractedText) {
    throw new Error('Gemini Flash did not return valid extraction output.');
  }

  return {
    title: parsed.documentTitle || title || 'Uploaded notes',
    extractedText: normalizeText(parsed.extractedText),
    keyTopics: (parsed.keyTopics ?? []).filter(Boolean).slice(0, 8),
  };
};

export const extractNotes = async (input: ExtractNotesInput): Promise<ExtractNotesResult> => {
  if (input.inputType === 'text') {
    const extractedText = normalizeText(input.rawText);

    if (!extractedText) {
      throw new Error('There was no readable text to extract.');
    }

    const keyTopics = extractedText
      .split(/\n+/)
      .map((line) => line.replace(/^[-*#\d.\s]+/, '').trim())
      .filter((line) => line.length > 8)
      .slice(0, 6);

    return {
      title: input.title?.trim() || 'Pasted notes',
      extractedText,
      keyTopics,
      method: 'normalized_text',
      characterCount: extractedText.length,
    };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.storage.from('raw-notes').download(input.storagePath);

  if (error || !data) {
    throw new Error('The uploaded file could not be loaded from storage.');
  }

  const fileBytes = await data.arrayBuffer();
  const extracted = await extractTextWithGeminiFlash(fileBytes, input.mimeType, input.title);

  return {
    ...extracted,
    method: 'gemini_flash',
    characterCount: extracted.extractedText.length,
  };
};
