'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
import AnswerSliderRow from '@/components/AnswerSliderRow';
import OnboardingShell, { OnboardingTitle } from '@/components/OnboardingShell';
import { DEFAULT_SCALE_LABELS, IMPORTANCE_LABELS } from '@/constants/answerLabels';
import { DEFAULT_EXCLUSION_VALUES, normalizeExcludedValues } from '@/utils/exclusionValues';
import { resolveOnboardingUserId } from '@/utils/userSession';
import posthog from 'posthog-js';

type GenderKey = 'male' | 'female';

export default function GenderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string>('');

  // State for MALE/FEMALE sliders
  const [myGender, setMyGender] = useState({
    male: 3,
    female: 3
  });

  const [lookingFor, setLookingFor] = useState({
    male: 3,
    female: 3
  });

  const [openToAll, setOpenToAll] = useState({
    maleMeOpen: false,
    femaleMeOpen: false,
    // Open-to-all starts off, like every other question — the user opts in.
    maleLookingOpen: false,
    femaleLookingOpen: false
  });

  const [importance, setImportance] = useState({
    me: 3,
    lookingFor: 3
  });

  // Exclusions stay per answer; the note belongs to the whole Gender question.
  const [excluded, setExcluded] = useState<Record<GenderKey, number[]>>({ male: [], female: [] });
  const [questionNote, setQuestionNote] = useState('');

  const [error, setError] = useState<string>('');

  const blockedExclusions = (gender: GenderKey) =>
    openToAll[`${gender}MeOpen` as const] ? [] : [myGender[gender]];

  const setExcludedFor = (gender: GenderKey, values: number[]) =>
    setExcluded(prev => ({
      ...prev,
      [gender]: normalizeExcludedValues(values, DEFAULT_EXCLUSION_VALUES, blockedExclusions(gender)),
    }));

  // Hardcoded question IDs for gender questions
  const genderQuestionIds = {
    male: 'bfc597fe-fa90-46b3-9ac8-e98968b46efa',    // Group 1
    female: '45e0858e-8870-4378-ac4a-02e1043b5c2e'  // Group 2
  };

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

  const handleSliderChange = (section: 'myGender' | 'lookingFor' | 'importance', gender: string, value: number) => {
    if (section === 'myGender') {
      setMyGender(prev => ({ ...prev, [gender]: value }));
    } else if (section === 'lookingFor') {
      setLookingFor(prev => ({ ...prev, [gender]: value }));
    } else if (section === 'importance') {
      setImportance(prev => ({ ...prev, [gender]: value }));
    }
  };

  const handleOpenToAllToggle = (switchType: 'maleMeOpen' | 'femaleMeOpen' | 'maleLookingOpen' | 'femaleLookingOpen') => {
    setOpenToAll(prev => ({ ...prev, [switchType]: !prev[switchType] }));
  };

  const handleNext = async () => {
    if (!userId) {
      console.error('❌ User ID is required');
      return;
    }

    console.log('🚀 Gender page - Starting optimistic navigation to ethnicity');

    // Track question 2 as answered for introcard routing
    try {
      const key = `onboarding_answered_numbers_${userId}`;
      const existing: number[] = JSON.parse(localStorage.getItem(key) || '[]');
      if (!existing.includes(2)) { existing.push(2); localStorage.setItem(key, JSON.stringify(existing)); }
    } catch {}

    // Navigate immediately to ethnicity page (optimistic)
    const params = new URLSearchParams({
      user_id: userId
    });
    posthog.capture('onboarding_step_completed', { step: 'gender', question_number: 2 });
    router.push(`/auth/ethnicity?${params.toString()}`);

    // Save answers in background
    const saveAnswersInBackground = async () => {
      try {
        console.log('💾 Gender page - Starting background save...');
        
        // Prepare user answers for Male/Female questions
        const userAnswers = [
          {
            user_id: userId,
            question_id: genderQuestionIds.male,
            me_answer: openToAll.maleMeOpen ? 6 : myGender.male,
            me_open_to_all: openToAll.maleMeOpen,
            me_importance: importance.me,
            me_share: true,
            looking_for_answer: openToAll.maleLookingOpen ? 6 : lookingFor.male,
            looking_for_open_to_all: openToAll.maleLookingOpen,
            looking_for_importance: importance.lookingFor,
            looking_for_share: true,
            excluded_answer_values: normalizeExcludedValues(
              excluded.male,
              DEFAULT_EXCLUSION_VALUES,
              blockedExclusions('male')
            ),
            me_note: questionNote
          },
          {
            user_id: userId,
            question_id: genderQuestionIds.female,
            me_answer: openToAll.femaleMeOpen ? 6 : myGender.female,
            me_open_to_all: openToAll.femaleMeOpen,
            me_importance: importance.me,
            me_share: true,
            looking_for_answer: openToAll.femaleLookingOpen ? 6 : lookingFor.female,
            looking_for_open_to_all: openToAll.femaleLookingOpen,
            looking_for_importance: importance.lookingFor,
            looking_for_share: true,
            excluded_answer_values: normalizeExcludedValues(
              excluded.female,
              DEFAULT_EXCLUSION_VALUES,
              blockedExclusions('female')
            ),
            me_note: questionNote
          }
        ];

        // Save each user answer
        for (const userAnswer of userAnswers) {
          console.log('💾 Saving gender answer:', userAnswer.question_id);
          const response = await fetch(getApiUrl(API_ENDPOINTS.ANSWERS), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userAnswer)
          });

          if (!response.ok) {
            const data = await response.json();
            console.error('❌ Failed to save gender answer:', data);
            throw new Error(data.error || 'Failed to save answer');
          }
          console.log('✅ Gender answer saved successfully');
        }
        
        console.log('✅ All gender answers saved successfully');
      } catch (error) {
        console.error('❌ Error saving gender answers in background:', error);
      }
    };

    // Start background save (don't await)
    saveAnswersInBackground();
  };

  const handleBack = () => {
    const params = new URLSearchParams({ 
      user_id: userId
    });
    router.push(`/auth/relationship?${params.toString()}`);
  };


  const genderRows: Array<{ key: GenderKey; label: string }> = [
    { key: 'female', label: 'FEMALE' },
    { key: 'male', label: 'MALE' },
  ];

  return (
    <OnboardingShell
      progressPercent={20}
      onBack={handleBack}
      onNext={handleNext}
      questionNote={questionNote}
      onQuestionNoteChange={setQuestionNote}
    >
      <div className="mx-auto w-full min-w-0 max-w-[100%] sm:max-w-[640px] md:max-w-[630px] lg:max-w-[792px]">
        <OnboardingTitle step="2. Gender" question="What gender do you identify with?" />

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
            {genderRows.map(({ key, label }) => (
              <AnswerSliderRow
                key={`looking-${key}`}
                label={label}
                labels={DEFAULT_SCALE_LABELS}
                value={lookingFor[key]}
                onChange={(value) => handleSliderChange('lookingFor', key, value)}
                showOta
                otaChecked={openToAll[`${key}LookingOpen` as const]}
                onOtaToggle={() => handleOpenToAllToggle(`${key}LookingOpen` as const)}
                showExclude
                excludedValues={excluded[key]}
                allowedExclusionValues={DEFAULT_EXCLUSION_VALUES}
                blockedExclusionValues={blockedExclusions(key)}
                onExcludedValuesChange={(values) => setExcludedFor(key, values)}
              />
            ))}

          </div>
        </div>

        {/* Me Section — no OTA here: you answer for yourself. */}
        <div className="mb-2 pt-1">
          <h3 className="-mb-2 text-center text-lg font-bold">Me</h3>


          <div className="space-y-1">
            {genderRows.map(({ key, label }, index) => (
              <AnswerSliderRow
                key={`me-${key}`}
                label={label}
                labels={DEFAULT_SCALE_LABELS}
                value={myGender[key]}
                onChange={(value) => handleSliderChange('myGender', key, value)}
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
            onChange={(value) => handleSliderChange('importance', 'lookingFor', value)}
            isImportance
            hideRowLabel
          />
        </div>
      </div>
    </OnboardingShell>
  );
}
