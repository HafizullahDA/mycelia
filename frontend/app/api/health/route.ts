import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin';

type CheckStatus = 'healthy' | 'unavailable';

type HealthCheck = {
  status: CheckStatus;
  detail: string;
};

const hasBrowserSupabaseEnv = (): boolean =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const hasVertexEnv = (): boolean =>
  Boolean(
    process.env.GOOGLE_CLOUD_API_KEY &&
      process.env.GOOGLE_CLOUD_PROJECT_ID &&
      process.env.GEMINI_FLASH_MODEL &&
      process.env.GEMINI_PRO_MODEL,
  );

const checkSupabaseTable = async (table: 'source_uploads' | 'quiz_sessions'): Promise<HealthCheck> => {
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from(table).select('id').limit(1);

    if (error) {
      return {
        status: 'unavailable',
        detail: `${table} table is not reachable.`,
      };
    }

    return {
      status: 'healthy',
      detail: `${table} table is reachable.`,
    };
  } catch {
    return {
      status: 'unavailable',
      detail: `${table} table check could not be completed.`,
    };
  }
};

const checkRawNotesBucket = async (): Promise<HealthCheck> => {
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.storage.from('raw-notes').list('', { limit: 1 });

    if (error) {
      return {
        status: 'unavailable',
        detail: 'raw-notes storage bucket is not reachable.',
      };
    }

    return {
      status: 'healthy',
      detail: 'raw-notes storage bucket is reachable.',
    };
  } catch {
    return {
      status: 'unavailable',
      detail: 'raw-notes storage bucket check could not be completed.',
    };
  }
};

export async function GET() {
  const checks: Record<string, HealthCheck> = {
    app: {
      status: 'healthy',
      detail: 'API route is responding.',
    },
    browserEnv: hasBrowserSupabaseEnv()
      ? {
          status: 'healthy',
          detail: 'Browser Supabase configuration is present.',
        }
      : {
          status: 'unavailable',
          detail: 'Browser Supabase configuration is missing.',
        },
    vertexEnv: hasVertexEnv()
      ? {
          status: 'healthy',
          detail: 'Vertex AI configuration is present.',
        }
      : {
          status: 'unavailable',
          detail: 'Vertex AI configuration is missing.',
        },
  };

  const [sourceUploads, quizPersistence, rawNotesBucket] = await Promise.all([
    checkSupabaseTable('source_uploads'),
    checkSupabaseTable('quiz_sessions'),
    checkRawNotesBucket(),
  ]);

  checks.sourceUploads = sourceUploads;
  checks.quizPersistence = quizPersistence;
  checks.rawNotesBucket = rawNotesBucket;

  const overallStatus: CheckStatus = Object.values(checks).every((check) => check.status === 'healthy')
    ? 'healthy'
    : 'unavailable';

  return NextResponse.json(
    {
      status: overallStatus,
      checkedAt: new Date().toISOString(),
      checks,
    },
    {
      status: overallStatus === 'healthy' ? 200 : 503,
    },
  );
}
