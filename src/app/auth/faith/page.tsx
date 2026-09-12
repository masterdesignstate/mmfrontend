'use client';

import GroupedPickerStep from '@/components/onboarding/GroupedPickerStep';
import { FAITH } from '@/constants/mandatoryQuestions';

// Option names match the database question names exactly, in group order.
const faithOptions = [
  'Christian', 'Muslim', 'Jewish', 'Buddhist', 'Pagan', 'Other',
  'Spiritual', 'Atheist', 'Agnostic', 'Nonspiritual', 'Hindu',
];

export default function FaithPage() {
  return (
    <GroupedPickerStep
      questionNumber={FAITH}
      routeId="faith"
      options={faithOptions}
      storageKey="answeredFaiths"
      noun="faith"
    />
  );
}
