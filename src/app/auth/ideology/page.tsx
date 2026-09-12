'use client';

import GroupedPickerStep from '@/components/onboarding/GroupedPickerStep';
import { IDEOLOGY } from '@/constants/mandatoryQuestions';

const ideologyIcon = () => '/assets/politics.png';

export default function IdeologyPage() {
  return (
    <GroupedPickerStep
      questionNumber={IDEOLOGY}
      noun="ideology"
      optionRoute="/auth/question/ideology"
      iconFor={ideologyIcon}
    />
  );
}
