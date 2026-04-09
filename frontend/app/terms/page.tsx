import { BrandWordmark } from '@/components/brand-wordmark';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0A0F1A] px-6 py-10 text-[#F9FAFB] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <BrandWordmark size="sm" />
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.32em] text-[#C8A44A]">
          Placeholder
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-[#F9FAFB] sm:text-5xl">
          Terms of service
        </h1>
        <div className="mt-8 space-y-4 rounded-[20px] border border-white/10 bg-[#111827] p-6 text-sm leading-7 text-[#9CA3AF] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <p>
            This is a temporary placeholder page so the signup flow does not point to a dead route.
          </p>
          <p>
            Replace it with project-specific legal language before public launch or before collecting
            anything beyond test data.
          </p>
        </div>
      </div>
    </main>
  );
}
