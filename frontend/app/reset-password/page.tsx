'use client';

import Link from 'next/link';
import { Inter } from 'next/font/google';
import { KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { BrandWordmark } from '@/components/brand-wordmark';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

const inter = Inter({ subsets: ['latin'] });

const getPasswordStrength = (
  password: string,
): {
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
} => {
  if (!password) {
    return { level: 0, label: 'Use 8+ characters' };
  }

  let score = 0;

  if (password.length >= 8) {
    score += 1;
  }

  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
    score += 1;
  }

  if (/\d/.test(password)) {
    score += 1;
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  }

  if (score <= 1) {
    return { level: 1, label: 'Weak password' };
  }

  if (score === 2) {
    return { level: 2, label: 'Fair password' };
  }

  if (score === 3) {
    return { level: 3, label: 'Good password' };
  }

  return { level: 4, label: 'Strong password' };
};

const mapResetUpdateError = (message: string): string => {
  const normalized = message.toLowerCase();

  if (normalized.includes('same password')) {
    return 'Choose a new password you have not used before.';
  }

  if (normalized.includes('session') || normalized.includes('jwt') || normalized.includes('token')) {
    return 'This reset link has expired. Request a new one.';
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

const CheckIcon = () => (
  <svg
    aria-hidden="true"
    className="h-12 w-12 text-[#10B981]"
    fill="none"
    viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="24" cy="24" r="23" stroke="currentColor" strokeOpacity="0.22" strokeWidth="2" />
    <path
      d="m16 24 5.5 5.5L32.5 18.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="3"
    />
  </svg>
);

type RecoveryStatus = 'checking' | 'ready' | 'invalid' | 'success';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<RecoveryStatus>('checking');

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const passwordStrength = getPasswordStrength(password);

  useEffect(() => {
    const establishRecoverySession = async () => {
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const recoveryType = params.get('type');

      if (accessToken && refreshToken && recoveryType === 'recovery') {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          setStatus('invalid');
          setError('This reset link has expired. Request a new one.');
          return;
        }

        window.history.replaceState(null, '', '/reset-password');
        setStatus('ready');
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setStatus('ready');
        return;
      }

      setStatus('invalid');
      setError('This reset link has expired. Request a new one.');
    };

    void establishRecoverySession();
  }, [supabase]);

  const handleSubmit = async () => {
    if (loading || status !== 'ready') {
      return;
    }

    if (!password || !confirmPassword) {
      setError('Enter and confirm your new password.');
      return;
    }

    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(mapResetUpdateError(updateError.message));
      setLoading(false);
      return;
    }

    setStatus('success');
    setLoading(false);
  };

  const handleKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      await handleSubmit();
    }
  };

  const strengthBars = [
    passwordStrength.level >= 1 ? 'bg-[#EF4444]' : 'bg-white/10',
    passwordStrength.level >= 2 ? 'bg-[#F59E0B]' : 'bg-white/10',
    passwordStrength.level >= 3 ? 'bg-[#C8A44A]' : 'bg-white/10',
    passwordStrength.level >= 4 ? 'bg-[#10B981]' : 'bg-white/10',
  ];

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
              Keep momentum
            </p>
            <h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-[-0.04em] text-[#F9FAFB]">
              <span className="block">Set a new password.</span>
              <span className="mt-1 block text-[#C8A44A]">Resume the climb.</span>
            </h1>

            <div className="mt-12 space-y-5">
              {[
                'Secure link validation built in',
                'Private reset flow for your account',
                'Back to focused study in minutes',
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
          {status === 'checking' ? (
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#C8A44A]" />
              <h2 className="mt-6 text-2xl font-bold tracking-[-0.03em] text-[#F9FAFB]">
                Verifying your reset link
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">
                Hold on for a moment while we prepare a secure session.
              </p>
            </div>
          ) : null}

          {status === 'invalid' ? (
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-[-0.03em] text-[#F9FAFB]">
                Reset link expired
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">
                {error || 'This reset link is no longer valid.'}
              </p>
              <Link
                className="mt-8 flex h-11 w-full items-center justify-center rounded-lg bg-[#C8A44A] px-4 text-[15px] font-semibold text-[#0A0F1A] transition duration-150 ease-in hover:brightness-110"
                href="/forgot-password"
              >
                Request a new link
              </Link>
              <Link className="mt-5 inline-block text-sm text-[#9CA3AF] transition hover:text-[#F9FAFB]" href="/login">
                Back to login
              </Link>
            </div>
          ) : null}

          {status === 'success' ? (
            <div className="flex flex-col items-center text-center">
              <CheckIcon />
              <h2 className="mt-6 text-2xl font-bold tracking-[-0.03em] text-[#F9FAFB]">
                Password updated
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">
                Your account is secure again. You can sign in with your new password now.
              </p>
              <Link
                className="mt-8 flex h-11 w-full items-center justify-center rounded-lg bg-[#C8A44A] px-4 text-[15px] font-semibold text-[#0A0F1A] transition duration-150 ease-in hover:brightness-110"
                href="/login"
              >
                Back to login
              </Link>
            </div>
          ) : null}

          {status === 'ready' ? (
            <>
              <div className="mb-10 hidden justify-end text-right text-sm text-[#9CA3AF] md:flex">
                <span>
                  Need a new link?{' '}
                  <Link
                    className="font-medium text-[#C8A44A] transition hover:text-[#D8B55B]"
                    href="/forgot-password"
                  >
                    Start over &rarr;
                  </Link>
                </span>
              </div>

              <div>
                <h2 className="text-[28px] font-bold tracking-[-0.03em] text-[#F9FAFB]">
                  Create a new password
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-[#9CA3AF]">
                  Choose a strong password so your preparation stays protected.
                </p>
              </div>

              <div className="mt-10 space-y-5">
                <div className="space-y-1.5">
                  <label
                    className="block text-[13px] font-medium tracking-[0.025em] text-[#9CA3AF]"
                    htmlFor="password"
                  >
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      autoComplete="new-password"
                      className="h-11 w-full rounded-lg border border-white/10 bg-[#1F2937] px-3.5 pr-11 text-[15px] text-[#F9FAFB] outline-none transition duration-150 ease-in placeholder:text-[#4B5563] focus:border-[rgba(200,164,74,0.5)] focus:shadow-[0_0_0_3px_rgba(200,164,74,0.08)]"
                      onChange={(event) => setPassword(event.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Create a new password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                    />
                    <button
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 flex h-11 w-11 items-center justify-center rounded-r-lg text-[#4B5563] transition hover:text-[#9CA3AF]"
                      onClick={() => setShowPassword((current) => !current)}
                      type="button"
                    >
                      {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                    </button>
                  </div>
                  <div className="pt-1">
                    <div className="flex gap-1">
                      {strengthBars.map((barClass, index) => (
                        <div key={index} className={`h-0.5 flex-1 rounded-full ${barClass}`} />
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-[#4B5563]">{passwordStrength.label}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    className="block text-[13px] font-medium tracking-[0.025em] text-[#9CA3AF]"
                    htmlFor="confirmPassword"
                  >
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      autoComplete="new-password"
                      className="h-11 w-full rounded-lg border border-white/10 bg-[#1F2937] px-3.5 pr-11 text-[15px] text-[#F9FAFB] outline-none transition duration-150 ease-in placeholder:text-[#4B5563] focus:border-[rgba(200,164,74,0.5)] focus:shadow-[0_0_0_3px_rgba(200,164,74,0.08)]"
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Re-enter your new password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                    />
                    <button
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 flex h-11 w-11 items-center justify-center rounded-r-lg text-[#4B5563] transition hover:text-[#9CA3AF]"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      type="button"
                    >
                      {showConfirmPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                    </button>
                  </div>
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
                      Updating password...
                    </span>
                  ) : (
                    'Update password'
                  )}
                </button>
              </div>

              <div className="mt-8 text-center text-[13px] text-[#9CA3AF] md:hidden">
                Need a new link?{' '}
                <Link
                  className="font-medium text-[#C8A44A] transition hover:text-[#D8B55B]"
                  href="/forgot-password"
                >
                  Start over &rarr;
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
