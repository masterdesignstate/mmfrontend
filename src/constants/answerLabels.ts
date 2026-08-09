import type { AnswerValueLabel } from '@/utils/answerValues';

/**
 * The 1–5 importance scale, shared by every question surface (onboarding, questions
 * editor, profile). Previously copy-pasted into four files.
 */
export const IMPORTANCE_LABELS: AnswerValueLabel[] = [
  { value: '1', answer_text: 'TRIVIAL' },
  { value: '2', answer_text: 'MINOR' },
  { value: '3', answer_text: 'AVERAGE' },
  { value: '4', answer_text: 'SIGNIFICANT' },
  { value: '5', answer_text: 'ESSENTIAL' },
];

/**
 * Fallback 1–5 scale for questions with no answer labels of their own. All five values are
 * present so the slider keeps five stops — only the endpoints carry a caption.
 */
export const DEFAULT_SCALE_LABELS: AnswerValueLabel[] = [
  { value: '1', answer_text: 'LESS' },
  { value: '2', answer_text: '' },
  { value: '3', answer_text: '' },
  { value: '4', answer_text: '' },
  { value: '5', answer_text: 'MORE' },
];
