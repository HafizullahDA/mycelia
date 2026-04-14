import { BrandWordmark } from '@/components/brand/wordmark';

const DEFAULT_STATS = [
  ['2200+', 'Tagged PYQ patterns'],
  ['UPSC', 'Civil Services calibrated'],
  ['Daily', 'Compounding study loop'],
] as const;

type AuthMobileHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function AuthMobileHero({ eyebrow, title, description }: AuthMobileHeroProps) {
  return (
    <section className="mb-6 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.94),rgba(10,15,26,0.98))] px-5 py-6 shadow-[0_20px_70px_rgba(0,0,0,0.32)] lg:hidden">
      <BrandWordmark size="sm" />
      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C8A44A]">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-[2rem] font-bold leading-[1.02] tracking-[-0.05em] text-[#F9FAFB]">
        {title}
      </h1>
      <p className="mt-4 text-sm leading-7 text-[#9CA3AF]">{description}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {DEFAULT_STATS.map(([value, label]) => (
          <div
            key={label}
            className="rounded-2xl border border-white/8 bg-[rgba(10,15,26,0.42)] px-4 py-4 backdrop-blur"
          >
            <p className="text-2xl font-semibold tracking-[-0.04em] text-[#F9FAFB]">{value}</p>
            <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
