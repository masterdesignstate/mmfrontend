'use client';

import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { apiService } from '@/services/api';
import { readProfileSearchGrant } from '@/utils/profileSearchGrant';

type Access = 'checking' | 'available' | 'unavailable' | 'error';

function ProfileAccess({ profileId, fromSearch, children }: {
  profileId: string;
  fromSearch: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const [access, setAccess] = useState<Access>('checking');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const grant = fromSearch ? readProfileSearchGrant(profileId) : undefined;
    apiService.getProfileAccess(profileId, grant, controller.signal).then(available => {
      if (!controller.signal.aborted) setAccess(available ? 'available' : 'unavailable');
    }).catch(() => {
      if (!controller.signal.aborted) setAccess('error');
    });
    return () => controller.abort();
  }, [attempt, fromSearch, profileId]);

  const retry = () => {
    setAccess('checking');
    setAttempt(previous => previous + 1);
  };

  useEffect(() => {
    const handlePageshow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setAccess('checking');
        setAttempt(previous => previous + 1);
      }
    };
    window.addEventListener('pageshow', handlePageshow);
    return () => window.removeEventListener('pageshow', handlePageshow);
  }, []);

  if (access === 'available') return children;
  if (access === 'checking') {
    return <div role="status" className="grid min-h-dvh place-items-center bg-white text-sm text-gray-600">Checking profile access…</div>;
  }

  const unavailable = access === 'unavailable';
  return (
    <div className="grid min-h-dvh place-items-center bg-gray-100 px-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-access-title"
        className="w-full max-w-sm rounded-2xl border border-purple-100 bg-white p-6 text-center shadow-lg"
      >
        <h1 id="profile-access-title" className="text-xl font-bold text-gray-950">
          {unavailable ? 'Profile unavailable' : 'Could not check profile access'}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {unavailable ? 'You can return to where you were or go to Results.' : 'Try again or sign in to refresh your session.'}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {unavailable && (
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) router.back();
                else router.replace('/results');
              }}
              className="rounded-full bg-[#672DB7] px-4 py-2 text-sm font-semibold text-white"
            >
              Back
            </button>
          )}
          {!unavailable && (
            <button type="button" onClick={retry} className="rounded-full bg-[#672DB7] px-4 py-2 text-sm font-semibold text-white">
              Try again
            </button>
          )}
          {!unavailable && <Link href="/auth/login" className="text-sm font-semibold text-[#672DB7] underline">Sign in</Link>}
          <Link href="/results" className="rounded-full border border-purple-200 px-4 py-2 text-sm font-semibold text-[#672DB7]">
            Results
          </Link>
        </div>
      </section>
    </div>
  );
}

export default function MemberProfileLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const fromSearch = useSearchParams().get('from') === 'search';
  return (
    <ProfileAccess key={`${pathname}:${fromSearch}`} profileId={id} fromSearch={fromSearch}>
      {children}
    </ProfileAccess>
  );
}
