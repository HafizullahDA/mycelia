import { createHmac, timingSafeEqual } from 'node:crypto';
import type { GeneratedMcq } from '@/lib/types/quiz';

type SignedQuizPayload = {
  title: string;
  mcqs: GeneratedMcq[];
};

const toBase64Url = (value: string): string => Buffer.from(value, 'utf8').toString('base64url');

const fromBase64Url = (value: string): string => Buffer.from(value, 'base64url').toString('utf8');

const getQuizSigningSecret = (): string => {
  const secret = process.env.QUIZ_SIGNING_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error(
      'Missing quiz signing secret. Add QUIZ_SIGNING_SECRET or SUPABASE_SERVICE_ROLE_KEY to the frontend environment.',
    );
  }

  return secret;
};

const signPayload = (payloadBase64: string): string =>
  createHmac('sha256', getQuizSigningSecret()).update(payloadBase64).digest('base64url');

export const createQuizToken = (payload: SignedQuizPayload): string => {
  const payloadBase64 = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(payloadBase64);

  return `${payloadBase64}.${signature}`;
};

export const readQuizToken = (token: string): SignedQuizPayload => {
  const [payloadBase64, providedSignature] = token.split('.');

  if (!payloadBase64 || !providedSignature) {
    throw new Error('Quiz token is invalid.');
  }

  const expectedSignature = signPayload(payloadBase64);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new Error('Quiz token verification failed.');
  }

  const payload = JSON.parse(fromBase64Url(payloadBase64)) as SignedQuizPayload;

  if (!payload.title || !Array.isArray(payload.mcqs) || payload.mcqs.length === 0) {
    throw new Error('Quiz token payload is invalid.');
  }

  return payload;
};
