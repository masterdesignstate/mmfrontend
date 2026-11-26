'use client';

import { useRouter } from 'next/navigation';
import MandatoryQuestionsSample from '../MandatoryQuestionsSample';
import { ETHNICITY_STEPS, MANDATORY_CARDS, useQuestionPreview } from '../useQuestionPreview';

export default function MandatoryCardsPage() {
  const router = useRouter();
  const preview = useQuestionPreview(MANDATORY_CARDS);
  return (
    <MandatoryQuestionsSample variant="cards" cards={{
      ready: preview.ready,
      ethnicityAnswered: Boolean(preview.progress.ethnicity),
      headerAction: preview.headerAction,
      message: preview.message,
      onNext: () => router.push(ETHNICITY_STEPS),
    }} />
  );
}
