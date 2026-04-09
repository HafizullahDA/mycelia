'use client';

import Link from 'next/link';
import { Inter } from 'next/font/google';
import { KeyboardEvent, useState } from 'react';
import { BrandWordmark } from '@/components/brand-wordmark';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

const inter = Inter({ subsets: ['latin'] });

const mapAuthError = (message: string): string => {
  if (message.includes('Invalid login credentials')) {
    return 'Incorrect email or password.';
  }

  if (message.includes('Email not confirmed')) {
    return 'Please confirm your email first. Check your inbox.';
  }

  if (message.toLowerCase().includes('already registered')) {
    return 'An account with this email already exists. Sign in instead.';
  }

  return 'Something went wrong. Try again.';
};

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

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successEmail, setSuccessEmail] = useState('');

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async () => {
    if (loading) {
      return;
    }

    if (!fullName.trim() || !email.trim() || !password) {
      setError('Fill in your name, email, and password to continue.');
      return;
    }

    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }

    if (!confirmPassword) {
      setError('Confirm your password to continue.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    const supabase = getSupabaseBrowserClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (signUpError) {
      setError(mapAuthError(signUpError.message));
      setLoading(false);
      return;
    }

    setSuccessEmail(email.trim());
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    if (loading) {
      return;
    }

    setLoading(true);
    setError('');

    const supabase = getSupabaseBrowserClient();
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

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
              Start today
            </p>
            <h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-[-0.04em] text-[#F9FAFB]">
              <span className="block">Your notes.</span>
              <span className="mt-1 block text-[#C8A44A]">Your questions.</span>
            </h1>

            <div className="mt-12 space-y-5">
              {[
                'Generates UPSC-style MCQs in 30 seconds',
                'Builds your personal knowledge wiki',
                'Compounds with every session',
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
              <CheckIcon />
              <h2 className="mt-6 text-2xl font-bold tracking-[-0.03em] text-[#F9FAFB]">
                Account created!
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">
                Check your email to confirm your account.
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
                  Already have an account?{' '}
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
                  Create your account
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-[#9CA3AF]">
                  Start preparing smarter today.
                </p>
              </div>

              <div className="mt-10 space-y-5">
                <div className="space-y-1.5">
                  <label
                    className="block text-[13px] font-medium tracking-[0.025em] text-[#9CA3AF]"
                    htmlFor="fullName"
                  >
                    Full name
                  </label>
                  <input
                    id="fullName"
                    autoComplete="name"
                    className="h-11 w-full rounded-lg border border-white/10 bg-[#1F2937] px-3.5 text-[15px] text-[#F9FAFB] outline-none transition duration-150 ease-in placeholder:text-[#4B5563] focus:border-[rgba(200,164,74,0.5)] focus:shadow-[0_0_0_3px_rgba(200,164,74,0.08)]"
                    onChange={(event) => setFullName(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Arjun Sharma"
                    type="text"
                    value={fullName}
                  />
                </div>

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

                <div className="space-y-1.5">
                  <label
                    className="block text-[13px] font-medium tracking-[0.025em] text-[#9CA3AF]"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      autoComplete="new-password"
                      className="h-11 w-full rounded-lg border border-white/10 bg-[#1F2937] px-3.5 pr-11 text-[15px] text-[#F9FAFB] outline-none transition duration-150 ease-in placeholder:text-[#4B5563] focus:border-[rgba(200,164,74,0.5)] focus:shadow-[0_0_0_3px_rgba(200,164,74,0.08)]"
                      onChange={(event) => setPassword(event.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Create a password"
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
                      placeholder="Confirm your password"
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
                      Creating your account...
                    </span>
                  ) : (
                    'Create account'
                  )}
                </button>
              </div>

              <div className="my-8 flex items-center gap-4">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-xs text-[#4B5563]">or</span>
                <div className="h-px flex-1 bg-white/5" />
              </div>

              <button
                className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-white/10 bg-transparent px-4 text-[15px] font-medium text-[#F9FAFB] transition duration-150 ease-in hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={loading}
                onClick={() => {
                  void handleGoogleSignIn();
                }}
                type="button"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <p className="mt-6 text-center text-[11px] leading-5 text-[#4B5563]">
                By creating an account you agree to our{' '}
                <Link className="text-[#C8A44A] transition hover:text-[#D8B55B]" href="/terms">
                  Terms
                </Link>{' '}
                and{' '}
                <Link className="text-[#C8A44A] transition hover:text-[#D8B55B]" href="/privacy">
                  Privacy Policy
                </Link>
              </p>

              <div className="mt-8 text-center text-[13px] text-[#9CA3AF] md:hidden">
                Already have an account?{' '}
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
