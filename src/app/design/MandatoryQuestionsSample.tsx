'use client';

import OnboardingShell from '@/components/OnboardingShell';
import { ONBOARDING_STEPS } from '@/constants/mandatoryQuestions';

type Variant = 'list' | 'cards' | 'modern';

/**
 * Unsaved preview of a step before the questions begin. It lists every mandatory
 * onboarding question in order. Three layouts, same titles and prompts.
 */
export default function MandatoryQuestionsSample({ variant }: { variant: Variant }) {
  return (
    <OnboardingShell headerTitle="CompatibleFirst" onNext={() => {}} nextLabel="Start">
      <div className="mx-auto w-full max-w-xl pb-2">
        <div className="mb-4 text-center sm:mb-6">
          <h1 className="text-lg font-bold text-black sm:text-2xl lg:text-3xl">Mandatory questions</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
            Everyone answers these before their profile can appear in Results. You’ll answer each
            one for yourself and for your ideal match.
          </p>
          <p className="mt-3 text-xs font-semibold text-gray-900 sm:text-sm">
            {ONBOARDING_STEPS.length} questions
          </p>
        </div>

        {variant === 'list' && <ListLayout />}
        {variant === 'cards' && <CardsLayout />}
        {variant === 'modern' && <ModernLayout />}
      </div>
    </OnboardingShell>
  );
}

function ListLayout() {
  return (
    <ol className="space-y-2">
      {ONBOARDING_STEPS.map((step) => (
        <li
          key={step.number}
          className="flex items-start gap-3 rounded-2xl bg-[#F8F8F8] px-3.5 py-3 sm:px-4"
        >
          <span className="w-6 shrink-0 pt-0.5 text-sm font-bold tabular-nums text-[#672DB7]">
            {step.number}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 sm:text-base">{step.label}</p>
            <p className="mt-0.5 text-xs leading-snug text-gray-500 sm:text-sm">{step.prompt}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Same row as the Questions page: gray border, number, prompt, chevron. */
function CardsLayout() {
  return (
    <ol className="space-y-2">
      {ONBOARDING_STEPS.map((step) => (
        <li
          key={step.number}
          className="relative flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-3 sm:gap-3 sm:px-4 sm:py-4"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-start">
              <span className="mr-1.5 shrink-0 text-xs text-gray-500 sm:mr-3 sm:text-sm">
                {step.number}.
              </span>
              <span className="text-sm text-gray-900 sm:text-base">{step.prompt}</span>
            </div>
          </div>
          <svg
            className="hidden h-5 w-5 shrink-0 text-gray-400 sm:block"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </li>
      ))}
    </ol>
  );
}

function ModernLayout() {
  return (
    <ol className="overflow-hidden rounded-2xl border border-[#ECECEC] bg-white">
      {ONBOARDING_STEPS.map((step, index) => (
        <li
          key={step.number}
          className={`flex items-center gap-4 px-4 py-3.5 sm:px-5 ${
            index === ONBOARDING_STEPS.length - 1 ? '' : 'border-b border-[#F0F0F0]'
          }`}
        >
          <span className="w-6 shrink-0 text-sm font-semibold tabular-nums text-[#672DB7]">
            {String(step.number).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-950 sm:text-[15px]">{step.label}</p>
            <p className="mt-0.5 text-xs leading-snug text-gray-500 sm:text-sm">{step.prompt}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
