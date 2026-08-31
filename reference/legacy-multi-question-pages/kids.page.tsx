'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
import AnswerSliderRow from '@/components/AnswerSliderRow';
import OnboardingShell, { OnboardingTitle } from '@/components/OnboardingShell';
import { IMPORTANCE_LABELS } from '@/constants/answerLabels';
import { DEFAULT_EXCLUSION_VALUES, normalizeExcludedValues } from '@/utils/exclusionValues';
import { resolveOnboardingUserId } from '@/utils/userSession';
import posthog from 'posthog-js';

const WANT_KIDS_LABELS = [
  { value: '1', answer_text: "DON'T WANT" },
  { value: '2', answer_text: 'DOUBTFUL' },
  { value: '3', answer_text: 'UNSURE' },
  { value: '4', answer_text: 'EVENTUALLY' },
  { value: '5', answer_text: 'WANT' },
];

// "Have kids" is a yes/no question: only the two ends are selectable.
const HAVE_KIDS_LABELS = [
  { value: '1', answer_text: "DON'T HAVE" },
  { value: '5', answer_text: 'HAVE' },
];

export default function KidsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string>('');

  // Hardcoded kids question IDs from Django database (question_number=10)
  const kidsQuestionIds = {
    'Have': '4be86e73-87be-4c81-a66a-5490255f3e3b',        // Group 1: Have Kids
    'Want': 'b3d3b8c8-f1ef-43ce-8e36-1b78b75848c6'         // Group 2: Want Kids
  };

  // Hardcoded kids labels
  const kidsLabels = ['WANT KIDS', 'HAVE KIDS'];

  // State for 2 kids sliders
  const kidsKeys = ['kids1', 'kids2'] as const;
  const meOpenKeys = ['kids1MeOpen', 'kids2MeOpen'] as const;
  const lookingOpenKeys = ['kids1LookingOpen', 'kids2LookingOpen'] as const;
  type KidsKey = (typeof kidsKeys)[number];
  type MeOpenKey = (typeof meOpenKeys)[number];
  type LookingOpenKey = (typeof lookingOpenKeys)[number];

  const [myKids, setMyKids] = useState<Record<KidsKey, number>>({
    kids1: 3, // Want Kids
    kids2: 5  // Have Kids (default to 5)
  });

  const [lookingFor, setLookingFor] = useState<Record<KidsKey, number>>({
    kids1: 3, // Want Kids
    kids2: 5  // Have Kids (default to 5)
  });

  const [openToAll, setOpenToAll] = useState<Record<MeOpenKey | LookingOpenKey, boolean>>({
    kids1MeOpen: false,
    kids2MeOpen: false,
    // Open-to-all starts off, like every other question — the user opts in.
    kids1LookingOpen: false,
    kids2LookingOpen: false
  });

  const [importance, setImportance] = useState({
    me: 1,
    lookingFor: 3
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const [excluded, setExcluded] = useState<Record<KidsKey, number[]>>({ kids1: [], kids2: [] });
  const [questionNote, setQuestionNote] = useState('');

  const blockedExclusions = (key: KidsKey) =>
    openToAll[`${key}MeOpen` as MeOpenKey] ? [] : [myKids[key]];

  const setExcludedFor = (key: KidsKey, values: number[], isBinary: boolean) =>
    setExcluded(prev => ({
      ...prev,
      [key]: normalizeExcludedValues(
        values,
        isBinary ? [1, 5] : DEFAULT_EXCLUSION_VALUES,
        blockedExclusions(key)
      ),
    }));

  // URL param first, then the persisted copy — this step used to read the query string
  // only, so returning to it without one silently broke every save.
  useEffect(() => {
    const resolved = resolveOnboardingUserId(searchParams.get('user_id'));
    if (!resolved) {
      router.replace('/auth/register?reason=session_expired');
      return;
    }
    setUserId(resolved);
  }, [searchParams, router]);

  const handleSliderChange = (section: 'myKids' | 'lookingFor', key: KidsKey, value: number) => {
    console.log(`🎚️ Slider changed: ${key} = ${value} (${section})`);
    
    // For "Have Kids" (kids2), only allow values 1 or 5
    let finalValue = value;
    if (key === 'kids2') {
      // Snap to closest end (1 or 5)
      finalValue = value <= 3 ? 1 : 5;
    }
    
    if (section === 'myKids') {
      setMyKids(prev => ({ ...prev, [key]: finalValue }));
    } else {
      setLookingFor(prev => ({ ...prev, [key]: finalValue }));
    }
  };

  const handleOpenToAllToggle = (key: MeOpenKey | LookingOpenKey) => {
    console.log(`🔄 OTA toggle: ${key}`);
    setOpenToAll(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLookingForImportanceChange = (value: number) => {
    setImportance(prev => ({ ...prev, lookingFor: value }));
  };

  const handleNext = async () => {
    console.log('➡️ Next button clicked');
    console.log('👶 My Kids answers:', myKids);
    console.log('👶 Looking For answers:', lookingFor);
    console.log('👶 Open to all:', openToAll);

    setLoading(true);
    setError('');

    try {
      // Create user answers for both kids questions
      const userAnswers: Array<Record<string, string | number | boolean | number[] | undefined>> = [];

      // Kids 1 (Want Kids)
      userAnswers.push({
        user_id: userId,
        question_id: kidsQuestionIds.Want,
        me_answer: openToAll.kids1MeOpen ? 6 : myKids.kids1,
        me_open_to_all: openToAll.kids1MeOpen,
        me_importance: importance.me,
        me_share: true,
        looking_for_answer: openToAll.kids1LookingOpen ? 6 : lookingFor.kids1,
        looking_for_open_to_all: openToAll.kids1LookingOpen,
        looking_for_importance: importance.lookingFor,
        looking_for_share: true,
        excluded_answer_values: normalizeExcludedValues(
          excluded.kids1, DEFAULT_EXCLUSION_VALUES, blockedExclusions('kids1')
        ),
        me_note: questionNote
      });

      // Kids 2 (Have Kids)
      userAnswers.push({
        user_id: userId,
        question_id: kidsQuestionIds.Have,
        me_answer: openToAll.kids2MeOpen ? 6 : myKids.kids2,
        me_open_to_all: openToAll.kids2MeOpen,
        me_importance: importance.me,
        me_share: true,
        looking_for_answer: openToAll.kids2LookingOpen ? 6 : lookingFor.kids2,
        looking_for_open_to_all: openToAll.kids2LookingOpen,
        looking_for_importance: importance.lookingFor,
        looking_for_share: true,
        excluded_answer_values: normalizeExcludedValues(
          excluded.kids2, [1, 5], blockedExclusions('kids2')
        ),
        me_note: questionNote
      });

      // Save answers in background (optimistic approach)
      const saveAnswersInBackground = async () => {
        try {
          console.log('🚀 Starting to save kids answers to backend...');
          console.log('📊 User answers:', userAnswers);

          for (const userAnswer of userAnswers) {
            const response = await fetch(getApiUrl(API_ENDPOINTS.ANSWERS), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(userAnswer)
            });

            console.log('📡 Response status:', response.status);

            if (!response.ok) {
              const errorText = await response.text();
              console.error('❌ API request failed:', response.status, errorText);
            } else {
              const responseData = await response.json();
              console.log('✅ API request successful:', responseData);
            }
          }

          console.log('✅ All kids answers processed');
        } catch (error) {
          console.error('❌ Error saving kids answers to backend:', error);
        }
      };

      // Start background save (don't await)
      console.log('👶 About to start background save...');
      saveAnswersInBackground();
      console.log('👶 Background save function called');
      
      // Set flag so profile page shows loading UI instead of spinner
      sessionStorage.setItem('show_loading_page', 'true');
      
      // Continue with navigation immediately to profile page
      console.log('👶 Continuing with navigation...');
      
      // Track question 10 as answered for introcard routing
      try {
        const key = `onboarding_answered_numbers_${userId}`;
        const existing: number[] = JSON.parse(localStorage.getItem(key) || '[]');
        if (!existing.includes(10)) { existing.push(10); localStorage.setItem(key, JSON.stringify(existing)); }
      } catch {}

      // Mark mandatory questions as complete so gated pages unlock instantly
      localStorage.setItem(`mandatory_questions_complete_${userId}`, 'true');
      localStorage.removeItem('mandatory_questions_complete');
      posthog.capture('onboarding_step_completed', { step: 'kids', question_number: 10 });
      posthog.capture('onboarding_completed');

      // Navigate directly to profile page (it will show loading UI if needed)
      const params = new URLSearchParams({
        user_id: userId
      });

      router.push(`/profile?${params.toString()}`);
    } catch (error) {
      console.error('Error saving kids answers:', error);
      setError(error instanceof Error ? error.message : 'Failed to save answers');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const params = new URLSearchParams({ 
      user_id: userId
    });
    
    router.push(`/auth/question/9?${params.toString()}`);
  };

  const kidsRows: Array<{
    key: KidsKey;
    label: string;
    labels: typeof WANT_KIDS_LABELS;
    isBinary: boolean;
  }> = [
    { key: kidsKeys[0], label: kidsLabels[0], labels: WANT_KIDS_LABELS, isBinary: false },
    { key: kidsKeys[1], label: kidsLabels[1], labels: HAVE_KIDS_LABELS, isBinary: true },
  ];

  return (
    <OnboardingShell
      progressPercent={100}
      onBack={handleBack}
      onNext={handleNext}
      loadingLabel="Saving..."
      loading={loading}
      questionNote={questionNote}
      onQuestionNoteChange={setQuestionNote}
    >
      <div className="mx-auto w-full min-w-0 max-w-[100%] sm:max-w-[640px] md:max-w-[630px] lg:max-w-[792px]">
        <OnboardingTitle step="10. Kids" question="What are your thoughts on kids?" />

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded border border-red-400 bg-red-100 p-3 text-red-700">
            {error}
          </div>
        )}

        {/* Them Section */}
        <div className="mb-2">
          <h3 className="-mb-2 text-center text-lg font-bold text-black">
            Them
          </h3>


          <div className="space-y-1">
            {kidsRows.map(({ key, label, labels, isBinary }, index) => (
              <AnswerSliderRow
                key={`looking-${key}`}
                label={label}
                labels={labels}
                value={lookingFor[key]}
                onChange={(value) => handleSliderChange('lookingFor', key, value)}
                showOta
                otaChecked={openToAll[lookingOpenKeys[index]]}
                onOtaToggle={() => handleOpenToAllToggle(lookingOpenKeys[index])}
                showExclude
                excludedValues={excluded[key]}
                allowedExclusionValues={isBinary ? [1, 5] : DEFAULT_EXCLUSION_VALUES}
                blockedExclusionValues={blockedExclusions(key)}
                onExcludedValuesChange={(values) => setExcludedFor(key, values, isBinary)}
              />
            ))}

          </div>
        </div>

        {/* Me Section */}
        <div className="mb-2 pt-1">
          <h3 className="-mb-2 text-center text-lg font-bold">Me</h3>


          <div className="space-y-1">
            {kidsRows.map(({ key, label, labels, isBinary }, index) => (
              <AnswerSliderRow
                key={`me-${key}`}
                label={label}
                labels={labels}
                value={myKids[key]}
                onChange={(value) => handleSliderChange('myKids', key, value)}
                showOta
                otaChecked={openToAll[meOpenKeys[index]]}
                onOtaToggle={() => handleOpenToAllToggle(meOpenKeys[index])}
                showNote={index === 0}
                note={questionNote}
                onNoteChange={setQuestionNote}
              />
            ))}
          </div>
        </div>

        <div className="mb-2 pt-1">
          <h3 className="-mb-2 text-center text-lg font-bold">Importance</h3>

          <AnswerSliderRow
            label="IMPORTANCE"
            labels={IMPORTANCE_LABELS}
            value={importance.lookingFor}
            onChange={handleLookingForImportanceChange}
            isImportance
            hideRowLabel
          />
        </div>
      </div>
    </OnboardingShell>
  );
}
