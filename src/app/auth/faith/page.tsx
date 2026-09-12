'use client';

import GroupedPickerStep from '@/components/onboarding/GroupedPickerStep';
import { FAITH } from '@/constants/mandatoryQuestions';

const FAITH_ICONS: Record<string, string> = {
  christian: '/assets/chapel.png',
  muslim: '/assets/chapel.png',
  jewish: '/assets/chapel.png',
  hindu: '/assets/chapel.png',
  buddhist: '/assets/chapel.png',
  atheist: '/assets/leaf.png',
  agnostic: '/assets/leaf.png',
  spiritual: '/assets/leaf.png',
};

const faithIcon = (name: string) => FAITH_ICONS[name.toLowerCase()] || '/assets/chapel.png';

export default function FaithPage() {
  return <GroupedPickerStep questionNumber={FAITH} noun="faith" optionRoute="/auth/question/faith" iconFor={faithIcon} />;
}
