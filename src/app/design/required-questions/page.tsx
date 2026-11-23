'use client';

import OnboardingShell from '@/components/OnboardingShell';
import { ONBOARDING_STEPS } from '@/constants/mandatoryQuestions';

/**
 * Unsaved preview of a step before the questions begin. It lists every required
 * onboarding question in order, using the same titles and prompts as the real flow.
 */
export default function RequiredQuestionsSamplePage() {
  return (
    <OnboardingShell headerTitle="CompatibleFirst" onNext={() => {}} nextLabel="Start">
      <div className="mx-auto w-full max-w-xl pb-2">
        <div className="mb-4 text-center sm:mb-6">
          <p className="text-[10px] font-semibold tracking-widest text-[#672DB7] uppercase sm:text-sm">
            Before you start
          </p>
          <h1 className="mt-1 text-lg font-bold text-black sm:text-2xl lg:text-3xl">
            Required questions
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
            Everyone answers these before their profile can appear in Results. You’ll answer each
            one for yourself and for your ideal match.
          </p>
          <p className="mt-3 text-xs font-semibold text-gray-900 sm:text-sm">
            {ONBOARDING_STEPS.length} questions
          </p>
        </div>

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

        <p className="mt-4 text-center text-xs text-gray-400 sm:text-sm">
          Optional questions come after these.
        </p>
      </div>
    </OnboardingShell>
  );
}
