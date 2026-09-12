'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import posthog from 'posthog-js';
import OnboardingShell, { OnboardingTitle } from '@/components/OnboardingShell';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
import {
  getNextOnboardingRoute,
  getOnboardingProgressPercent,
  getOnboardingStep,
  getPreviousOnboardingRoute,
} from '@/constants/mandatoryQuestions';
import { getQuestionOptionIcon } from '@/constants/questionIcons';

interface GroupedPickerStepProps {
  questionNumber: number;
  /** Route id of the option's slider page, `/auth/question/<routeId>?<routeId>=<option>`. */
  routeId: string;
  /** Option names exactly as the database stores them, in display order. */
  options: string[];
  /** localStorage record of answered options, written by the slider page on save. */
  storageKey: string;
  /** Lower-case noun for the validation message, e.g. "faith". */
  noun: string;
}

/**
 * A grouped onboarding step with the same list as Ethnicity, Education and Diet: pick an
 * option, answer its sliders on `/auth/question/<routeId>`, come back here.
 */
export default function GroupedPickerStep({ questionNumber, routeId, options, storageKey, noun }: GroupedPickerStepProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = getOnboardingStep(questionNumber);
  const [userId, setUserId] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [answeredOptions, setAnsweredOptions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setUserId(searchParams.get('user_id') || localStorage.getItem('user_id') || '');
  }, [searchParams]);

  useEffect(() => {
    if (!userId) return;
    try {
      const saved = JSON.parse(localStorage.getItem(`${storageKey}_${userId}`) || '[]');
      setAnsweredOptions(new Set(Array.isArray(saved) ? saved : []));
    } catch {
      setAnsweredOptions(new Set());
    }

    // Answers saved from another device, or by the Faith/Ideology backfill, count as answered too.
    fetch(`${getApiUrl(API_ENDPOINTS.ANSWERS)}?user=${userId}&question_number=${questionNumber}&page_size=50`)
      .then(response => (response.ok ? response.json() : { results: [] }))
      .then(data => {
        const names = (data.results || [])
          .map((answer: { question?: { question_name?: string } }) => answer.question?.question_name)
          .filter(Boolean) as string[];
        if (names.length) setAnsweredOptions(prev => new Set([...prev, ...names]));
      })
      .catch(() => {});
  }, [userId, storageKey, questionNumber]);

  const handleSelect = (option: string) => {
    setSelectedOption(option);
    const params = new URLSearchParams({
      user_id: userId,
      [routeId]: option,
      question_number: String(questionNumber),
    });
    router.push(`/auth/question/${routeId}?${params.toString()}`);
  };

  const handleNext = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (answeredOptions.size === 0) {
        setError(`Please answer at least one ${noun} question before proceeding.`);
        return;
      }

      // Track the number as answered so the introcard can resume mid-flow.
      try {
        const key = `onboarding_answered_numbers_v2_${userId}`;
        const existing: number[] = JSON.parse(localStorage.getItem(key) || '[]');
        if (!existing.includes(questionNumber)) {
          existing.push(questionNumber);
          localStorage.setItem(key, JSON.stringify(existing));
        }
      } catch {}

      posthog.capture('onboarding_step_completed', { step: noun, question_number: questionNumber });

      const params = new URLSearchParams({ user_id: userId });
      const nextRoute = getNextOnboardingRoute(questionNumber);
      if (nextRoute) {
        router.push(`${nextRoute}?${params.toString()}`);
      } else {
        // Last mandatory step: unlock the gated pages and hand off to the profile.
        sessionStorage.setItem('show_loading_page', 'true');
        localStorage.setItem(`mandatory_questions_complete_${userId}`, 'true');
        localStorage.removeItem('mandatory_questions_complete');
        posthog.capture('onboarding_completed');
        router.push(`/profile?${params.toString()}`);
      }
    } catch {
      setError(`Failed to check ${noun} answers`);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const params = new URLSearchParams({ user_id: userId });
    router.push(`${getPreviousOnboardingRoute(questionNumber)}?${params.toString()}`);
  };

  return (
    <OnboardingShell
      progressPercent={searchParams.get('from_questions_page') === 'true' ? null : getOnboardingProgressPercent(questionNumber)}
      onBack={handleBack}
      onNext={handleNext}
      nextLabel={searchParams.get('from_questions_page') === 'true' ? 'Save' : 'Next'}
      loadingLabel="Saving..."
      loading={loading}
    >
        <div className="mx-auto w-full max-w-2xl">
          <OnboardingTitle step={`${questionNumber}. ${step?.label ?? ''}`} question={step?.prompt ?? ''} />

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Options List */}
          <div className="space-y-3">
            {options.map((option) => {
              const isAnswered = answeredOptions.has(option);

              return (
                <div
                  key={option}
                  onClick={() => handleSelect(option)}
                  className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedOption === option
                      ? 'border-black bg-gray-50'
                      : isAnswered
                      ? 'border-[#672DB7] bg-purple-50'
                      : 'border-black bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Image
                      src={getQuestionOptionIcon(questionNumber)}
                      alt={`${step?.label ?? ''} icon`}
                      width={24}
                      height={24}
                      className="w-6 h-6"
                    />
                    <span className="text-black font-medium">{option}</span>
                    {isAnswered && (
                      <span className="text-[#672DB7] text-sm">✓ Answered</span>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              );
            })}
          </div>
        </div>
    </OnboardingShell>
  );
}
