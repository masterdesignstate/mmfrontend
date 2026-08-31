import {
  ALCOHOL,
  CIGARETTES,
  EDUCATION,
  ETHNICITY,
  FAITH,
  FEMALE,
  HAVE_KIDS,
  MALE,
  RELIGION,
  VAPE,
} from '@/constants/mandatoryQuestions';

export interface ExclusionQuestion {
  question_number?: number | null;
  group_number?: number | null;
  question_name?: string | null;
  open_to_all_me?: boolean | null;
  open_to_all_looking_for?: boolean | null;
  answers?: Array<{
    value: string | number;
    answer_text?: string | null;
  }>;
}

export const DEFAULT_EXCLUSION_VALUES = [1, 2, 3, 4, 5];
export const EDUCATION_EXCLUSION_VALUES = [1, 3, 5];
export const HAVE_KIDS_EXCLUSION_VALUES = [1, 5];

// Exclusions are scale-based for these even where the answer UI is grouped.
const FULL_SCALE_EXCLUSION_NUMBERS = new Set<number>([
  FEMALE, MALE, ETHNICITY, ALCOHOL, CIGARETTES, VAPE, RELIGION, FAITH,
]);

const uniqueSortedValues = (values: number[]) =>
  Array.from(new Set(values)).sort((a, b) => a - b);

const parsedAnswerValues = (question?: ExclusionQuestion | null) => {
  if (!question?.answers?.length) return [];

  return uniqueSortedValues(
    question.answers
      .map(answer => Number(answer.value))
      .filter(value => Number.isInteger(value) && value >= 1 && value <= 5)
  );
};

export const getAllowedExclusionValues = (question?: ExclusionQuestion | null): number[] => {
  const questionNumber = Number(question?.question_number);

  if (FULL_SCALE_EXCLUSION_NUMBERS.has(questionNumber)) return DEFAULT_EXCLUSION_VALUES;

  if (questionNumber === EDUCATION) return EDUCATION_EXCLUSION_VALUES;

  if (questionNumber === HAVE_KIDS) return HAVE_KIDS_EXCLUSION_VALUES;

  const answerValues = parsedAnswerValues(question);
  if (answerValues.length > 0) return answerValues;

  return DEFAULT_EXCLUSION_VALUES;
};

export const normalizeExcludedValues = (
  values: unknown,
  allowedValues: number[] = DEFAULT_EXCLUSION_VALUES,
  blockedValues: number[] = []
): number[] => {
  if (!Array.isArray(values)) return [];

  const allowed = new Set(allowedValues);
  const blocked = new Set(blockedValues);
  const normalized = values
    .map(value => Number(value))
    .filter(value => Number.isInteger(value) && allowed.has(value) && !blocked.has(value));

  return uniqueSortedValues(normalized);
};
