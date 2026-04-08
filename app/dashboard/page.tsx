import { BrandWordmark } from '@/components/brand-wordmark';

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#0A0F1A] px-6 py-12 text-[#F9FAFB]">
      <div className="mx-auto max-w-5xl">
        <BrandWordmark size="sm" />
        <h1 className="mt-4 text-4xl font-bold tracking-[-0.03em]">Dashboard</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#9CA3AF]">
          Authentication is wired. This placeholder exists so the login and signup flows have a
          valid destination after successful sign-in.
        </p>
      </div>
    </main>
  );
}