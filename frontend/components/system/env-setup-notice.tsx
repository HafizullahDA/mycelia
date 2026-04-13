type EnvSetupNoticeProps = {
  title: string;
  detail: string;
};

export function EnvSetupNotice({ title, detail }: EnvSetupNoticeProps) {
  return (
    <div className="rounded-[28px] border border-[#C8A44A]/20 bg-[rgba(200,164,74,0.08)] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#C8A44A]">
        Local setup required
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-[#9CA3AF]">{detail}</p>
      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/80">
        <p>Create `frontend/.env.local` with:</p>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-[#E7D29B]">
{`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...`}
        </pre>
      </div>
    </div>
  );
}
