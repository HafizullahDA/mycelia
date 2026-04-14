'use client';

import Link from 'next/link';
import { Inter } from 'next/font/google';
import { KeyboardEvent, useState } from 'react';
import { BrandWordmark } from '@/components/brand/wordmark';
import {
  consumeBrowserAction,
  resetBrowserAction,
} from '@/lib/supabase/browser-action-throttle';
import {
  getSupabaseBrowserClient,
  getSupabaseBrowserEnvErrorMessage,
} from '@/lib/supabase/client';

const inter = Inter({ subsets: ['latin'] });

const mapAuthError = (message: string): string => {
  if (message.includes('Invalid login credentials')) {
    return 'Incorrect email or password.';
  }

  if (message.includes('Email not confirmed')) {
    return 'Please confirm your email first. Check your inbox.';
  }

  return 'Something went wrong. Try again.';
};

const EyeOpenIcon = () => (
  <svg
    aria-hidden="true"
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const EyeClosedIcon = () => (
  <svg
    aria-hidden="true"
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="m3 3 18 18"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.5"
    />
    <path
      d="M10.584 10.587A2 2 0 0 0 12 14a1.99 1.99 0 0 0 1.414-.586"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="M9.364 5.365A10.477 10.477 0 0 1 12 5c4.477 0 8.268 2.943 9.542 7a10.985 10.985 0 0 1-4.058 5.135"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="M6.228 6.228A10.985 10.985 0 0 0 2.458 12c1.274 4.057 5.065 7 9.542 7 1.74 0 3.376-.445 4.802-1.228"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

const GoogleIcon = () => (
  <svg
    aria-hidden="true"
    className="h-4 w-4"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M21.805 10.023h-9.77v3.955h5.603c-.241 1.271-.965 2.349-2.051 3.073v2.55h3.321c1.944-1.789 3.057-4.428 3.057-7.561 0-.679-.058-1.357-.16-2.017Z"
      fill="#4285F4"
    />
    <path
      d="M12.035 22c2.772 0 5.1-.919 6.799-2.499l-3.321-2.55c-.923.626-2.103.998-3.478.998-2.674 0-4.941-1.805-5.75-4.234H2.853v2.63A10.27 10.27 0 0 0 12.035 22Z"
      fill="#34A853"
    />
    <path
      d="M6.285 13.715a6.15 6.15 0 0 1 0-3.43V7.655H2.853a10.275 10.275 0 0 0 0 9.06l3.432-3Z"
      fill="#FBBC04"
    />
    <path
      d="M12.035 6.051c1.505 0 2.856.518 3.918 1.535l2.936-2.936C17.131 2.99 14.803 2 12.035 2a10.27 10.27 0 0 0-9.182 5.655l3.432 2.63c.809-2.434 3.076-4.234 5.75-4.234Z"
      fill="#EA4335"
    />
  </svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (loading) {
      return;
    }

    if (!email.trim() || !password) {
      setError('Enter both your email and password.');
      return;
    }

    const throttle = consumeBrowserAction({
      action: 'login-password',
      limit: 5,
      windowMs: 60_000,
    });

    if (!throttle.allowed) {
      setError(
        `Too many sign-in attempts. Please wait ${throttle.retryAfterSeconds} seconds and try again.`,
      );
      return;
    }

    setLoading(true);
    setError('');

    let signInError: { message: string } | null = null;

    try {
      const supabase = getSupabaseBrowserClient();
      const response = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      signInError = response.error;
    } catch (clientError) {
      setError(
        clientError instanceof Error ? clientError.message : getSupabaseBrowserEnvErrorMessage(),
      );
      setLoading(false);
      return;
    }

    if (signInError) {
      setError(mapAuthError(signInError.message));
      setLoading(false);
      return;
    }

    resetBrowserAction('login-password');
    window.location.href = '/dashboard';
  };

  const handleGoogleSignIn = async () => {
    if (loading) {
      return;
    }

    const throttle = consumeBrowserAction({
      action: 'login-google',
      limit: 3,
      windowMs: 60_000,
    });

    if (!throttle.allowed) {
      setError(
        `Please wait ${throttle.retryAfterSeconds} seconds before trying Google sign-in again.`,
      );
      return;
    }

    setLoading(true);
    setError('');

    let googleError: { message: string } | null = null;

    try {
      const supabase = getSupabaseBrowserClient();
      const response = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      googleError = response.error;
    } catch (clientError) {
      setError(
        clientError instanceof Error ? clientError.message : getSupabaseBrowserEnvErrorMessage(),
      );
      setLoading(false);
      return;
    }

    if (googleError) {
      setError('Something went wrong. Try again.');
      setLoading(false);
    }
  };

  const handleKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      await handleSubmit();
    }
  };

  return (
    <main
      className={`${inter.className} min-h-screen bg-[#0A0F1A] px-4 py-4 text-[#F9FAFB] sm:px-6 sm:py-6 lg:px-8 lg:py-8`}
    >
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.92),rgba(10,15,26,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.42)] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden border-r border-white/5 lg:flex">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 20% 24%, rgba(200,164,74,0.16), rgba(200,164,74,0.06) 26%, rgba(200,164,74,0) 54%)',
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 top-[56%] bg-[linear-gradient(180deg,rgba(200,164,74,0),rgba(200,164,74,0.04))]"
          />

          <div className="relative z-10 flex min-h-full w-full flex-col px-10 py-10 lg:px-14 lg:py-12">
            <div className="flex items-center justify-between">
              <BrandWordmark />
            </div>

            <div className="my-auto max-w-[36rem]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.36em] text-[#C8A44A]">
                Serious UPSC Prep
              </p>
              <h1 className="mt-5 text-5xl font-bold leading-[1.02] tracking-[-0.05em] text-[#F9FAFB] lg:text-[3.8rem]">
                Build preparation that carries forward every time you return.
              </h1>
              <p className="mt-6 max-w-xl text-[15px] leading-8 text-[#9CA3AF]">
                myCELIA helps serious aspirants turn scattered notes into sustained preparation,
                with every session adding clarity, continuity, and exam-ready practice.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {[
                  ['2200+', 'Tagged PYQ patterns'],
                  ['UPSC', 'Civil Services calibrated'],
                  ['Daily', 'Compounding study loop'],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/8 bg-[rgba(10,15,26,0.42)] px-4 py-4 backdrop-blur"
                  >
                    <p className="text-2xl font-semibold tracking-[-0.04em] text-[#F9FAFB]">{value}</p>
                    <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-full bg-[#0A0F1A]/70 px-5 py-6 sm:px-8 sm:py-8 lg:px-12">
          <div className="mx-auto flex w-full max-w-[390px] flex-col justify-center">
            <div className="mb-8 hidden justify-end text-right text-sm text-[#9CA3AF] lg:flex">
              <span>
                No account yet?{' '}
                <Link
                  className="font-medium text-[#C8A44A] transition hover:text-[#D8B55B]"
                  href="/signup"
                >
                  Create one &rarr;
                </Link>
              </span>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(31,41,55,0.88),rgba(17,24,39,0.96))] px-5 py-6 shadow-[0_24px_70px_rgba(0,0,0,0.32)] sm:px-6 sm:py-7">
              <div className="lg:hidden">
                <BrandWordmark size="sm" />
              </div>

              <div className="mt-6 lg:mt-0">
                <h2 className="text-[28px] font-bold tracking-[-0.04em] text-[#F9FAFB] sm:text-[30px]">
                  Welcome back
                </h2>
                <p className="mt-2 text-sm leading-7 text-[#9CA3AF]">
                  Sign in to continue your preparation.
                </p>
              </div>

              <div className="mt-8 space-y-5">
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
                className="h-11 w-full rounded-xl border border-white/10 bg-[#111827] px-3.5 text-[15px] text-[#F9FAFB] outline-none transition duration-150 ease-in placeholder:text-[#4B5563] focus:border-[rgba(200,164,74,0.5)] focus:shadow-[0_0_0_3px_rgba(200,164,74,0.08)]"
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="you@gmail.com"
                type="email"
                value={email}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  className="block text-[13px] font-medium tracking-[0.025em] text-[#9CA3AF]"
                  htmlFor="password"
                >
                  Password
                </label>
                <Link
                  className="text-[13px] text-[#C8A44A] transition hover:underline"
                  href="/forgot-password"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <input
                  id="password"
                  autoComplete="current-password"
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#111827] px-3.5 pr-11 text-[15px] text-[#F9FAFB] outline-none transition duration-150 ease-in placeholder:text-[#4B5563] focus:border-[rgba(200,164,74,0.5)] focus:shadow-[0_0_0_3px_rgba(200,164,74,0.08)]"
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex h-11 w-11 items-center justify-center rounded-r-xl text-[#4B5563] transition hover:text-[#9CA3AF]"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                </button>
              </div>
            </div>

            {error ? (
              <div className="animate-[fade-in_150ms_ease] rounded-xl border border-red-500/30 bg-[rgba(239,68,68,0.1)] px-3.5 py-3 text-[13px] text-red-300">
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[#EF4444]" />
                  <span>{error}</span>
                </div>
              </div>
            ) : null}

            <button
              className="flex h-11 w-full items-center justify-center rounded-xl bg-[#C8A44A] px-4 text-[15px] font-semibold text-[#0A0F1A] transition duration-150 ease-in hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[#8B6914]"
              disabled={loading}
              onClick={() => {
                void handleSubmit();
              }}
              type="button"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0A0F1A]/30 border-t-[#0A0F1A]" />
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
              </div>

              <div className="my-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-xs uppercase tracking-[0.16em] text-[#4B5563]">or</span>
                <div className="h-px flex-1 bg-white/5" />
              </div>

              <button
                className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-transparent px-4 text-[15px] font-medium text-[#F9FAFB] transition duration-150 ease-in hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={loading}
                onClick={() => {
                  void handleGoogleSignIn();
                }}
                type="button"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </div>

            <div className="mt-8 text-center text-[13px] text-[#9CA3AF] lg:hidden">
              No account yet?{' '}
              <Link
                className="font-medium text-[#C8A44A] transition hover:text-[#D8B55B]"
                href="/signup"
              >
                Create one &rarr;
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
