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
  const groupNumber = Number(question?.group_number);
  const questionName = (question?.question_name || '').trim().toLowerCase();

  // Exclusions are scale-based for these questions even when the answer UI is grouped.
  if ([2, 3, 7, 8, 11].includes(questionNumber)) return DEFAULT_EXCLUSION_VALUES;

  if (questionNumber === 4) return [1, 3, 5];

  if (questionNumber === 10 && (groupNumber === 1 || questionName === 'have')) {
    return [1, 5];
  }

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
