import {
  MANDATORY_QUESTION_PROMPTS,
  MANDATORY_QUESTION_TITLES,
} from '@/constants/mandatoryQuestions';

interface DisplayQuestion {
  question_number?: number | null;
  question_name?: string | null;
  question_type?: string | null;
  group_name?: string | null;
  group_name_text?: string | null;
  text?: string | null;
}

/**
 * How a question is written out, in one place.
 *
 * The composition lived in eight call sites with three different fallback chains, so the
 * same question could read differently depending on which screen you were looking at.
 *
 * A **grouped** question (ethnicity, education, diet, faith) is a set of sub-questions under
 * one heading, so it keeps both parts: "4. Ethnicity" above "What ethnicity do you identify
 * with?".
 *
 * Everything else is a single question, and its "title" is only ever a category label that
 * restates the prompt. Those used to render as "13. Want Kids" above "Do you want kids?";
 * now the prompt *is* the heading, so a split question reads "13. Do you want kids?" — the
 * same shape a plain question already had ("25. How good is this website?").
 */
const isGrouped = (question?: DisplayQuestion | null): boolean =>
  question?.question_type === 'grouped';

/** The question's own wording, without the number. */
export const getQuestionPrompt = (
  questionNumber?: number | null,
  question?: DisplayQuestion | null
): string => {
  const number = Number(questionNumber);
  return (
    question?.group_name_text?.trim() ||
    MANDATORY_QUESTION_PROMPTS[number] ||
    question?.text?.trim() ||
    ''
  );
};

/** The heading text, without the number. */
export const getQuestionTitle = (
  questionNumber?: number | null,
  question?: DisplayQuestion | null
): string => {
  const number = Number(questionNumber);

  if (isGrouped(question)) {
    return (
      question?.group_name?.trim() ||
      MANDATORY_QUESTION_TITLES[number] ||
      question?.question_name?.trim() ||
      ''
    );
  }

  return getQuestionPrompt(questionNumber, question) || MANDATORY_QUESTION_TITLES[number] || '';
};

/** The heading with its number, e.g. `13. Do you want kids?`. */
export const getQuestionHeading = (
  questionNumber?: number | null,
  question?: DisplayQuestion | null
): string => {
  const title = getQuestionTitle(questionNumber, question);
  return questionNumber ? `${questionNumber}. ${title}` : title;
};

/**
 * The line under the heading — empty when it would only repeat it, which is the case for
 * every question that is not grouped.
 */
export const getQuestionSubtitle = (
  questionNumber?: number | null,
  question?: DisplayQuestion | null
): string => {
  if (!isGrouped(question)) return '';
  const prompt = getQuestionPrompt(questionNumber, question);
  return prompt === getQuestionTitle(questionNumber, question) ? '' : prompt;
};
