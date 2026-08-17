import { DEFAULT_SCALE_LABELS } from '@/constants/answerLabels';
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
  4: { 1: 'NONE', 3: 'SOME', 5: 'COMPLETED' },
  5: { 1: 'NO', 5: 'YES' },
  6: FREQUENCY_CAPTIONS,
  7: FREQUENCY_CAPTIONS,
  8: FREQUENCY_CAPTIONS,
  9: { 1: 'UNINVOLVED', 2: 'OBSERVANT', 3: 'ACTIVE', 4: 'FERVENT', 5: 'RADICAL' },
};

const HAVE_KIDS_CAPTIONS: Record<number, string> = { 1: "DON'T HAVE", 5: 'HAVE' };
const WANT_KIDS_CAPTIONS: Record<number, string> = {
  1: "DON'T WANT",
  2: 'DOUBTFUL',
  3: 'UNSURE',
  4: 'EVENTUALLY',
  5: 'WANT',
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

  const captions =
    number === 10
      ? (question?.group_number === 1 ? HAVE_KIDS_CAPTIONS : WANT_KIDS_CAPTIONS)
      : CAPTIONS_BY_QUESTION[number];

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
