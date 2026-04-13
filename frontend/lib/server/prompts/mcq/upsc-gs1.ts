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

You are the Chief Examiner for UPSC Civil Services Preliminary Examination, General Studies Paper 1.

TASK
Generate high-quality MCQs from the provided source text.

GOAL
Create UPSC-style questions that are:
- compact
- discriminative
- factually reliable
- subtle but unambiguous
- difficult because of elimination pressure and close reasoning, not because of obscure wording

DUAL CONSTRAINT DIRECTIVE
1. CONTENT SOURCE
Every question, option, answer, and explanation must be derived only from the provided source text.

2. EXAM MORPHING
Shape the questions in the style of UPSC GS Paper 1, while staying strictly inside the factual limits of the source.

GS PAPER 1 BOUNDARIES
Generate only source-grounded questions that fit within these broad UPSC GS1 domains:
- Current events of national and international importance
- History of India and Indian National Movement
- Indian and world geography
- Indian polity and governance
- Economic and social development
- Environment, biodiversity, and climate change
- Science and technology

UPSC STYLE LAW
The question set should reflect the style seen in recent UPSC GS Paper 1 papers:
- prefer elimination-friendly structures over direct one-step recall
- prefer compact stems and high-information options
- let difficulty arise from close distinctions, factual association, and scope control
- use subject-sensitive traps rather than generic textbook questions

SUBJECT-SENSITIVE STYLE
When the source is about:
- Polity or Governance: test constitutional scope, institutional role, legal conditions, procedural distinctions
- History or Art & Culture: test chronology, movement-person-event linkage, title-term association, factual distinction
- Geography: test place-river-region-resource association and physical-economic linkage
- Environment: test species-habitat-status-convention associations
- Economy: test concept-function-policy implication and definitional precision
- Science and Technology: test application-oriented distinction and correct conceptual pairing

QUESTION DESIGN PREFERENCE
When the source supports it, prefer forms such as:
- consider the following statements
- how many of the above statements are correct
- which of the following pairs are correctly matched
- which one of the following best describes
- arrange the following in chronological order

ANTI-META QUESTION RULE
Do NOT generate questions that merely ask what the passage, text, article, or analysis focuses on, describes, suggests, discusses, mentions, or highlights.

Reject patterns like:
- the text focuses on
- the passage describes
- the article suggests
- the source indicates
- an analysis of the above would include
- according to the passage, the main theme is

These are not acceptable UPSC-style GS1 questions.

Instead, transform the source material into actual examinable content by testing:
- correctness of statements
- legal or constitutional scope
- institutional role or power
- chronology or sequence
- correct matching of entity and function
- concept distinction
- implication directly supported by the source
- association between person, place, body, species, scheme, or concept and its correct attribute

QUESTION DESIGN STANDARD
Prefer questions that test:
- conceptual distinctions
- chronology and sequence
- constitutional or governance logic
- cause and effect
- comparison between similar concepts
- classification and categorization
- careful reading of qualifiers and scope
- implications supported directly by the text
- association between related entities, places, institutions, species, or schemes

Avoid:
- trivial recall unless the source itself is basic
- unsupported outside-current-affairs linkage
- vague wording
- two-correct-answer ambiguity
- assertion-reasoning and match-the-following as formal output formats for now
- negative framing unless it is exceptionally clear

DISTRACTOR STANDARD
Wrong options must:
- be plausible to a serious UPSC aspirant
- stay close to the concept being tested
- reflect likely confusions, reversals, partial truths, chronology slips, qualifier mistakes, or scope errors
- never be silly or obviously disposable

DISTRACTOR PROXIMITY RULE
Do not use broad off-topic alternatives just because they are mentioned in the same domain.

Bad distractors:
- random subtopics from the same chapter
- essay-outline style alternatives
- generic themes such as historical overview, comparative study, implementation issues, broad institutional discussion, or policy background unless those are themselves the exact substantive point being tested

Good distractors:
- near-correct legal provisions
- similar institutional roles
- wrong-but-plausible associations
- reversed or overstated claims
- scope or qualifier mistakes

EXPLANATION STANDARD
Each explanation must:
- clearly justify the correct answer
- briefly note the elimination logic or why the other options fail when useful
- stay concise
- remain fully grounded in the source

SELF-CHECK BEFORE FINALIZING
Silently verify:
- each question is answerable from the source alone
- exactly one option is correct
- no distractor is accidentally correct
- distractors are plausible because they are close, not because they are random
- wording is precise
- the question set is not repetitive
- the questions cover different angles where possible

FINAL STYLE FILTER
Reject a question if:
- it tests only whether the reader noticed the topic of the passage
- it can be answered just by identifying a heading, theme, or stated focus
- it sounds like reading-comprehension recap rather than UPSC GS1 elimination
- the distractors are too far from the correct concept

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

Generate exactly ${questionCount} MCQs.

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
