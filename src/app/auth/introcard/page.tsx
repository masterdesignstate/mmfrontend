'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
import { ONBOARDING_ROUTES, ONBOARDING_STEPS, RELATIONSHIP } from '@/constants/mandatoryQuestions';
import OnboardingShell from '@/components/OnboardingShell';

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

  // `_v2_` because the mandatory block was renumbered from 1-10 to 1-14; a stale list
  // of old numbers would resume onboarding at the wrong step.
  const getLocalKey = (uid: string) => `onboarding_answered_numbers_v2_${uid}`;

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
          const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=${RELATIONSHIP}`;
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

      const nextUnanswered = ONBOARDING_STEPS
        .map(step => step.number)
        .find(qn => !freshSet.has(qn));

      const params = new URLSearchParams({ user_id: userId });

      if (!nextUnanswered) {
        router.push('/feed');
      } else if (nextUnanswered === RELATIONSHIP) {
        params.set('questions', JSON.stringify(questions));
        router.push(`/auth/relationship?${params.toString()}`);
      } else {
        router.push(`${ONBOARDING_ROUTES[nextUnanswered]}?${params.toString()}`);
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

  return (
    <OnboardingShell
      headerTitle="CompatibleFirst"
      progressPercent={25}
      onBack={handleBack}
      onNext={handleNext}
      loading={loading}
    >
      {/* Centered content */}
      <div className="mx-auto w-full max-w-xl">


      {/* Error */}
      {error && (
        <div className="mb-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Feature Grid */}
      <div className="space-y-2 sm:space-y-3">

        {/* Section: Answering Questions */}
        <p className="text-[10px] sm:text-sm font-semibold tracking-widest uppercase text-[#672DB7] px-1">How It Works</p>
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
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
            description="Rate how much each question matters to you"
          />
        </div>

        {/* Section: Controls */}
        <p className="text-[10px] sm:text-sm font-semibold tracking-widest uppercase text-[#672DB7] px-1 pt-1">Question Controls</p>
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          <FeatureCard
            icon={<ToggleIcon on color="#672DB7" />}
            title="Open to All"
            description="You're open to any answer for this question"
          />
          <FeatureCard
            icon={<ToggleIcon on color="#000" />}
            title="Required"
            description="Others must answer this question to match with you"
          />
          <FeatureCard
            icon={<ToggleIcon on color="#000" />}
            title="Share Answer"
            description="Your answer will be visible to other users"
          />
        </div>

        {/* Section: Compatibility */}
        <p className="text-[10px] sm:text-sm font-semibold tracking-widest uppercase text-[#672DB7] px-1 pt-1">Compatibility</p>
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          <FeatureCard
            icon={<ScoreRing pct={87} />}
            title="Overall"
            description="Mutual compatibility between you and your match"
          />
          <FeatureCard
            icon={<ScoreRing pct={92} />}
            title="My preferences"
            description="How well they fit what you're looking for"
          />
          <FeatureCard
            icon={<ScoreRing pct={83} />}
            title="Their preferences"
            description="How well you fit what they're looking for"
          />
        </div>

      </div>

      </div>{/* end centered content */}
    </OnboardingShell>
  );
}

/* ── Subcomponents ── */

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-[#F8F8F8] rounded-2xl p-2.5 sm:p-4 flex flex-col items-start min-h-[104px] sm:min-h-[150px]">
      <div className="mb-2 origin-left scale-75 sm:mb-3 sm:scale-100">{icon}</div>
      <h3 className="text-[11px] sm:text-base font-bold text-gray-900 leading-tight mb-1">{title}</h3>
      <p className="text-[9px] leading-[1.35] sm:text-sm sm:leading-relaxed text-gray-500">{description}</p>
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
