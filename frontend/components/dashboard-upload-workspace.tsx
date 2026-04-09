'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { BrandWordmark } from '@/components/brand-wordmark';
import { McqGenerationPanel } from '@/components/mcq-generation-panel';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type UploadMode = 'file' | 'text';
type SourceKind = 'pdf' | 'image' | 'text';

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

type ExtractionResult = {
  sourceUploadId?: string;
  title: string;
  extractedText: string;
  keyTopics: string[];
  method: 'normalized_text' | 'gemini_flash';
  characterCount: number;
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

const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024;
const RAW_NOTES_BUCKET = 'raw-notes';

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
      detail: `${textLength} characters saved`,
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
        ? `${formatBytes(row.file_size_bytes)} - ready for extraction`
        : 'Saved in storage and ready for extraction',
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

const TextIcon = () => (
  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.75 6.75h12.5M5.75 11.75h12.5M5.75 16.75h8.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
  </svg>
);

const CheckIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="m5.75 12.25 4 4 8.5-8.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
  </svg>
);

export function DashboardUploadWorkspace() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [mode, setMode] = useState<UploadMode>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loadingSavedItems, setLoadingSavedItems] = useState(false);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [savedItems, setSavedItems] = useState<SavedSourceItem[]>([]);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadSavedItems = async (currentUserId: string) => {
      const supabase = getSupabaseBrowserClient();
      setLoadingSavedItems(true);

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
          setLoadingSavedItems(false);
          return;
        }

        setError('Saved sources could not be loaded. Check Supabase setup.');
        setLoadingSavedItems(false);
        return;
      }

      setSavedItems((data ?? []).map((row) => mapSourceUploadRow(row as SourceUploadRow)));
      setLoadingSavedItems(false);
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
  }, [router]);

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
      setError('Keep files under 12 MB for the first build.');
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

  const handleFileUpload = async () => {
    if (uploading) {
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
    setError('');
    setSuccessMessage('');
    setExtractionResult(null);

    const safeName = sanitizeFileName(selectedFile.name);
    const storagePath = `${user.id}/${Date.now()}-${safeName}`;
    const resolvedTitle = title.trim() || selectedFile.name.replace(/\.[^.]+$/, '');

    const supabase = getSupabaseBrowserClient();
    const { error: uploadError } = await supabase.storage.from(RAW_NOTES_BUCKET).upload(storagePath, selectedFile, {
      cacheControl: '3600',
      upsert: false,
    });

    if (uploadError) {
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

      pushSavedItem({
        id: metadataResult.status === 'saved' ? metadataResult.sourceId : storagePath,
        kind,
        label: selectedFile.name,
        status: metadataResult.status,
        detail:
          metadataResult.status === 'saved'
            ? `${formatBytes(selectedFile.size)} - ready for extraction`
            : 'Stored in bucket, but metadata table still needs setup',
        storagePath,
        mimeType: selectedFile.type,
        title: resolvedTitle,
      });

      setSuccessMessage(
        metadataResult.status === 'saved'
          ? 'Source saved. You can extract it now.'
          : 'File reached storage. Run the Supabase setup SQL to save metadata too.',
      );
      setSelectedFile(null);
      setTitle('');
    } catch {
      setError('The file uploaded, but metadata could not be recorded. Check Supabase setup.');
    } finally {
      setUploading(false);
    }
  };

  const handleTextSave = async () => {
    if (uploading) {
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
    setError('');
    setSuccessMessage('');
    setExtractionResult(null);

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

      pushSavedItem({
        id: metadataResult.status === 'saved' ? metadataResult.sourceId : crypto.randomUUID(),
        kind: 'text',
        label: derivedTitle,
        status: metadataResult.status,
        detail:
          metadataResult.status === 'saved'
            ? `${normalizedText.length} characters saved`
            : 'Text captured locally, but metadata table still needs setup',
        rawText: normalizedText,
        title: derivedTitle,
      });

      setSuccessMessage(
        metadataResult.status === 'saved'
          ? 'Pasted notes saved. You can extract them now.'
          : 'Text is ready, but the metadata table still needs setup SQL.',
      );
      setTextInput('');
      setTitle('');
    } catch {
      setError('The notes could not be saved. Check Supabase table setup and try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleExtract = async (item: SavedSourceItem) => {
    if (extractingId) {
      return;
    }

    setExtractingId(item.id);
    setError('');
    setSuccessMessage('');
    setExtractionResult(null);

    try {
      const payload =
        item.kind === 'text'
          ? {
              inputType: 'text',
              rawText: item.rawText ?? '',
              title: item.title ?? item.label,
            }
          : {
              inputType: 'storage',
              storagePath: item.storagePath,
              mimeType: item.mimeType,
              title: item.title ?? item.label,
            };

      const response = await fetch('/api/extract-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string; result?: Omit<ExtractionResult, 'sourceUploadId'> };

      if (!response.ok || !data.result) {
        setError(data.error ?? 'Extraction failed.');
        return;
      }

      setExtractionResult({
        ...data.result,
        sourceUploadId: item.status === 'saved' ? item.id : undefined,
      });
      setSuccessMessage(
        data.result.method === 'gemini_flash'
          ? 'Extraction complete through Gemini Flash.'
          : 'Text normalized and ready for MCQ generation.',
      );
    } catch {
      setError('Extraction request failed. Try again.');
    } finally {
      setExtractingId(null);
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

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0A0F1A] px-6 text-[#F9FAFB]">
        <div className="text-center">
          <p className="text-sm text-[#9CA3AF]">Redirecting you to login...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0F1A] px-6 py-10 text-[#F9FAFB] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <BrandWordmark size="sm" />
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.32em] text-[#C8A44A]">
              Phase 1 - Sections B, C, D, and E
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-[#F9FAFB] sm:text-5xl">
              Turn saved notes into extracted text, serious UPSC MCQs, and stored quiz results.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#9CA3AF] sm:text-[15px]">
              The workspace now covers the core loop after upload: extraction with Gemini Flash,
              MCQ generation with Gemini 3.1 Pro, quiz attempt, and result persistence.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111827] px-5 py-4 text-sm text-[#9CA3AF] shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C8A44A]">
              Session
            </p>
            <p className="mt-2 font-medium text-[#F9FAFB]">Authenticated and ready to save uploads</p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-[#9CA3AF]">
              File extraction needs `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, and
              `GEMINI_FLASH_MODEL` in the frontend environment.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[20px] border border-white/10 bg-[#111827] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#F9FAFB]">Source workspace</p>
                <p className="mt-1 text-sm text-[#9CA3AF]">
                  Save a source first, then extract it into clean text for question generation.
                </p>
              </div>

              <div className="inline-flex rounded-xl border border-white/10 bg-[#0A0F1A] p-1">
                <button
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
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
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
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
                  className="h-11 w-full rounded-lg border border-white/10 bg-[#1F2937] px-3.5 text-[15px] text-[#F9FAFB] outline-none transition duration-150 ease-in placeholder:text-[#4B5563] focus:border-[rgba(200,164,74,0.5)] focus:shadow-[0_0_0_3px_rgba(200,164,74,0.08)]"
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Laxmikanth Chapter 1 or Medieval history revision"
                  type="text"
                  value={title}
                />
              </div>

              {mode === 'file' ? (
                <div className="space-y-4">
                  <label
                    className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#C8A44A]/28 bg-[linear-gradient(180deg,rgba(200,164,74,0.06),rgba(17,24,39,0.4))] px-6 py-8 text-center transition hover:border-[#C8A44A]/45 hover:bg-[linear-gradient(180deg,rgba(200,164,74,0.08),rgba(17,24,39,0.5))]"
                    htmlFor="source-file"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#C8A44A]/18 bg-[#C8A44A]/10 text-[#C8A44A]">
                      <FileIcon />
                    </span>
                    <span className="mt-5 text-lg font-semibold text-[#F9FAFB]">Drop a PDF or image here</span>
                    <span className="mt-2 max-w-md text-sm leading-6 text-[#9CA3AF]">
                      Upload scanned notes, handwritten pages, or typed PDFs. Keep it under 12 MB
                      for this first build.
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
                    <div className="rounded-xl border border-white/10 bg-[#0A0F1A] px-4 py-3 text-sm text-[#9CA3AF]">
                      <p className="font-medium text-[#F9FAFB]">{selectedFile.name}</p>
                      <p className="mt-1">{formatBytes(selectedFile.size)}</p>
                    </div>
                  ) : null}

                  <button
                    className="flex h-11 w-full items-center justify-center rounded-lg bg-[#C8A44A] px-4 text-[15px] font-semibold text-[#0A0F1A] transition duration-150 ease-in hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[#8B6914]"
                    disabled={uploading}
                    onClick={() => {
                      void handleFileUpload();
                    }}
                    type="button"
                  >
                    {uploading ? 'Saving source...' : 'Save file source'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-medium tracking-[0.025em] text-[#9CA3AF]" htmlFor="source-text">
                      Pasted notes
                    </label>
                    <textarea
                      id="source-text"
                      className="min-h-[220px] w-full rounded-xl border border-white/10 bg-[#1F2937] px-3.5 py-3 text-[15px] leading-7 text-[#F9FAFB] outline-none transition duration-150 ease-in placeholder:text-[#4B5563] focus:border-[rgba(200,164,74,0.5)] focus:shadow-[0_0_0_3px_rgba(200,164,74,0.08)]"
                      onChange={(event) => setTextInput(event.target.value)}
                      placeholder="Paste your UPSC notes here. Example: Fundamental Rights, Directive Principles, key amendments, landmark cases..."
                      value={textInput}
                    />
                  </div>

                  <button
                    className="flex h-11 w-full items-center justify-center rounded-lg bg-[#C8A44A] px-4 text-[15px] font-semibold text-[#0A0F1A] transition duration-150 ease-in hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[#8B6914]"
                    disabled={uploading}
                    onClick={() => {
                      void handleTextSave();
                    }}
                    type="button"
                  >
                    {uploading ? 'Saving source...' : 'Save pasted notes'}
                  </button>
                </div>
              )}

              {error ? (
                <div className="rounded-lg border border-red-500/30 bg-[rgba(239,68,68,0.1)] px-3.5 py-3 text-[13px] text-red-300">
                  {error}
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-3 text-[13px] text-emerald-300">
                  {successMessage}
                </div>
              ) : null}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[20px] border border-white/10 bg-[#111827] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-6">
              <p className="text-sm font-semibold text-[#F9FAFB]">Pipeline status</p>
              <div className="mt-5 space-y-3">
                {[
                  'Extraction route scaffolded',
                  'Pasted text normalization ready',
                  'Gemini Flash file extraction wired',
                  'Dashboard extraction trigger added',
                  'Quiz attempt session added',
                  'Gemini Pro MCQ route added',
                  'Quiz result persistence route added',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-white/8 bg-[#0A0F1A] px-4 py-3 text-sm text-[#9CA3AF]">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-300">
                      <CheckIcon />
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[20px] border border-white/10 bg-[#111827] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-6">
              <p className="text-sm font-semibold text-[#F9FAFB]">Recently saved</p>
              <p className="mt-1 text-sm leading-6 text-[#9CA3AF]">
                Save a source, then extract it into clean text. Text entries work immediately. File
                entries need the Gemini Flash environment variables set.
              </p>

              <div className="mt-5 space-y-3">
                {loadingSavedItems ? (
                  <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-[#4B5563]">
                    Loading your saved sources...
                  </div>
                ) : savedItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-[#4B5563]">
                    No source saved yet. Upload one PDF, image, or pasted note to begin.
                  </div>
                ) : (
                  savedItems.map((item) => (
                    <div key={item.id} className="rounded-xl border border-white/8 bg-[#0A0F1A] px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="mt-0.5 text-[#C8A44A]">{item.kind === 'text' ? <TextIcon /> : <FileIcon />}</span>
                          <div>
                            <p className="text-sm font-medium text-[#F9FAFB]">{item.label}</p>
                            <p className="mt-1 text-xs text-[#6B7280]">{item.detail}</p>
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                            item.status === 'saved'
                              ? 'bg-emerald-500/10 text-emerald-300'
                              : 'bg-amber-500/10 text-amber-300'
                          }`}
                        >
                          {item.status === 'saved' ? 'Saved' : 'Setup'}
                        </span>
                      </div>

                      <button
                        className="mt-4 flex h-10 w-full items-center justify-center rounded-lg border border-white/10 bg-transparent px-4 text-sm font-medium text-[#F9FAFB] transition duration-150 ease-in hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={extractingId !== null || item.status === 'pending_setup'}
                        onClick={() => {
                          void handleExtract(item);
                        }}
                        type="button"
                      >
                        {extractingId === item.id ? 'Extracting...' : 'Extract now'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[20px] border border-white/10 bg-[#111827] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#F9FAFB]">Extraction preview</p>
                {extractionResult ? (
                  <span className="rounded-full bg-[#C8A44A]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C8A44A]">
                    {extractionResult.method === 'gemini_flash' ? 'Gemini Flash' : 'Normalized'}
                  </span>
                ) : null}
              </div>

              {extractionResult ? (
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-[#F9FAFB]">{extractionResult.title}</p>
                    <p className="mt-1 text-xs text-[#6B7280]">{extractionResult.characterCount} characters extracted</p>
                  </div>

                  {extractionResult.keyTopics.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {extractionResult.keyTopics.map((topic) => (
                        <span key={topic} className="rounded-full border border-[#C8A44A]/20 bg-[#C8A44A]/10 px-2.5 py-1 text-[11px] font-medium text-[#E7D29B]">
                          {topic}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="max-h-[260px] overflow-y-auto rounded-xl border border-white/8 bg-[#0A0F1A] px-4 py-3 text-sm leading-7 text-[#C9D1DE]">
                    <pre className="whitespace-pre-wrap font-[system-ui]">{extractionResult.extractedText}</pre>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-[#4B5563]">
                  Extracted notes will appear here once you run the extraction route.
                </div>
              )}
            </section>

            <McqGenerationPanel
              extractionResult={extractionResult}
              onError={setError}
              onSuccess={setSuccessMessage}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}
