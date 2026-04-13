import { BrandWordmark } from '@/components/brand/wordmark';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0A0F1A] px-6 py-10 text-[#F9FAFB] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <BrandWordmark size="sm" />
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.32em] text-[#C8A44A]">
          Beta terms
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-[#F9FAFB] sm:text-5xl">
          Terms & Conditions
        </h1>
        <div className="mt-8 space-y-4 rounded-[20px] border border-white/10 bg-[#111827] p-6 text-sm leading-7 text-[#9CA3AF] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <p>
            myCELIA is currently a beta product for UPSC preparation workflows. The platform is
            provided for evaluation and testing, and generated study material should always be
            reviewed by the learner before relying on it.
          </p>
          <p>
            You are responsible for the notes, PDFs, and other content you upload. Do not upload
            material that you do not have the right to use, and do not upload sensitive personal
            information unless you are comfortable storing it in the configured project services.
          </p>
          <p>
            We may update, change, or remove beta functionality as the product evolves. Until final
            legal copy is approved, these terms should be treated as interim operating conditions
            for internal testing and early product validation.
          </p>
        </div>
      </div>
    </main>
  );
}
