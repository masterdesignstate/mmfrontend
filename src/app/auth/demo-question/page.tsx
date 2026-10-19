'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import AnswerSliderRow from '@/components/AnswerSliderRow';
import OnboardingShell from '@/components/OnboardingShell';
import GuidedTour, { type TourStep } from '@/components/onboarding/GuidedTour';
import { IMPORTANCE_LABELS } from '@/constants/answerLabels';
import type { AnswerValueLabel } from '@/utils/answerValues';
import { normalizeExcludedValues } from '@/utils/exclusionValues';
import { markOnboardingDemoSeen } from '@/utils/onboardingDemo';

const SAMPLE_LABELS: AnswerValueLabel[] = [
  { value: '1', answer_text: 'NEVER' },
  { value: '2', answer_text: 'RARELY' },
  { value: '3', answer_text: 'SOMETIMES' },
  { value: '4', answer_text: 'REGULARLY' },
  { value: '5', answer_text: 'DAILY' },
];
const ALLOWED_EXCLUSIONS = [1, 2, 3, 4, 5];

// The question controls (Open to All help, Exclude, Note) render in the shell's action dock,
// in that order.
const DOCK = 'aside[aria-label="Question actions"] > div';

const STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'How a question works',
    body: 'This sample is not saved.',
  },
  {
    id: 'question',
    target: '[data-tour="question"]',
    title: 'The question',
    body: 'Set what you’re looking for, then your own answer.',
  },
  {
    id: 'them',
    target: '[data-tour="them"]',
    title: 'Them',
    body: 'The answer you want from someone else. The words under the slider explain each number.',
    hint: 'Move the slider.',
  },
  {
    id: 'ota',
    target: '[data-tour="them"]',
    title: 'Open to All',
    body: 'Move to 5, then tap it. The slider turns purple and any answer is fine. Tap again to turn it off.',
  },
  {
    id: 'exclude',
    target: `${DOCK} > :nth-child(2)`,
    title: 'Exclude',
    body: 'Hides people whose answer is one you pick. You can change this later in Results filters.',
  },
  {
    id: 'me',
    target: '[data-tour="me"]',
    title: 'Me',
    body: 'Your own answer. Other people are compared against this.',
    hint: 'Move the slider.',
  },
  {
    id: 'note',
    target: `${DOCK} > :nth-child(3)`,
    title: 'Note',
    body: 'A short note on your answer. Who can see notes is set in Settings.',
  },
  {
    id: 'importance',
    target: '[data-tour="importance"]',
    title: 'Importance',
    body: 'Higher importance counts for more in compatibility.',
    hint: 'Move the slider.',
  },
  {
    id: 'toggles',
    target: '[data-tour="toggles"]',
    title: 'Required and Share',
    body: 'Required means they must answer it. Share shows your answer on your profile.',
  },
  {
    id: 'next',
    target: 'footer button:last-of-type',
    title: 'Next',
    body: 'On a real question, Next saves your answer.',
  },
];

interface DemoState {
  them: number;
  me: number;
  importance: number;
  themOpen: boolean;
}

/** Steps that finish themselves once the user has done what they ask. */
const TASKS: Partial<Record<string, (start: DemoState, now: DemoState) => boolean>> = {
  them: (start, now) => now.them !== start.them,
  ota: (start, now) => now.themOpen !== start.themOpen,
  me: (start, now) => now.me !== start.me,
  importance: (start, now) => now.importance !== start.importance,
};

const AUTO_ADVANCE_MS = 900;

/** Allow only in-app onboarding routes as the place to continue to. */
const safeNext = (raw: string | null) => (raw && raw.startsWith('/auth/') ? raw : '/auth/relationship');

export default function DemoQuestionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = safeNext(searchParams.get('next'));
  const userId = searchParams.get('user_id') || '';

  const [them, setThem] = useState(3);
  const [me, setMe] = useState(3);
  const [importance, setImportance] = useState(3);
  const [themOpen, setThemOpen] = useState(false);
  const [excluded, setExcluded] = useState<number[]>([]);
  const [note, setNote] = useState('');
  const [required, setRequired] = useState(false);
  const [share, setShare] = useState(true);

  const [stepIndex, setStepIndex] = useState(0);
  const [taskDone, setTaskDone] = useState(false);

  const state = useMemo<DemoState>(() => ({ them, me, importance, themOpen }), [them, me, importance, themOpen]);
  const stepStartRef = useRef<DemoState>(state);
  const step = STEPS[stepIndex];

  useEffect(() => {
    posthog.capture('onboarding_demo_started');
  }, []);

  // Snapshot on entering a step, so "did they do it" compares against where they started.
  useEffect(() => {
    stepStartRef.current = state;
    setTaskDone(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  useEffect(() => {
    const task = TASKS[step.id];
    if (!taskDone && task?.(stepStartRef.current, state)) setTaskDone(true);
  }, [state, step.id, taskDone]);

  useEffect(() => {
    if (!taskDone) return;
    const timer = setTimeout(() => setStepIndex(i => Math.min(i + 1, STEPS.length - 1)), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [taskDone, stepIndex]);

  const finish = (skipped: boolean) => {
    if (userId) markOnboardingDemoSeen(userId);
    posthog.capture(skipped ? 'onboarding_demo_skipped' : 'onboarding_demo_completed', { step: step.id });
    router.push(nextUrl);
  };

  const goNext = () => {
    if (stepIndex === STEPS.length - 1) {
      finish(false);
      return;
    }
    setStepIndex(i => i + 1);
  };

  const blockedExclusions = themOpen ? [] : [me];

  return (
    <>
      <OnboardingShell
        onBack={() => router.push(`/auth/introcard${userId ? `?user_id=${userId}` : ''}`)}
        onNext={goNext}
        nextLabel={stepIndex === STEPS.length - 1 ? 'Start questions' : 'Next'}
        questionNote={note}
        onQuestionNoteChange={setNote}
      >
        <div className="mx-auto w-full min-w-0 max-w-[100%] sm:max-w-[640px] md:max-w-[630px] lg:max-w-[792px]">
          <div data-tour="question" className="mb-2 text-center sm:mb-6 lg:mb-8">
            <span className="inline-flex rounded-full border border-gray-900 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-gray-900">
              SAMPLE QUESTION
            </span>
            <p className="mb-1 mt-3 break-words text-base font-bold text-black sm:mb-4 sm:text-xl lg:text-2xl">
              How often do you drink coffee?
            </p>
            <div data-tour="toggles" className="mb-4 flex w-full items-center justify-between gap-3 sm:mb-8">
              <DemoSwitch label="Required For Match" checked={required} onChange={() => setRequired(v => !v)} />
              <DemoSwitch label="Share Answer" checked={share} onChange={() => setShare(v => !v)} />
            </div>
          </div>

          <div className="mb-2" data-tour="them">
            <h3 className="-mb-2 text-center text-lg font-bold text-black">Them</h3>
            <AnswerSliderRow
              label="COFFEE"
              hideRowLabel
              labels={SAMPLE_LABELS}
              value={them}
              onChange={setThem}
              showOta
              otaChecked={themOpen}
              onOtaToggle={() => setThemOpen(v => !v)}
              showExclude
              excludedValues={excluded}
              allowedExclusionValues={ALLOWED_EXCLUSIONS}
              blockedExclusionValues={blockedExclusions}
              onExcludedValuesChange={values => setExcluded(normalizeExcludedValues(values, ALLOWED_EXCLUSIONS, blockedExclusions))}
            />
          </div>

          <div className="mb-2 pt-1" data-tour="me">
            <h3 className="-mb-2 text-center text-lg font-bold">Me</h3>
            <AnswerSliderRow
              label="COFFEE"
              hideRowLabel
              labels={SAMPLE_LABELS}
              value={me}
              onChange={setMe}
              showNote
              note={note}
              onNoteChange={setNote}
            />
          </div>

          <div className="mb-2 pt-1" data-tour="importance">
            <h3 className="-mb-2 text-center text-lg font-bold">Importance</h3>
            <AnswerSliderRow
              label="IMPORTANCE"
              labels={IMPORTANCE_LABELS}
              value={importance}
              onChange={setImportance}
              isImportance
              hideRowLabel
            />
          </div>
        </div>
      </OnboardingShell>

      <GuidedTour
        steps={STEPS}
        index={stepIndex}
        completed={taskDone}
        onNext={goNext}
        onBack={() => setStepIndex(i => Math.max(0, i - 1))}
        onSkip={() => finish(true)}
        finishLabel="Start questions"
      />
    </>
  );
}

function DemoSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none"
        style={{ backgroundColor: checked ? '#000000' : '#ADADAD' }}
      >
        <span
          className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
          style={{ transform: checked ? 'translateX(20px)' : 'translateX(2px)' }}
        />
      </button>
      <span className="text-xs text-black sm:text-sm">{label}</span>
    </div>
  );
}
