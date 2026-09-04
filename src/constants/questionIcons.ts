import {
  ALCOHOL,
  DIET,
  EDUCATION,
  ETHNICITY,
  FAITH,
  HAVE_KIDS,
  IDEOLOGY,
  POLITICS,
  RELIGION,
  WANT_KIDS,
} from '@/constants/mandatoryQuestions';

/**
 * Icons for the option cards of a grouped question, keyed by question number.
 *
 * Keyed off the constants rather than literals on purpose: this map was duplicated four
 * times and two of the copies still held the pre-split numbering, so every grouped question
 * rendered its neighbour's icon (male showed ethnicity, ethnicity showed education, and so
 * on). Import from here instead of writing another copy.
 *
 * Distinct from the chip icons on the profile summary row, which use their own artwork for
 * the same questions (`globex` for ethnicity, `cap` for education, `drink` for alcohol).
 */
export const QUESTION_OPTION_ICONS: Record<number, string> = {
  [ETHNICITY]: '/assets/ethn.png',
  [EDUCATION]: '/assets/cpx.png',
  [DIET]: '/assets/lf2.png',
  [ALCOHOL]: '/assets/hands.png',
  [RELIGION]: '/assets/prayin.png',
  [POLITICS]: '/assets/politics.png',
  [WANT_KIDS]: '/assets/pacifier.png',
  [HAVE_KIDS]: '/assets/pacifier.png',
  [FAITH]: '/assets/prayin.png',
  [IDEOLOGY]: '/assets/ethn.png',
};

export const DEFAULT_QUESTION_OPTION_ICON = '/assets/ethn.png';

export const getQuestionOptionIcon = (questionNumber?: number | null): string =>
  QUESTION_OPTION_ICONS[Number(questionNumber)] || DEFAULT_QUESTION_OPTION_ICON;
