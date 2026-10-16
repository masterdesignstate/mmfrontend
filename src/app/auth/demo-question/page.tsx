'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import AnswerSliderRow from '@/components/AnswerSliderRow';
import OnboardingShell, { OnboardingTitle } from '@/components/OnboardingShell';
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
    title: 'Let’s try a practice question',
    body: 'Before your first real question, here’s a quick walkthrough of how questions work. Nothing you do here is saved.',
  },
  {
    id: 'question',
    target: '[data-tour="question"]',
    title: 'The question',
    body: 'Each question has a number and a prompt. You’ll answer it twice: once about what you want, and once about you.',
  },
  {
    id: 'them',
    target: '[data-tour="them"]',
    title: 'Them: what you’re looking for',
    body: 'Slide to the answer you’d like a match to have. The words under the slider say what each number means.',
    hint: 'Try it: drag the Them slider.',
  },
  {
    id: 'ota',
    target: '[data-tour="them"]',
    title: 'Open to All',
    body: 'Not picky about this one? Drag Them all the way to 5, then tap the 5 again. The slider turns purple, meaning any answer works for you. Tap it again to turn it off.',
    hint: 'Try it: move to 5 and tap it again.',
  },
  {
    id: 'exclude',
    target: `${DOCK} > :nth-child(2)`,
    title: 'Exclude',
    body: 'Want to rule people out? Exclude hides anyone whose own answer is one you pick. You can change these later from the Filter panel on Results.',
  },
  {
    id: 'me',
    target: '[data-tour="me"]',
    title: 'Me: your own answer',
    body: 'Now answer for yourself. This is what other people’s Them answers are compared against.',
    hint: 'Try it: drag the Me slider.',
  },
  {
    id: 'note',
    target: `${DOCK} > :nth-child(3)`,
    title: 'Add a note',
    body: 'Want to explain your answer? Add a short note to the question. Who can see notes is up to you in Settings.',
  },
  {
    id: 'importance',
    target: '[data-tour="importance"]',
    title: 'Importance',
    body: 'How much does this question matter to you? Higher importance counts for more in your compatibility scores.',
    hint: 'Try it: set an importance.',
  },
  {
    id: 'toggles',
    target: '[data-tour="toggles"]',
    title: 'Required and Share',
    body: 'Optional questions also have these. Required For Match: people must answer it before you’re matched. Share Answer: shows your answer on your profile.',
  },
  {
    id: 'next',
    target: 'footer button:last-of-type',
    title: 'Save and continue',
    body: 'On real questions, Next saves your answer and moves on. That’s everything. Your first question is up next!',
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
          <div className="mb-2 flex justify-center">
            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-[#672DB7] ring-1 ring-purple-200">
              Practice question · nothing is saved
            </span>
          </div>

          <div data-tour="question">
            <OnboardingTitle step="Practice. Coffee" question="How often do you drink coffee?">
              <div data-tour="toggles" className="mb-4 flex w-full items-center justify-between gap-3 sm:mb-8">
                <DemoSwitch label="Required For Match" checked={required} onChange={() => setRequired(v => !v)} />
                <DemoSwitch label="Share Answer" checked={share} onChange={() => setShare(v => !v)} />
              </div>
            </OnboardingTitle>
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
