import type { AnswerValueLabel } from '@/utils/answerValues';
import { DEFAULT_SCALE_LABELS } from '@/constants/answerLabels';

/**
 * Canonical numbering for the mandatory onboarding questions.
 *
 * Gender, Habits and Kids used to pack two or three sub-questions behind a single
 * `question_number`, which forced the onboarding page to label every slider row. They are
 * now standalone questions, so the mandatory block runs 1..14 and optional questions start
 * at 15. Import from here rather than writing the literals — the numbers appear in routing,
 * scale captions, exclusion rules and profile icons, and they are easy to miss one at a time.
 *
 * Mirrors `mmbackend/api/mandatory_questions.py`; keep the two in step.
 */
export const RELATIONSHIP = 1;
export const FEMALE = 2;
export const MALE = 3;
export const ETHNICITY = 4;
export const EDUCATION = 5;
export const DIET = 6;
export const EXERCISE = 7;
export const ALCOHOL = 8;
export const CIGARETTES = 9;
export const VAPE = 10;
export const RELIGION = 11;
export const POLITICS = 12;
export const WANT_KIDS = 13;
export const HAVE_KIDS = 14;

export const LAST_MANDATORY_QUESTION_NUMBER = HAVE_KIDS;
export const FIRST_OPTIONAL_QUESTION_NUMBER = LAST_MANDATORY_QUESTION_NUMBER + 1;

/** Optional questions that still carry per-number behaviour. */
export const FAITH = 15;
export const IDEOLOGY = 16;

export const isMandatoryQuestionNumber = (questionNumber?: number | null): boolean => {
  const number = Number(questionNumber);
  return Number.isInteger(number) && number >= RELATIONSHIP && number <= LAST_MANDATORY_QUESTION_NUMBER;
};

export const isOptionalQuestionNumber = (questionNumber?: number | null): boolean =>
  Number(questionNumber) > LAST_MANDATORY_QUESTION_NUMBER;

/** Questions whose answers are a set of sub-questions sharing one number. */
export const GROUPED_QUESTION_NUMBERS = [ETHNICITY, EDUCATION, DIET, FAITH] as const;

/** The mandatory ones among them — answered by picking a card, not by moving a slider. */
export const GROUPED_MANDATORY_NUMBERS: number[] = [ETHNICITY, EDUCATION, DIET];

/**
 * Mandatory questions rendered as a single unlabelled slider per section — everything
 * except Relationship (four rows) and the three grouped pickers.
 */
export const SINGLE_SLIDER_QUESTION_NUMBERS = [
  FEMALE, MALE, EXERCISE, ALCOHOL, CIGARETTES, VAPE, RELIGION, POLITICS, WANT_KIDS, HAVE_KIDS,
] as const;

const FREQUENCY_LABELS: AnswerValueLabel[] = [
  { value: '1', answer_text: 'NEVER' },
  { value: '2', answer_text: 'RARELY' },
  { value: '3', answer_text: 'SOMETIMES' },
  { value: '4', answer_text: 'REGULARLY' },
  { value: '5', answer_text: 'DAILY' },
];

export interface OnboardingStep {
  number: number;
  /** Title shown as "8. Alcohol". */
  label: string;
  /** The question itself, shown under the title. */
  prompt: string;
  /** Path the step lives at, without the `user_id` query string. */
  route: string;
  /**
   * Everything the single-slider steps need to render before the API answers, so the page
   * paints immediately instead of showing a spinner. Absent for the grouped steps, which
   * pick a sub-question on their own page first.
   */
  question?: {
    id: string;
    labels: AnswerValueLabel[];
    /** Starting slider position when the user has no stored answer yet. */
    defaultAnswer?: number;
  };
}

const questionRoute = (questionNumber: number) => `/auth/question/${questionNumber}`;

/**
 * The onboarding flow in order. Progress, next/back navigation and the introcard's
 * "resume where you left off" map all read from this list.
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    number: RELATIONSHIP,
    label: 'Relationship',
    prompt: 'What relationship are you looking for?',
    route: '/auth/relationship',
  },
  {
    number: FEMALE,
    label: 'Female',
    prompt: 'How strongly do you identify as a female?',
    route: questionRoute(FEMALE),
    question: {
      id: '45e0858e-8870-4378-ac4a-02e1043b5c2e',
      labels: DEFAULT_SCALE_LABELS,
    },
  },
  {
    number: MALE,
    label: 'Male',
    prompt: 'How strongly do you identify as a male?',
    route: questionRoute(MALE),
    question: {
      id: 'bfc597fe-fa90-46b3-9ac8-e98968b46efa',
      labels: DEFAULT_SCALE_LABELS,
    },
  },
  {
    number: ETHNICITY,
    label: 'Ethnicity',
    prompt: 'What ethnicity do you identify with?',
    route: '/auth/ethnicity',
  },
  {
    number: EDUCATION,
    label: 'Education',
    prompt: 'What is your highest level of education?',
    route: '/auth/education',
  },
  {
    number: DIET,
    label: 'Diet',
    prompt: 'Which diet best describes you?',
    route: '/auth/diet',
  },
  {
    number: EXERCISE,
    label: 'Exercise',
    prompt: 'How frequently do you exercise?',
    route: questionRoute(EXERCISE),
    question: {
      id: '69340c6a-ab20-441c-b3d6-5564d9808998',
      labels: FREQUENCY_LABELS,
    },
  },
  {
    number: ALCOHOL,
    label: 'Alcohol',
    prompt: 'How often do you drink alcohol?',
    route: questionRoute(ALCOHOL),
    question: {
      id: 'befc610f-6fda-4b0e-9b5a-8100ec0d14e7',
      labels: FREQUENCY_LABELS,
    },
  },
  {
    number: CIGARETTES,
    label: 'Cigarettes',
    prompt: 'How often do you smoke cigarettes?',
    route: questionRoute(CIGARETTES),
    question: {
      id: '13d18dd3-00c1-4f86-9337-24fc07e24091',
      labels: FREQUENCY_LABELS,
    },
  },
  {
    number: VAPE,
    label: 'Vape',
    prompt: 'How often do you vape?',
    route: questionRoute(VAPE),
    question: {
      id: '07453d3e-5f22-4b73-9cd5-a09520b412b5',
      labels: FREQUENCY_LABELS,
    },
  },
  {
    number: RELIGION,
    label: 'Religion',
    prompt: 'How often do you practice religion?',
    route: questionRoute(RELIGION),
    question: {
      id: '66545c20-b2df-4e26-80fc-756a54cd51f3',
      labels: FREQUENCY_LABELS,
    },
  },
  {
    number: POLITICS,
    label: 'Politics',
    prompt: 'How important is politics in your life?',
    route: questionRoute(POLITICS),
    question: {
      id: 'dde017cd-7065-4ac0-9413-cac7e155e93e',
      labels: [
        { value: '1', answer_text: 'UNINVOLVED' },
        { value: '2', answer_text: 'OBSERVANT' },
        { value: '3', answer_text: 'ACTIVE' },
        { value: '4', answer_text: 'FERVENT' },
        { value: '5', answer_text: 'RADICAL' },
      ],
    },
  },
  {
    number: WANT_KIDS,
    label: 'Want Kids',
    prompt: 'Do you want kids?',
    route: questionRoute(WANT_KIDS),
    question: {
      id: 'b3d3b8c8-f1ef-43ce-8e36-1b78b75848c6',
      labels: [
        { value: '1', answer_text: "DON'T WANT" },
        { value: '2', answer_text: 'DOUBTFUL' },
        { value: '3', answer_text: 'UNSURE' },
        { value: '4', answer_text: 'EVENTUALLY' },
        { value: '5', answer_text: 'WANT' },
      ],
    },
  },
  {
    number: HAVE_KIDS,
    label: 'Have Kids',
    prompt: 'Do you have kids?',
    route: questionRoute(HAVE_KIDS),
    // Yes/no: only the two ends are selectable, and the old Kids page started on "HAVE".
    question: {
      id: '4be86e73-87be-4c81-a66a-5490255f3e3b',
      labels: [
        { value: '1', answer_text: "DON'T HAVE" },
        { value: '5', answer_text: 'HAVE' },
      ],
      defaultAnswer: 5,
    },
  },
];

const STEPS_BY_NUMBER = new Map(ONBOARDING_STEPS.map(step => [step.number, step]));

/** Titles and prompts for the mandatory questions, for surfaces that render them by number. */
export const MANDATORY_QUESTION_TITLES: Record<number, string> = Object.fromEntries(
  ONBOARDING_STEPS.map(step => [step.number, step.label])
);

export const MANDATORY_QUESTION_PROMPTS: Record<number, string> = Object.fromEntries(
  ONBOARDING_STEPS.map(step => [step.number, step.prompt])
);

export const getOnboardingStep = (questionNumber?: number | null): OnboardingStep | undefined =>
  STEPS_BY_NUMBER.get(Number(questionNumber));

/** Route map keyed by question number, for resuming onboarding at the first unanswered step. */
export const ONBOARDING_ROUTES: Record<number, string> = Object.fromEntries(
  ONBOARDING_STEPS.map(step => [step.number, step.route])
);

export const getNextOnboardingRoute = (questionNumber: number): string | null => {
  const index = ONBOARDING_STEPS.findIndex(step => step.number === questionNumber);
  if (index < 0 || index === ONBOARDING_STEPS.length - 1) return null;
  return ONBOARDING_STEPS[index + 1].route;
};

export const getPreviousOnboardingRoute = (questionNumber: number): string | null => {
  const index = ONBOARDING_STEPS.findIndex(step => step.number === questionNumber);
  if (index <= 0) return null;
  return ONBOARDING_STEPS[index - 1].route;
};

/** Progress bar fill for a step, 1..14 mapped across the full bar. */
export const getOnboardingProgressPercent = (questionNumber?: number | null): number => {
  const index = ONBOARDING_STEPS.findIndex(step => step.number === Number(questionNumber));
  if (index < 0) return 0;
  return Math.round(((index + 1) / ONBOARDING_STEPS.length) * 100);
};
