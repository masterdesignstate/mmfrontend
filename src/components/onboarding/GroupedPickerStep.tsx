'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import OnboardingShell, { OnboardingTitle } from '@/components/OnboardingShell';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
import {
  getNextOnboardingRoute,
  getOnboardingProgressPercent,
  getOnboardingStep,
  getPreviousOnboardingRoute,
} from '@/constants/mandatoryQuestions';

export interface GroupedOptionQuestion {
  id: string;
  question_name: string;
  question_number: number;
  group_number?: number | null;
  text: string;
  answers: Array<{ value: string; answer_text: string }>;
  open_to_all_me: boolean;
  open_to_all_looking_for: boolean;
}

interface GroupedPickerStepProps {
  questionNumber: number;
  /** Lower-case noun for the validation message, e.g. "faith". */
  noun: string;
  /** The per-option slider page, e.g. "/auth/question/faith". */
  optionRoute: string;
  iconFor: (optionName: string) => string;
  /** Options shown before "Show all options". */
  initialVisible?: number;
}

const byGroupNumber = (a: GroupedOptionQuestion, b: GroupedOptionQuestion) =>
  (a.group_number || 0) - (b.group_number || 0) || a.question_name.localeCompare(b.question_name);

/**
 * An onboarding step answered by picking options of a grouped question — Faith and Ideology.
 * Each option opens its own slider page, which returns here with `just_answered`.
 *
 * Which options are answered comes from the server rather than localStorage: the old Faith
 * page read a localStorage key that nothing wrote, so its Next button could never pass.
 */
export default function GroupedPickerStep({
  questionNumber,
  noun,
  optionRoute,
  iconFor,
  initialVisible = 6,
}: GroupedPickerStepProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = getOnboardingStep(questionNumber);
  const [userId, setUserId] = useState('');
  const [options, setOptions] = useState<GroupedOptionQuestion[]>([]);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setUserId(searchParams.get('user_id') || localStorage.getItem('user_id') || '');
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=${questionNumber}&page_size=50`)
      .then(response => (response.ok ? response.json() : Promise.reject(response.status)))
      .then(data => {
        if (!cancelled) setOptions([...(data.results || [])].sort(byGroupNumber));
      })
      .catch(() => {
        if (!cancelled) setError(`Could not load the ${noun} options. Please try again.`);
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [questionNumber, noun]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    // The option just saved shows as answered before the fetch below returns.
    const justAnswered = searchParams.get('just_answered');
    if (justAnswered) setAnsweredIds(prev => new Set([...prev, justAnswered]));

    fetch(`${getApiUrl(API_ENDPOINTS.ANSWERS)}?user=${userId}&question_number=${questionNumber}&page_size=50`)
      .then(response => (response.ok ? response.json() : { results: [] }))
      .then(data => {
        if (cancelled) return;
        const ids = (data.results || [])
          .map((answer: { question?: { id?: string } | string }) =>
            typeof answer.question === 'object' ? answer.question?.id : answer.question
          )
          .filter(Boolean) as string[];
        setAnsweredIds(prev => new Set([...prev, ...ids]));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, questionNumber, searchParams]);

  const handleSelect = (option: GroupedOptionQuestion) => {
    const params = new URLSearchParams({ user_id: userId, question_data: JSON.stringify(option) });
    router.push(`${optionRoute}?${params.toString()}`);
  };

  const handleNext = () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }
    if (answeredIds.size === 0) {
      setError(`Please answer at least one ${noun} question before continuing.`);
      return;
    }

    // Track the number as answered so the introcard can resume mid-flow.
    try {
      const key = `onboarding_answered_numbers_v2_${userId}`;
      const existing: number[] = JSON.parse(localStorage.getItem(key) || '[]');
      if (!existing.includes(questionNumber)) {
        localStorage.setItem(key, JSON.stringify([...existing, questionNumber]));
      }
    } catch {}

    posthog.capture('onboarding_step_completed', { step: noun, question_number: questionNumber });

    const params = new URLSearchParams({ user_id: userId });
    const nextRoute = getNextOnboardingRoute(questionNumber);
    if (nextRoute) {
      router.push(`${nextRoute}?${params.toString()}`);
      return;
    }

    // Last mandatory step: unlock the gated pages and hand off to the profile, exactly as the
    // single-slider steps do when one of them is last.
    sessionStorage.setItem('show_loading_page', 'true');
    localStorage.setItem(`mandatory_questions_complete_${userId}`, 'true');
    localStorage.removeItem('mandatory_questions_complete');
    posthog.capture('onboarding_completed');
    router.push(`/profile?${params.toString()}`);
  };

  const handleBack = () => {
    const params = new URLSearchParams({ user_id: userId });
    router.push(`${getPreviousOnboardingRoute(questionNumber) ?? '/auth/introcard'}?${params.toString()}`);
  };

  const visibleOptions = showAll ? options : options.slice(0, initialVisible);

  return (
    <OnboardingShell
      progressPercent={getOnboardingProgressPercent(questionNumber)}
      onBack={handleBack}
      onNext={handleNext}
      nextLabel="Next"
    >
      <div className="mx-auto w-full max-w-3xl">
        <OnboardingTitle step={`${questionNumber}. ${step?.label ?? ''}`} question={step?.prompt ?? ''} />

        {error && (
          <div className="mb-4 rounded border border-red-400 bg-red-100 p-3 text-red-700">{error}</div>
        )}

        {loadingOptions ? (
          <p className="text-center text-sm text-gray-500">Loading options…</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {visibleOptions.map(option => {
                const isAnswered = answeredIds.has(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`group flex h-full flex-col justify-between rounded-xl border px-5 py-4 text-left transition-all duration-200 ${
                      isAnswered
                        ? 'border-[#672DB7] bg-purple-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-black hover:shadow'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                        <Image
                          src={iconFor(option.question_name)}
                          alt=""
                          width={32}
                          height={32}
                          className="h-8 w-8 object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-semibold leading-snug text-black">{option.question_name}</p>
                        {isAnswered && (
                          <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-[#672DB7]">
                            <span className="block h-2 w-2 rounded-full bg-[#672DB7]" />
                            Answered
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
                      <span>{isAnswered ? 'Tap to edit' : 'Tap to choose'}</span>
                      <svg
                        className="h-5 w-5 text-gray-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-black"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>

            {options.length > initialVisible && !showAll && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-black transition-colors duration-200 hover:border-black hover:bg-gray-100"
              >
                Show all options
              </button>
            )}
          </div>
        )}
      </div>
    </OnboardingShell>
  );
}
