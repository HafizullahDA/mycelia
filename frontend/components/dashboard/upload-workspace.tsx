'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { BrandWordmark } from '@/components/brand/wordmark';
import { EnvSetupNotice } from '@/components/system/env-setup-notice';
import { McqGenerationPanel } from '@/components/quiz/mcq-generation-panel';
import type { McqGenerationResult } from '@/lib/types/quiz';
import {
  getSupabaseBrowserClient,
  getSupabaseBrowserEnvErrorMessage,
  hasSupabaseBrowserEnv,
} from '@/lib/supabase/client';

type UploadMode = 'file' | 'text';
type SourceKind = 'pdf' | 'image' | 'text';
type ProcessingStep = 'idle' | 'saving' | 'building' | 'ready' | 'error';

type SavedSourceItem = {
  id: string;
  kind: SourceKind;
  label: string;
  status: 'saved' | 'pending_setup';
  detail: string;
  storagePath?: string;
  mimeType?: string;
  rawText?: string;
  title?: string;
};

type GenerationSource =
  | {
      sourceUploadId?: string;
      title: string;
      inputType: 'text';
      rawText: string;
    }
  | {
      sourceUploadId?: string;
      title: string;
      inputType: 'storage';
      storagePath: string;
      mimeType: string;
    };

type SourceUploadRow = {
  id: string;
  upload_type: SourceKind;
  title: string | null;
  original_filename: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  storage_path: string | null;
  raw_text: string | null;
};

type SaveMetadataResult =
  | {
      status: 'saved';
      sourceId: string;
    }
  | {
      status: 'pending_setup';
    };

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const RAW_NOTES_BUCKET = 'raw-notes';
const QUESTION_COUNT_OPTIONS = [5, 10, 15] as const;

const sanitizeFileName = (fileName: string): string =>
  fileName.toLowerCase().replace(/[^a-z0-9.-]+/g, '-');

const classifyFile = (file: File): SourceKind | null => {
  if (file.type === 'application/pdf') {
    return 'pdf';
  }

  if (file.type.startsWith('image/')) {
    return 'image';
  }

  return null;
};

const formatBytes = (value: number): string => {
  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const mapSourceUploadRow = (row: SourceUploadRow): SavedSourceItem => {
  if (row.upload_type === 'text') {
    const textLength = row.raw_text?.length ?? 0;

    return {
      id: row.id,
      kind: 'text',
      label: row.title?.trim() || 'Pasted notes',
      status: 'saved',
      detail: `${textLength} characters saved and ready`,
      rawText: row.raw_text ?? '',
      title: row.title ?? 'Pasted notes',
    };
  }

  return {
    id: row.id,
    kind: row.upload_type,
    label: row.original_filename ?? row.title?.trim() ?? 'Uploaded source',
    status: 'saved',
    detail:
      typeof row.file_size_bytes === 'number'
        ? `${formatBytes(row.file_size_bytes)} - saved and ready`
        : 'Saved in storage and ready',
    storagePath: row.storage_path ?? undefined,
    mimeType: row.mime_type ?? undefined,
    title: row.title ?? row.original_filename ?? 'Uploaded source',
  };
};

const FileIcon = () => (
  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8 3.75h6.086c.398 0 .779.158 1.061.439l3.664 3.665c.281.281.439.663.439 1.061V19.5A1.75 1.75 0 0 1 17.5 21.25h-9A1.75 1.75 0 0 1 6.75 19.5v-14A1.75 1.75 0 0 1 8.5 3.75H8Z"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path d="M14.25 3.75V8.5h4.75" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
  </svg>
);

const ProcessingMyceliaState = () => (
  <div className="flex min-h-[200px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[#C8A44A]/28 bg-[linear-gradient(180deg,rgba(200,164,74,0.08),rgba(17,24,39,0.5))] px-5 py-7 text-center sm:min-h-[220px] sm:px-6 sm:py-8">
    <div className="animate-spin [animation-duration:3s]">
      <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[#C8A44A]/20 bg-[#C8A44A]/[0.07] shadow-[0_0_36px_rgba(200,164,74,0.12)]">
        <span className="absolute -rotate-45 h-8 w-px bg-[#C8A44A]/80" />
        <span className="absolute rotate-45 h-8 w-px bg-[#C8A44A]/80" />
        <span className="absolute rotate-45 h-px w-8 bg-[#C8A44A]/65" />
        <span className="absolute -rotate-45 h-px w-8 bg-[#C8A44A]/65" />
        <span className="h-2 w-2 rounded-full bg-[#C8A44A]" />
      </span>
    </div>
    <BrandWordmark className="mt-5 items-center" size="sm" />
    <p className="mt-5 text-base font-semibold text-[#F9FAFB]">Generating MCQs...</p>
    <p className="mt-2 max-w-md text-sm leading-6 text-[#9CA3AF]">
      myCELIA is processing your notes and preparing your UPSC practice set.
    </p>
  </div>
);

export function DashboardUploadWorkspace() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [mode, setMode] = useState<UploadMode>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [title, setTitle] = useState('');
  const [questionCount, setQuestionCount] =
    useState<(typeof QUESTION_COUNT_OPTIONS)[number]>(10);
  const [uploading, setUploading] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [savedItems, setSavedItems] = useState<SavedSourceItem[]>([]);
  const [generationSource, setGenerationSource] = useState<GenerationSource | null>(null);
  const [generationResult, setGenerationResult] = useState<McqGenerationResult | null>(null);
  const [autoGenerateToken, setAutoGenerateToken] = useState(0);
  const hasSupabaseEnv = hasSupabaseBrowserEnv();

  useEffect(() => {
    if (!hasSupabaseEnv) {
      setAuthChecking(false);
      return;
    }

    let isActive = true;

    const loadSavedItems = async (currentUserId: string) => {
      const supabase = getSupabaseBrowserClient();

      const { data, error: loadError } = await supabase
        .from('source_uploads')
        .select(
          'id, upload_type, title, original_filename, mime_type, file_size_bytes, storage_path, raw_text',
        )
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(6);

      if (!isActive) {
        return;
      }

      if (loadError) {
        const normalized = loadError.message.toLowerCase();

        if (normalized.includes('source_uploads') || normalized.includes('relation')) {
          setSavedItems([]);
          return;
        }

        setError('Saved sources could not be loaded. Check Supabase setup.');
        return;
      }

      setSavedItems((data ?? []).map((row) => mapSourceUploadRow(row as SourceUploadRow)));
    };

    const loadUser = async () => {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!isActive) {
        return;
      }

      if (!currentUser) {
        setUser(null);
        setAuthChecking(false);
        router.replace('/login');
        return;
      }

      setUser(currentUser);
      setAuthChecking(false);
      await loadSavedItems(currentUser.id);
    };

    void loadUser();

    const supabase = getSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isActive) {
        return;
      }

      if (!session?.user) {
        setUser(null);
        router.replace('/login');
        return;
      }

      setUser(session.user);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [hasSupabaseEnv, router]);

  const isProcessing =
    uploading ||
    processingStep === 'building' ||
    processingStep === 'saving';

  const handleFileSelect = (file: File | null) => {
    setError('');
    setSuccessMessage('');

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const kind = classifyFile(file);

    if (!kind) {
      setSelectedFile(null);
      setError('Upload a PDF or image file only.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSelectedFile(null);
      setError('Keep files under 50 MB.');
      return;
    }

    setSelectedFile(file);
  };

  const saveMetadataRecord = async (payload: {
    upload_type: SourceKind;
    title: string | null;
    original_filename: string | null;
    mime_type: string | null;
    file_size_bytes: number | null;
    storage_bucket: string | null;
    storage_path: string | null;
    raw_text: string | null;
  }): Promise<SaveMetadataResult> => {
    const supabase = getSupabaseBrowserClient();
    const { data, error: insertError } = await supabase
      .from('source_uploads')
      .insert({
        user_id: user?.id ?? null,
        ...payload,
        status: 'uploaded',
      })
      .select('id')
      .single();

    if (!insertError && data?.id) {
      return {
        status: 'saved',
        sourceId: data.id,
      };
    }

    if (
      insertError?.message.toLowerCase().includes('source_uploads') ||
      insertError?.message.toLowerCase().includes('relation')
    ) {
      return {
        status: 'pending_setup',
      };
    }

    throw insertError;
  };

  const pushSavedItem = (item: SavedSourceItem) => {
    setSavedItems((current) => [item, ...current.filter((existing) => existing.id !== item.id)].slice(0, 6));
  };

  const queueGenerationSource = (source: GenerationSource) => {
    setGenerationSource(source);
    setSuccessMessage('Your notes are uploaded. myCELIA is preparing the quiz now.');
    setAutoGenerateToken((current) => current + 1);
  };

  const handleFileGenerate = async () => {
    if (isProcessing) {
      return;
    }

    if (!hasSupabaseEnv) {
      setError(getSupabaseBrowserEnvErrorMessage());
      return;
    }

    if (!user) {
      setError('Sign in first. Uploads are tied to your account.');
      return;
    }

    if (!selectedFile) {
      setError('Choose a PDF or image file first.');
      return;
    }

    const kind = classifyFile(selectedFile);

    if (!kind) {
      setError('Upload a PDF or image file only.');
      return;
    }

    setUploading(true);
    setProcessingStep('saving');
    setError('');
    setSuccessMessage('');
    setGenerationSource(null);
    setGenerationResult(null);

    const safeName = sanitizeFileName(selectedFile.name);
    const storagePath = `${user.id}/${Date.now()}-${safeName}`;
    const resolvedTitle = title.trim() || selectedFile.name.replace(/\.[^.]+$/, '');

    const supabase = getSupabaseBrowserClient();
    const { error: uploadError } = await supabase.storage.from(RAW_NOTES_BUCKET).upload(storagePath, selectedFile, {
      cacheControl: '3600',
      upsert: false,
    });

    if (uploadError) {
      setProcessingStep('error');
      setError(
        uploadError.message.includes('bucket')
          ? 'Create the raw-notes bucket in Supabase before uploading files.'
          : 'The file could not be uploaded. Try again.',
      );
      setUploading(false);
      return;
    }

    try {
      const metadataResult = await saveMetadataRecord({
        upload_type: kind,
        title: resolvedTitle,
        original_filename: selectedFile.name,
        mime_type: selectedFile.type || null,
        file_size_bytes: selectedFile.size,
        storage_bucket: RAW_NOTES_BUCKET,
        storage_path: storagePath,
        raw_text: null,
      });

      const savedItem: SavedSourceItem = {
        id: metadataResult.status === 'saved' ? metadataResult.sourceId : storagePath,
        kind,
        label: selectedFile.name,
        status: metadataResult.status,
        detail:
          metadataResult.status === 'saved'
            ? `${formatBytes(selectedFile.size)} - saved and ready`
            : 'Stored in bucket, but metadata table still needs setup',
        storagePath,
        mimeType: selectedFile.type,
        title: resolvedTitle,
      };

      pushSavedItem(savedItem);
      setSelectedFile(null);
      setTitle('');
      queueGenerationSource({
        sourceUploadId: metadataResult.status === 'saved' ? metadataResult.sourceId : undefined,
        inputType: 'storage',
        storagePath,
        mimeType: selectedFile.type,
        title: resolvedTitle,
      });
    } catch (error) {
      setProcessingStep('error');
      setError(
        error instanceof Error
          ? error.message
          : 'The file could not be processed completely. Try a smaller file or pasted text.',
      );
    } finally {
      setUploading(false);
    }
  };

  const handleTextGenerate = async () => {
    if (isProcessing) {
      return;
    }

    if (!hasSupabaseEnv) {
      setError(getSupabaseBrowserEnvErrorMessage());
      return;
    }

    if (!user) {
      setError('Sign in first. Uploads are tied to your account.');
      return;
    }

    if (!textInput.trim()) {
      setError('Paste some notes first.');
      return;
    }

    setUploading(true);
    setProcessingStep('saving');
    setError('');
    setSuccessMessage('');
    setGenerationSource(null);
    setGenerationResult(null);

    const derivedTitle = title.trim() || textInput.trim().slice(0, 48) || 'Pasted notes';
    const normalizedText = textInput.trim();

    try {
      const metadataResult = await saveMetadataRecord({
        upload_type: 'text',
        title: derivedTitle,
        original_filename: null,
        mime_type: 'text/plain',
        file_size_bytes: normalizedText.length,
        storage_bucket: null,
        storage_path: null,
        raw_text: normalizedText,
      });

      const savedItem: SavedSourceItem = {
        id: metadataResult.status === 'saved' ? metadataResult.sourceId : crypto.randomUUID(),
        kind: 'text',
        label: derivedTitle,
        status: metadataResult.status,
        detail:
          metadataResult.status === 'saved'
            ? `${normalizedText.length} characters saved and ready`
            : 'Text captured locally, but metadata table still needs setup',
        rawText: normalizedText,
        title: derivedTitle,
      };

      pushSavedItem(savedItem);
      setTextInput('');
      setTitle('');
      queueGenerationSource({
        sourceUploadId: metadataResult.status === 'saved' ? metadataResult.sourceId : undefined,
        inputType: 'text',
        rawText: normalizedText,
        title: derivedTitle,
      });
    } catch (error) {
      setProcessingStep('error');
      setError(
        error instanceof Error
          ? error.message
          : 'The notes could not be processed completely. Try again.',
      );
    } finally {
      setUploading(false);
    }
  };

  if (authChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0A0F1A] px-6 text-[#F9FAFB]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#C8A44A]" />
          <p className="mt-5 text-sm text-[#9CA3AF]">Checking your session...</p>
        </div>
      </main>
    );
  }

  if (!hasSupabaseEnv) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0A0F1A] px-6 py-10 text-[#F9FAFB] sm:px-8">
        <div className="w-full max-w-2xl">
          <EnvSetupNotice
            detail={getSupabaseBrowserEnvErrorMessage()}
            title="Supabase must be configured before the workspace can load."
          />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0A0F1A] px-6 text-[#F9FAFB]">
        <div className="text-center">
          <p className="text-sm text-[#9CA3AF]">Redirecting you to login...</p>
        </div>
      </main>
    );
  }

  const savedSourceCount = savedItems.length;
  const readyQuizCount = generationResult?.questionCount ?? 0;

  return (
    <main className="min-h-screen bg-[#0A0F1A] px-4 py-5 text-[#F9FAFB] sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.94),rgba(10,15,26,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.38)]">
          <div className="flex flex-col gap-6 px-5 py-6 sm:px-6 sm:py-7 lg:flex-row lg:items-start lg:justify-between lg:px-8 lg:py-8">
            <div className="max-w-3xl">
              <BrandWordmark size="sm" />
              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C8A44A] sm:mt-7 sm:text-xs sm:tracking-[0.32em]">
                UPSC Practice
              </p>
              <h1 className="mt-3 max-w-2xl text-[2rem] font-bold leading-[1.02] tracking-[-0.05em] text-[#F9FAFB] sm:text-[2.6rem] lg:text-5xl">
                Generate MCQs from your notes.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#9CA3AF] sm:text-[15px] sm:leading-7">
                Upload a PDF, image, or pasted notes, choose how many questions you want, and move
                straight into practice.
              </p>
            </div>

            <div className="w-full rounded-[24px] border border-white/10 bg-[#0F1726] px-5 py-4 text-sm text-[#9CA3AF] shadow-[0_20px_80px_rgba(0,0,0,0.3)] sm:max-w-md lg:w-auto">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C8A44A]">
                Session
              </p>
              <p className="mt-2 font-medium text-[#F9FAFB]">Signed in and ready</p>
              <p className="mt-2 max-w-xs text-sm leading-6 text-[#9CA3AF]">
                Your notes and quiz results stay connected to this account so you can generate
                again whenever you need.
              </p>
            </div>
          </div>

          <div className="grid gap-px border-t border-white/5 bg-white/5 sm:grid-cols-3">
            {[
              {
                label: 'Sources uploaded',
                value: savedSourceCount,
                detail: 'Recent notes available in this workspace',
              },
              {
                label: 'MCQ target',
                value: questionCount,
                detail: 'Questions selected for the next quiz',
              },
              {
                label: 'Quiz ready',
                value: readyQuizCount,
                detail: 'Questions prepared in the current session',
              },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#0F1726] px-6 py-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C8A44A]">
                  {stat.label}
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#F9FAFB]">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">{stat.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-6 sm:mt-8 lg:mt-10">
          <div className="mx-auto max-w-4xl space-y-6">
            <section className="rounded-[24px] border border-white/10 bg-[#111827] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#F9FAFB]">Generate MCQs from Your Notes</p>
                  <p className="mt-1 text-sm text-[#9CA3AF]">
                    Upload a source, choose how many questions you want, and let the system prepare your quiz.
                  </p>
                </div>

                <div className="grid w-full grid-cols-2 rounded-2xl border border-white/10 bg-[#0A0F1A] p-1 sm:inline-flex sm:w-auto">
                  <button
                    className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                      mode === 'file'
                        ? 'bg-[#C8A44A] text-[#0A0F1A]'
                        : 'text-[#9CA3AF] hover:text-[#F9FAFB]'
                    }`}
                    onClick={() => {
                      setMode('file');
                      setError('');
                      setSuccessMessage('');
                    }}
                    type="button"
                  >
                    File upload
                  </button>
                  <button
                    className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                      mode === 'text'
                        ? 'bg-[#C8A44A] text-[#0A0F1A]'
                        : 'text-[#9CA3AF] hover:text-[#F9FAFB]'
                    }`}
                    onClick={() => {
                      setMode('text');
                      setError('');
                      setSuccessMessage('');
                    }}
                    type="button"
                  >
                    Paste text
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-medium tracking-[0.025em] text-[#9CA3AF]" htmlFor="source-title">
                    Source title
                  </label>
                  <input
                    id="source-title"
                    className="h-11 w-full rounded-xl border border-white/10 bg-[#1F2937] px-3.5 text-[15px] text-[#F9FAFB] outline-none transition duration-150 ease-in placeholder:text-[#4B5563] focus:border-[rgba(200,164,74,0.5)] focus:shadow-[0_0_0_3px_rgba(200,164,74,0.08)]"
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Laxmikanth Chapter 1 or Medieval history revision"
                    type="text"
                    value={title}
                  />
                </div>

                {isProcessing ? (
                  <ProcessingMyceliaState />
                ) : mode === 'file' ? (
                  <div className="space-y-4">
                    <label
                      className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-[#C8A44A]/28 bg-[linear-gradient(180deg,rgba(200,164,74,0.06),rgba(17,24,39,0.44))] px-5 py-7 text-center transition hover:border-[#C8A44A]/45 hover:bg-[linear-gradient(180deg,rgba(200,164,74,0.08),rgba(17,24,39,0.54))] sm:min-h-[220px] sm:px-6 sm:py-8"
                      htmlFor="source-file"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#C8A44A]/18 bg-[#C8A44A]/10 text-[#C8A44A] shadow-[0_0_24px_rgba(200,164,74,0.08)]">
                        <FileIcon />
                      </span>
                      <span className="mt-5 text-base font-semibold text-[#F9FAFB] sm:text-lg">Drop a PDF or image here</span>
                      <span className="mt-2 max-w-md text-sm leading-6 text-[#9CA3AF]">
                        Upload scanned notes, handwritten pages, or typed PDFs. Files up to 50 MB are supported, and larger PDFs are processed in smaller batches behind the scenes.
                      </span>
                      <span className="mt-5 rounded-lg border border-white/10 bg-[#0A0F1A] px-4 py-2 text-sm font-medium text-[#F9FAFB]">
                        Choose file
                      </span>
                    </label>

                    <input
                      accept=".pdf,image/*"
                      className="sr-only"
                      id="source-file"
                      onChange={(event) => handleFileSelect(event.target.files?.[0] ?? null)}
                      type="file"
                    />

                    {selectedFile ? (
                      <div className="rounded-2xl border border-white/10 bg-[#0A0F1A] px-4 py-3 text-sm text-[#9CA3AF]">
                        <p className="break-all font-medium text-[#F9FAFB]">{selectedFile.name}</p>
                        <p className="mt-1">{formatBytes(selectedFile.size)}</p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-medium tracking-[0.025em] text-[#9CA3AF]" htmlFor="source-text">
                        Pasted notes
                      </label>
                      <textarea
                        id="source-text"
                        className="min-h-[220px] w-full rounded-[24px] border border-white/10 bg-[#1F2937] px-3.5 py-3 text-[15px] leading-7 text-[#F9FAFB] outline-none transition duration-150 ease-in placeholder:text-[#4B5563] focus:border-[rgba(200,164,74,0.5)] focus:shadow-[0_0_0_3px_rgba(200,164,74,0.08)]"
                        onChange={(event) => setTextInput(event.target.value)}
                        placeholder="Paste your UPSC notes here. Example: Fundamental Rights, Directive Principles, key amendments, landmark cases..."
                        value={textInput}
                      />
                    </div>
                  </div>
                )}

                <div className="rounded-[20px] border border-white/8 bg-[#0A0F1A] px-4 py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-[13px] font-medium tracking-[0.025em] text-[#9CA3AF]">
                        How many MCQs do you want?
                      </p>
                      <p className="mt-1 text-sm text-[#6B7280]">
                        Pick a shorter set for quick revision or a longer one for broader coverage.
                      </p>
                    </div>

                    <div className="grid w-full grid-cols-3 gap-2 lg:max-w-[320px]">
                      {QUESTION_COUNT_OPTIONS.map((count) => (
                        <button
                          key={count}
                          className={`flex h-11 items-center justify-center rounded-xl border text-sm font-semibold transition sm:h-12 ${
                            questionCount === count
                              ? 'border-[#C8A44A] bg-[#C8A44A]/10 text-[#C8A44A]'
                              : 'border-white/10 bg-transparent text-[#9CA3AF] hover:text-[#F9FAFB]'
                          }`}
                          onClick={() => setQuestionCount(count)}
                          type="button"
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-[#C8A44A] px-4 text-[15px] font-semibold text-[#0A0F1A] transition duration-150 ease-in hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[#8B6914] sm:h-[52px]"
                  disabled={isProcessing}
                  onClick={() => {
                    if (mode === 'file') {
                      void handleFileGenerate();
                      return;
                    }

                    void handleTextGenerate();
                  }}
                  type="button"
                >
                  {isProcessing ? 'Generating MCQs...' : 'Generate MCQs'}
                </button>

                {error ? (
                  <div className="rounded-xl border border-red-500/30 bg-[rgba(239,68,68,0.1)] px-3.5 py-3 text-[13px] text-red-300">
                    {error}
                  </div>
                ) : null}

                {successMessage ? (
                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-3 text-[13px] text-emerald-300">
                    {successMessage}
                  </div>
                ) : null}
              </div>
            </section>

            <McqGenerationPanel
              autoGenerateToken={autoGenerateToken}
              generationSource={generationSource}
              questionCount={questionCount}
              onError={setError}
              onSuccess={setSuccessMessage}
              onGenerationStart={() => {
                setProcessingStep('building');
              }}
              onGenerationComplete={(result) => {
                setGenerationResult(result);
                setProcessingStep('ready');
              }}
              onGenerationError={() => {
                setProcessingStep('error');
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
