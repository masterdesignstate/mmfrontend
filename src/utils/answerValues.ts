export interface AnswerValueLabel {
  value: string | number;
  answer_text?: string | null;
}

export const DEFAULT_ANSWER_VALUES = [1, 2, 3, 4, 5];

const uniqueSortedValues = (values: number[]) =>
  Array.from(new Set(values)).sort((a, b) => a - b);

export const getAnswerValues = (labels: AnswerValueLabel[] = []): number[] => {
  const values = uniqueSortedValues(
    labels
      .map(label => Number(label.value))
      .filter(value => Number.isInteger(value) && value >= 1 && value <= 5)
  );

  return values.length > 0 ? values : DEFAULT_ANSWER_VALUES;
};

export const getNearestAnswerValue = (value: number, labels: AnswerValueLabel[] = []): number => {
  const values = getAnswerValues(labels);

  return values.reduce((bestValue, candidateValue) => {
    const bestDistance = Math.abs(bestValue - value);
    const candidateDistance = Math.abs(candidateValue - value);
    if (candidateDistance < bestDistance) return candidateValue;
    if (candidateDistance === bestDistance && candidateValue > bestValue) return candidateValue;
    return bestValue;
  }, values[0]);
};

export const getAnswerValueFromPercentage = (
  percentage: number,
  labels: AnswerValueLabel[] = []
): number => {
  const values = getAnswerValues(labels);
  const clampedPercentage = Math.max(0, Math.min(1, percentage));
  const index = Math.round(clampedPercentage * (values.length - 1));
  return values[index];
};

export const getAnswerValuePosition = (
  value: number,
  labels: AnswerValueLabel[] = []
): number => {
  const values = getAnswerValues(labels);
  if (values.length <= 1) return 0;

  const displayValue = getNearestAnswerValue(value, labels);
  const index = values.indexOf(displayValue);
  return (index / (values.length - 1)) * 100;
};
