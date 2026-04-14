import type { ReactNode } from 'react';

type BrandWordmarkProps = {
  size?: 'sm' | 'md';
  className?: string;
  accent?: ReactNode;
};

const sizeClasses = {
  sm: {
    wrap: 'gap-0.5',
    my: 'text-[0.72rem] tracking-[0.16em]',
    celia: 'text-sm tracking-[0.22em]',
    rule: 'mt-1 h-px w-14 bg-gradient-to-r from-[#C8A44A]/70 via-[#C8A44A]/20 to-transparent',
    mark: 'h-7 w-7',
    markLine: 'h-4 w-px',
    markCross: 'h-px w-4',
    markDot: 'h-1.5 w-1.5',
  },
  md: {
    wrap: 'gap-0.5',
    my: 'text-[0.78rem] tracking-[0.18em]',
    celia: 'text-[1.05rem] tracking-[0.24em]',
    rule: 'mt-1.5 h-px w-16 bg-gradient-to-r from-[#C8A44A]/70 via-[#C8A44A]/20 to-transparent',
    mark: 'h-8 w-8',
    markLine: 'h-4.5 w-px',
    markCross: 'h-px w-4.5',
    markDot: 'h-1.5 w-1.5',
  },
} as const;

export function BrandWordmark({ size = 'md', className = '', accent }: BrandWordmarkProps) {
  const styles = sizeClasses[size];

  return (
    <div className={`inline-flex flex-col ${className}`.trim()}>
      <div className="inline-flex items-center gap-3">
        <span
          className={`relative flex items-center justify-center rounded-full border border-[#C8A44A]/18 bg-[#C8A44A]/[0.07] shadow-[0_0_24px_rgba(200,164,74,0.08)] ${styles.mark}`}
        >
          <span className={`absolute -rotate-45 bg-[#C8A44A]/80 ${styles.markLine}`} />
          <span className={`absolute rotate-45 bg-[#C8A44A]/80 ${styles.markLine}`} />
          <span className={`absolute rotate-45 bg-[#C8A44A]/65 ${styles.markCross}`} />
          <span className={`absolute -rotate-45 bg-[#C8A44A]/65 ${styles.markCross}`} />
          <span className={`rounded-full bg-[#C8A44A] ${styles.markDot}`} />
        </span>

        <div className={`inline-flex items-baseline text-[#C8A44A] ${styles.wrap}`}>
          <span className={`${styles.my} font-medium text-[#C8A44A]/86`}>my</span>
          <span className={`${styles.celia} font-semibold`}>CELIA</span>
        </div>
      </div>
      <div className={styles.rule} />
      {accent ? <div className="mt-2">{accent}</div> : null}
    </div>
  );
}
