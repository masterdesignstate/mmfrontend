'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import {
  MobileQuestionActionDock,
  MobileQuestionActionsProvider,
} from '@/components/MobileQuestionActions';

interface OnboardingShellProps {
  children: ReactNode;
  /** 0–100. Omit to hide the progress bar (e.g. when editing from the questions page). */
  progressPercent?: number | null;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  loadingLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  /** Extra classes for the scrollable content area. */
  contentClassName?: string;
  /** Optional brand text centred in the header (used by the intro card). */
  headerTitle?: string;
  /** One note for the whole question, independent of its Me/Them answer rows. */
  questionNote?: string;
  onQuestionNoteChange?: (note: string) => void;
}

/**
 * App shell for every onboarding step.
 *
 * The footer is in-flow and `shrink-0` while the content area is the only scroller, so the
 * Next button is always on screen. The pages used to pair a `fixed bottom-0` footer with a
 * `min-h-[calc(100vh-80px)]` main, which let content run underneath the buttons.
 * `100dvh` (not `100vh`) keeps that true while mobile browser chrome shows and hides.
 */
export default function OnboardingShell({
  children,
  progressPercent = null,
  onBack,
  onNext,
  nextLabel = 'Next',
  loadingLabel = 'Loading...',
  loading = false,
  disabled = false,
  contentClassName = '',
  headerTitle,
  questionNote,
  onQuestionNoteChange,
}: OnboardingShellProps) {
  const questionNoteControl = onQuestionNoteChange
    ? { value: questionNote || '', onChange: onQuestionNoteChange }
    : undefined;

  return (
    <MobileQuestionActionsProvider questionNote={questionNoteControl}>
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-white">
        <div
          className={`flex shrink-0 items-center justify-between p-3 sm:p-4 ${
            headerTitle ? 'border-b border-gray-100' : ''
          }`}
        >
          <Image src="/assets/mmlogox.png" alt="Logo" width={32} height={32} />
          {headerTitle && (
            <>
              <h1 className="text-sm font-semibold text-gray-900 sm:text-base">{headerTitle}</h1>
              <div className="w-8" />
            </>
          )}
        </div>

        {/* The last section's bottom margin sits below the content but still counts toward
            scrollHeight, so a page that otherwise fits produced a few pixels of scroll and a
            scrollbar that moved nothing. Drop it; the pane's own padding closes the page. */}
        <main
          className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 [&>*>*:last-child]:mb-0 sm:px-6 sm:py-4 ${contentClassName}`}
        >
          {children}
        </main>

        <MobileQuestionActionDock />

        <footer className="shrink-0 border-t border-gray-200 bg-white">
          {progressPercent !== null && (
            <div className="h-1 w-full bg-gray-200">
              <div className="h-full bg-black" style={{ width: `${progressPercent}%` }} />
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="cursor-pointer font-medium text-gray-900 transition-colors hover:text-gray-500"
              >
                Back
              </button>
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={onNext}
              disabled={loading || disabled}
              className={`rounded-md px-8 py-3 font-medium transition-colors ${
                !loading && !disabled
                  ? 'cursor-pointer bg-black text-white hover:bg-gray-800'
                  : 'cursor-not-allowed bg-gray-300 text-gray-500'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                  {loadingLabel}
                </span>
              ) : (
                nextLabel
              )}
            </button>
          </div>
        </footer>
      </div>
    </MobileQuestionActionsProvider>
  );
}

/** Shared responsive heading block: step number + question text. */
export function OnboardingTitle({
  step,
  question,
  children,
}: {
  step: string;
  question: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-2 text-center sm:mb-6 lg:mb-8">
      <h1 className="mb-0.5 text-lg font-bold text-black sm:mb-2 sm:text-2xl lg:text-3xl">{step}</h1>
      <p className="mb-1 break-words text-base font-bold text-black sm:mb-4 sm:text-xl lg:text-2xl">
        {question}
      </p>
      {children}
    </div>
  );
}
