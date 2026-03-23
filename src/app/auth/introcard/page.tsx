'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

export default function IntroCardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string>('');
  const [questions, setQuestions] = useState<Array<{
    id: string;
    question_name: string;
    question_number: number;
    group_name: string;
    text: string;
    answers: Array<{ value: string; answer_text: string }>;
    open_to_all_me: boolean;
    open_to_all_looking_for: boolean;
  }>>([]);

  const [answeredNumbers, setAnsweredNumbers] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Question number → route mapping for mandatory questions
  const QUESTION_ROUTES: Record<number, string> = {
    1: '/auth/relationship',
    2: '/auth/gender',
    3: '/auth/ethnicity',
    4: '/auth/education',
    5: '/auth/diet',
    6: '/auth/question/6',
    7: '/auth/habits',
    8: '/auth/question/8',
    9: '/auth/question/9',
    10: '/auth/kids',
  };

  const getLocalKey = (uid: string) => `onboarding_answered_numbers_${uid}`;

  const getLocalAnswered = (uid: string): number[] => {
    try {
      return JSON.parse(localStorage.getItem(getLocalKey(uid)) || '[]');
    } catch { return []; }
  };

  useEffect(() => {
    const userIdParam = searchParams.get('user_id');
    const answeredParam = searchParams.get('answered');

    const resolvedUserId = userIdParam || localStorage.getItem('user_id') || '';
    if (resolvedUserId) {
      setUserId(resolvedUserId);
    }

    const localNums = resolvedUserId ? getLocalAnswered(resolvedUserId) : [];
    const merged = new Set<number>(localNums);

    if (answeredParam) {
      try {
        const parsed = JSON.parse(answeredParam) as number[];
        parsed.forEach(n => merged.add(n));
      } catch { /* ignore */ }
      setAnsweredNumbers(merged);
    } else if (resolvedUserId) {
      setAnsweredNumbers(merged);
      fetch(getApiUrl(`/users/${resolvedUserId}/`))
        .then(res => res.ok ? res.json() : null)
        .then(userData => {
          if (userData?.email) {
            return fetch(getApiUrl(API_ENDPOINTS.ONBOARDING_STATUS), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: userData.email })
            });
          }
          return null;
        })
        .then(res => res?.ok ? res.json() : null)
        .then(data => {
          if (data?.answered_mandatory_numbers) {
            const backendNums = data.answered_mandatory_numbers as number[];
            backendNums.forEach(n => merged.add(n));
          }
          setAnsweredNumbers(new Set(merged));
          localStorage.setItem(getLocalKey(resolvedUserId), JSON.stringify([...merged]));
        })
        .catch(() => {});
    }
  }, [searchParams]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && userId) {
        const freshNums = getLocalAnswered(userId);
        if (freshNums.length > 0) {
          setAnsweredNumbers(prev => {
            const updated = new Set(prev);
            freshNums.forEach(n => updated.add(n));
            return updated;
          });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleFocus = () => {
      if (userId) {
        const freshNums = getLocalAnswered(userId);
        if (freshNums.length > 0) {
          setAnsweredNumbers(prev => {
            const updated = new Set(prev);
            freshNums.forEach(n => updated.add(n));
            return updated;
          });
        }
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [userId]);

  useEffect(() => {
    const fetchRelationshipQuestions = async () => {
      if (userId && questions.length === 0) {
        try {
          const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=1`;
          const response = await fetch(apiUrl);
          if (response.ok) {
            const data = await response.json();
            const sortedQuestions = (data.results || []).sort((a: { group_number?: number }, b: { group_number?: number }) => {
              return (a.group_number || 0) - (b.group_number || 0);
            });
            setQuestions(sortedQuestions);
          }
        } catch (error) {
          console.error('Error fetching questions:', error);
        }
      }
    };
    fetchRelationshipQuestions();
  }, [userId, questions.length]);

  const handleNext = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const freshLocal = getLocalAnswered(userId);
      const freshSet = new Set<number>([...answeredNumbers, ...freshLocal]);

      const allMandatoryNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const nextUnanswered = allMandatoryNumbers.find(qn => !freshSet.has(qn));

      const params = new URLSearchParams({ user_id: userId });

      if (!nextUnanswered) {
        router.push('/results');
      } else if (nextUnanswered === 1) {
        params.set('questions', JSON.stringify(questions));
        router.push(`/auth/relationship?${params.toString()}`);
      } else {
        const route = QUESTION_ROUTES[nextUnanswered];
        router.push(`${route}?${params.toString()}`);
      }
    } catch (error) {
      console.error('Error navigating:', error);
      setError(error instanceof Error ? error.message : 'Failed to navigate');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const params = new URLSearchParams({ user_id: userId });
    router.push(`/auth/personal-details?${params.toString()}`);
  };

  // Check if user came from hamburger menu (already completed onboarding)
  const isReturningUser = typeof window !== 'undefined' && localStorage.getItem('mandatory_questions_complete') === 'true';

  return (
    <div className="min-h-screen bg-white pb-24 flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <Image src="/assets/mmlogox.png" alt="Logo" width={32} height={32} />
        <h1 className="text-base font-semibold text-gray-900">Matchmatical</h1>
        <div className="w-8" />
      </div>

      {/* Centered content */}
      <div className="flex-1 flex flex-col justify-center max-w-xl w-full mx-auto px-5">


      {/* Error */}
      {error && (
        <div className="mx-6 mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Feature Grid */}
      <div className="space-y-3">

        {/* Section: Answering Questions */}
        <p className="text-sm font-semibold tracking-widest uppercase text-[#672DB7] px-1">How It Works</p>
        <div className="grid grid-cols-3 gap-2.5">
          <FeatureCard
            icon={
              <svg className="w-5 h-5 text-[#672DB7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="1–5 Answers"
            description="Answer questions on a 1 to 5 scale"
          />
          <FeatureCard
            icon={
              <svg className="w-5 h-5 text-[#672DB7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            }
            title="Me & Them"
            description="Answer for yourself and what you want in a match"
          />
          <FeatureCard
            icon={
              <svg className="w-5 h-5 text-[#672DB7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
            }
            title="Importance"
            description="Rate how much each question matters to you from 1–5"
          />
        </div>

        {/* Section: Controls */}
        <p className="text-sm font-semibold tracking-widest uppercase text-[#672DB7] px-1 pt-1">Question Controls</p>
        <div className="grid grid-cols-3 gap-2.5">
          <FeatureCard
            icon={<ToggleIcon on color="#672DB7" />}
            title="Open to All"
            description="You're open to any answer for this question"
          />
          <FeatureCard
            icon={<ToggleIcon on color="#000" />}
            title="Required"
            description="Your match must answer this question to see you"
          />
          <FeatureCard
            icon={<ToggleIcon on color="#000" />}
            title="Share Answer"
            description="Your answer will be visible to other users"
          />
        </div>

        {/* Section: Compatibility */}
        <p className="text-sm font-semibold tracking-widest uppercase text-[#672DB7] px-1 pt-1">Compatibility</p>
        <div className="grid grid-cols-3 gap-2.5">
          <FeatureCard
            icon={<ScoreRing pct={87} />}
            title="Overall"
            description="Mutual compatibility between you and your match"
          />
          <FeatureCard
            icon={<ScoreRing pct={92} />}
            title="Compatible with Me"
            description="How well they fit what you're looking for"
          />
          <FeatureCard
            icon={<ScoreRing pct={83} />}
            title="I'm Compatible with"
            description="How well you fit what they're looking for"
          />
        </div>

      </div>

      </div>{/* end centered content */}

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        {!isReturningUser && (
          <div className="w-full h-1 bg-gray-200">
            <div className="h-full bg-black" style={{ width: '25%' }}></div>
          </div>
        )}

        <div className="flex justify-between items-center px-6 py-4">
          {isReturningUser ? (
            <>
              <div />
              <button
                onClick={() => router.back()}
                className="px-8 py-3 rounded-full bg-black text-white font-medium hover:bg-gray-800 cursor-pointer transition-colors"
              >
                Got it
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleBack}
                className="text-gray-900 font-medium hover:text-gray-500 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={loading}
                className={`px-8 py-3 rounded-md font-medium transition-colors ${
                  !loading
                    ? 'bg-black text-white hover:bg-gray-800 cursor-pointer'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Loading...
                  </div>
                ) : 'Next'}
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}

/* ── Subcomponents ── */

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-[#F8F8F8] rounded-2xl p-4 flex flex-col items-start min-h-[150px]">
      <div className="mb-3">{icon}</div>
      <h3 className="text-base font-bold text-gray-900 leading-tight mb-1">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

function ToggleIcon({ on, color }: { on: boolean; color: string }) {
  return (
    <div className="w-11 h-6 rounded-full relative" style={{ backgroundColor: on ? color : '#ADADAD' }}>
      <div
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
        style={{ left: on ? '22px' : '2px' }}
      />
    </div>
  );
}

function ScoreRing({ pct }: { pct: number }) {
  const offset = 100 - pct;
  return (
    <div className="relative w-10 h-10">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="2.5" />
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#672DB7" strokeWidth="2.5" strokeDasharray="100" strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-black text-[#672DB7]">{pct}%</span>
      </div>
    </div>
  );
}
