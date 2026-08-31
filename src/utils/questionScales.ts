import { DEFAULT_SCALE_LABELS } from '@/constants/answerLabels';
import {
  ALCOHOL,
  CIGARETTES,
  EDUCATION,
  DIET,
  EXERCISE,
  HAVE_KIDS,
  POLITICS,
  RELIGION,
  VAPE,
  WANT_KIDS,
} from '@/constants/mandatoryQuestions';
import {
  getAnswerValues,
  getSliderLabelsForQuestion,
  type AnswerValueLabel,
} from '@/utils/answerValues';

const FREQUENCY_CAPTIONS: Record<number, string> = {
  1: 'NEVER',
  2: 'RARELY',
  3: 'SOMETIMES',
  4: 'REGULARLY',
  5: 'DAILY',
};

/**
 * Scale captions the mandatory questions override, keyed by the value they sit on rather
 * than by position — a question whose answers only define values 1/3/5 (education) then
 * keeps its three stops instead of being stretched to five.
 */
const CAPTIONS_BY_QUESTION: Record<number, Record<number, string>> = {
  [EDUCATION]: { 1: 'NONE', 3: 'SOME', 5: 'COMPLETED' },
  [DIET]: { 1: 'NO', 5: 'YES' },
  [EXERCISE]: FREQUENCY_CAPTIONS,
  [ALCOHOL]: FREQUENCY_CAPTIONS,
  [CIGARETTES]: FREQUENCY_CAPTIONS,
  [VAPE]: FREQUENCY_CAPTIONS,
  [RELIGION]: FREQUENCY_CAPTIONS,
  [POLITICS]: { 1: 'UNINVOLVED', 2: 'OBSERVANT', 3: 'ACTIVE', 4: 'FERVENT', 5: 'RADICAL' },
  [HAVE_KIDS]: { 1: "DON'T HAVE", 5: 'HAVE' },
  [WANT_KIDS]: {
    1: "DON'T WANT",
    2: 'DOUBTFUL',
    3: 'UNSURE',
    4: 'EVENTUALLY',
    5: 'WANT',
  },
};

interface ScaleQuestion {
  question_number?: number | null;
  group_number?: number | null;
  answers?: AnswerValueLabel[] | null;
}

/**
 * Value stops plus captions for one question's slider.
 *
 * The stops always come from the question's own answers so a stored answer keeps its
 * position; only the caption text is overridden. Pass `questionNumber` when the caller
 * knows the group's number and the individual question row may not carry it.
 */
export const buildQuestionScaleLabels = (
  question: ScaleQuestion | null | undefined,
  questionNumber?: number | null
): AnswerValueLabel[] => {
  const number = Number(questionNumber ?? question?.question_number);
  const valueLabels = getSliderLabelsForQuestion(
    question?.question_number ?? number,
    question?.answers || []
  );
  const base = valueLabels.length > 0 ? valueLabels : DEFAULT_SCALE_LABELS;

  // Have Kids and Want Kids are separate questions now, so the number alone picks the scale.
  const captions = CAPTIONS_BY_QUESTION[number];

  if (!captions) {
    // No override: keep whatever the question shipped, falling back to LESS/MORE when it
    // has no caption text of its own (every ethnicity question, most user-submitted ones).
    const hasText = base.some(label => (label.answer_text || '').trim());
    if (hasText) return base;
    const values = getAnswerValues(base);
    return values.map((value, index) => ({
      value,
      answer_text: index === 0 ? 'LESS' : index === values.length - 1 ? 'MORE' : '',
    }));
  }

  return getAnswerValues(base).map(value => ({
    value,
    answer_text: captions[value] || '',
  }));
};
