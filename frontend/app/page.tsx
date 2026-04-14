'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient, hasSupabaseBrowserEnv } from '@/lib/supabase/client';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let isActive = true;

    const routeUser = async () => {
      if (!hasSupabaseBrowserEnv()) {
        router.replace('/login');
        return;
      }

      try {
        const {
          data: { session },
        } = await getSupabaseBrowserClient().auth.getSession();

        if (!isActive) {
          return;
        }

        router.replace(session?.user ? '/dashboard' : '/login');
      } catch {
        if (isActive) {
          router.replace('/login');
        }
      }
    };

    void routeUser();

    return () => {
      isActive = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0F1A] px-6 text-[#F9FAFB]">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#C8A44A]" />
        <p className="mt-5 text-sm text-[#9CA3AF]">Restoring your workspace...</p>
      </div>
    </main>
  );
}
