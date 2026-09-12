'use client';

import GroupedQuestionStep from '@/components/onboarding/GroupedQuestionStep';
import { FAITH } from '@/constants/mandatoryQuestions';

export default function FaithQuestionPage() {
  return <GroupedQuestionStep questionNumber={FAITH} pickerRoute="/auth/faith" />;
}
