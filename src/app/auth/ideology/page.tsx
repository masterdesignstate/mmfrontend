'use client';

import GroupedPickerStep from '@/components/onboarding/GroupedPickerStep';
import { IDEOLOGY } from '@/constants/mandatoryQuestions';

// Option names match the database question names exactly, in group order.
const ideologyOptions = ['Left', 'Right', 'Moderate', 'Non-binary', 'Anarchist', 'Apolitical'];

export default function IdeologyPage() {
  return (
    <GroupedPickerStep
      questionNumber={IDEOLOGY}
      routeId="ideology"
      options={ideologyOptions}
      storageKey="answeredIdeologies"
      noun="ideology"
    />
  );
}
