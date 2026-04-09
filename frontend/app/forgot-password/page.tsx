'use client';

import Link from 'next/link';
import { Inter } from 'next/font/google';
import { KeyboardEvent, useState } from 'react';
import { BrandWordmark } from '@/components/brand-wordmark';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

const inter = Inter({ subsets: ['latin'] });

const mapResetError = (message: string): string => {
  if (message.toLowerCase().includes('rate limit')) {
    return 'Too many attempts. Please wait a minute and try again.';
  }

  if (message.toLowerCase().includes('email')) {
    return 'Enter a valid email address.';
  }

  return 'Something went wrong. Try again.';
};

const MailIcon = () => (
  <svg
    aria-hidden="true"
    className="h-12 w-12 text-[#10B981]"
    fill="none"
    viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="6"
      y="10"
      width="36"
      height="28"
      rx="8"
      stroke="currentColor"
      strokeOpacity="0.28"
      strokeWidth="2"
    />
    <path
      d="m12 16 12 9 12-9"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
    />
  </svg>
);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successEmail, setSuccessEmail] = useState('');

  const handleSubmit = async () => {
    if (loading) {
      return;
    }

    if (!email.trim()) {
      setError('Enter the email linked to your account.');
      return;
    }

    setLoading(true);
    setError('');

    const supabase = getSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError(mapResetError(resetError.message));
      setLoading(false);
      return;
    }

    setSuccessEmail(email.trim());
    setLoading(false);
  };

  const handleKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      await handleSubmit();
    }
  };

  return (
    <main
      className={`${inter.className} min-h-screen bg-[#0A0F1A] text-[#F9FAFB] md:grid md:grid-cols-2`}
    >
      <section className="relative hidden overflow-hidden border-r border-white/5 bg-gradient-to-br from-[#0A0F1A] via-[#0E1522] to-[#111827] md:flex">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-[-20%] w-[75%] blur-3xl"
          style={{
            background:
              'radial-gradient(circle at center, rgba(200,164,74,0.15) 0%, rgba(200,164,74,0.08) 28%, rgba(200,164,74,0) 68%)',
          }}
        />

        <div className="relative z-10 flex min-h-screen w-full flex-col px-12 py-10 lg:px-16 lg:py-12">
          <div className="inline-flex items-baseline gap-0.5 text-[#C8A44A]">
            <span className="text-[0.78rem] font-medium tracking-[0.18em] text-[#C8A44A]/88">my</span>
            <span className="text-[1.05rem] font-semibold tracking-[0.22em]">CELIA</span>
          </div>

          <div className="my-auto max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#C8A44A]">
              Secure access
            </p>
            <h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-[-0.04em] text-[#F9FAFB]">
              <span className="block">Reset access.</span>
              <span className="mt-1 block text-[#C8A44A]">Stay consistent.</span>
            </h1>

            <div className="mt-12 space-y-5">
              {[
                'Password reset in a few clicks',
                'Built for focused UPSC preparation',
                'Get back to your session fast',
              ].map((item) => (
                <div
                  key={item}
                  className="border-l border-[#C8A44A]/35 pl-4 text-sm leading-6 text-[#9CA3AF]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen bg-[#0A0F1A] px-6 py-8 sm:px-8 md:px-12">
        <div className="mx-auto flex w-full max-w-[380px] flex-col justify-center">
          {successEmail ? (
            <div className="flex flex-col items-center text-center">
              <MailIcon />
              <h2 className="mt-6 text-2xl font-bold tracking-[-0.03em] text-[#F9FAFB]">
                Check your email
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">
                We sent a secure password reset link to:
              </p>
              <p className="mt-3 text-sm font-medium text-[#C8A44A]">{successEmail}</p>
              <a
                className="mt-8 flex h-11 w-full items-center justify-center rounded-lg bg-[#C8A44A] px-4 text-[15px] font-semibold text-[#0A0F1A] transition duration-150 ease-in hover:brightness-110"
                href="https://mail.google.com"
                rel="noreferrer"
                target="_blank"
              >
                Open Gmail &rarr;
              </a>
              <Link className="mt-5 text-sm text-[#9CA3AF] transition hover:text-[#F9FAFB]" href="/login">
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-10 hidden justify-end text-right text-sm text-[#9CA3AF] md:flex">
                <span>
                  Remembered it?{' '}
                  <Link
                    className="font-medium text-[#C8A44A] transition hover:text-[#D8B55B]"
                    href="/login"
                  >
                    Sign in &rarr;
                  </Link>
                </span>
              </div>

              <div>
                <h2 className="text-[28px] font-bold tracking-[-0.03em] text-[#F9FAFB]">
                  Reset your password
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-[#9CA3AF]">
                  Enter your email and we&apos;ll send you a secure reset link.
                </p>
              </div>

              <div className="mt-10 space-y-5">
                <div className="space-y-1.5">
                  <label
                    className="block text-[13px] font-medium tracking-[0.025em] text-[#9CA3AF]"
                    htmlFor="email"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    autoComplete="email"
                    className="h-11 w-full rounded-lg border border-white/10 bg-[#1F2937] px-3.5 text-[15px] text-[#F9FAFB] outline-none transition duration-150 ease-in placeholder:text-[#4B5563] focus:border-[rgba(200,164,74,0.5)] focus:shadow-[0_0_0_3px_rgba(200,164,74,0.08)]"
                    onChange={(event) => setEmail(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="you@gmail.com"
                    type="email"
                    value={email}
                  />
                </div>

                {error ? (
                  <div className="animate-[fade-in_150ms_ease] rounded-lg border border-red-500/30 bg-[rgba(239,68,68,0.1)] px-3.5 py-3 text-[13px] text-red-300">
                    <div className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-[#EF4444]" />
                      <span>{error}</span>
                    </div>
                  </div>
                ) : null}

                <button
                  className="flex h-11 w-full items-center justify-center rounded-lg bg-[#C8A44A] px-4 text-[15px] font-semibold text-[#0A0F1A] transition duration-150 ease-in hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[#8B6914]"
                  disabled={loading}
                  onClick={() => {
                    void handleSubmit();
                  }}
                  type="button"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0A0F1A]/30 border-t-[#0A0F1A]" />
                      Sending reset link...
                    </span>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </div>

              <div className="mt-8 text-center text-[13px] text-[#9CA3AF] md:hidden">
                Remembered it?{' '}
                <Link
                  className="font-medium text-[#C8A44A] transition hover:text-[#D8B55B]"
                  href="/login"
                >
                  Sign in &rarr;
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
