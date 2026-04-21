import { UPSC_SHARED_RULES } from '@/lib/server/prompts/shared/upsc-rules';
import type { McqPromptInput } from '@/lib/server/prompts/types';

export const buildUpscGs1McqPrompt = ({
  title,
  questionCount,
  keyTopics,
  sourceText,
  validationFeedback,
  prioritizeCorrectness = false,
}: McqPromptInput): string => `
${UPSC_SHARED_RULES}

You are creating UPSC Civil Services Preliminary Examination, General Studies Paper 1 MCQs.

TASK
Generate exactly ${questionCount} source-grounded MCQs from the provided source text.

NON-NEGOTIABLE RULES
1. Use only the source text. Do not add outside facts.
2. Every question must have exactly four options: A, B, C, D.
3. Exactly one option must be correct.
4. Include a concise explanation and a short sourceSupport paraphrase.
5. Do not mention "source", "passage", "text", "notes", "uploaded material", or similar meta wording in questions, explanations, or sourceSupport.
6. Prefer compact UPSC-style stems: statements, pairs, chronology, scope, institutional role, constitutional/legal distinction, concept distinction, or correct association.
7. Keep distractors close and plausible, not random.
8. Avoid generic reading-comprehension questions about what the material discusses.

GS PAPER 1 BOUNDARIES
Use questions that fit UPSC GS1 domains: current events, history, geography, polity, economy, environment, science and technology.

QUESTION DESIGN PREFERENCE
If using "Consider the following statements", end with a valid instruction such as "Which of the statements given above is/are correct?" or "How many of the above statements are correct?" Match the option style to the stem.

${prioritizeCorrectness ? `FINAL ATTEMPT PRIORITY
Optimize for correctness, schema compliance, and clarity over difficulty.
If the source is limited, make the questions simpler rather than risk ambiguity.
Return only standard four-option MCQs.` : ''}

OUTPUT
Return valid JSON only in this exact shape:

{
  "questions": [
    {
      "question": "string",
      "options": [
        "A. ...",
        "B. ...",
        "C. ...",
        "D. ..."
      ],
      "correctAnswer": "A",
      "explanation": "string",
      "concepts": ["concept1", "concept2"],
      "sourceSupport": "Short paraphrase of the exact source idea that supports the answer."
    }
  ],
  "qualityCheck": {
    "sourceAdequate": true,
    "notes": "Brief note on whether the source was sufficient for nuanced UPSC GS1 MCQs."
  }
}

SOURCE TITLE:
${title ?? 'Uploaded notes'}

${keyTopics?.length ? `PRIORITY TOPICS:\n${keyTopics.join(', ')}\n` : ''}
${validationFeedback ? `RETRY GUIDANCE
Your previous response failed validation.
Fix these issues:
${validationFeedback}

` : ''}SOURCE TEXT:
${sourceText}
`.trim();
