'use client';

import GroupedQuestionStep from '@/components/onboarding/GroupedQuestionStep';
import { IDEOLOGY } from '@/constants/mandatoryQuestions';

export default function IdeologyQuestionPage() {
  return <GroupedQuestionStep questionNumber={IDEOLOGY} pickerRoute="/auth/ideology" />;
}
