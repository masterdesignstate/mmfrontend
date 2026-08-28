'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
import AnswerSliderRow, { RowHeading } from '@/components/AnswerSliderRow';
import OnboardingShell, { OnboardingTitle } from '@/components/OnboardingShell';
import { DEFAULT_SCALE_LABELS, IMPORTANCE_LABELS } from '@/constants/answerLabels';
import { DEFAULT_EXCLUSION_VALUES, normalizeExcludedValues } from '@/utils/exclusionValues';
import posthog from 'posthog-js';

type RelationshipKey = 'friend' | 'hookup' | 'date' | 'partner';


export default function RelationshipPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string>('');

  // Hardcoded relationship question labels
  const relationshipLabels = ['FRIEND', 'HOOKUP', 'DATE', 'PARTNER'];
  
  // Hardcoded relationship question IDs (question_number == 1)
  const relationshipQuestionIds = {
    friend: '0794e611-1552-4840-a968-a3296263f317',    // Group 1
    hookup: '18b3073e-fad2-45ee-b0b7-dfd99b9d23dd',   // Group 2
    date: '72efdf7a-7db2-472b-84a4-58fa4f7ad8c1',     // Group 3
    partner: '5e8dc25e-a417-421f-ad54-b136b7e54f34'   // Group 4
  };

  // State for relationship questions (4 sliders + importance)
  const [myAnswers, setMyAnswers] = useState({
    friend: 3,
    hookup: 3,
    date: 3,
    partner: 3
  });

  const [importance, setImportance] = useState({
    me: 3
  });

  // Relationship has no "Them" side — others match against your Me answer — so the row
  // control here is Exclude, the same as the questions page renders for question 1.
  const [excluded, setExcluded] = useState<Record<RelationshipKey, number[]>>({
    friend: [], hookup: [], date: [], partner: []
  });
  const [questionNote, setQuestionNote] = useState('');

  const blockedExclusions = (key: RelationshipKey) => [myAnswers[key]];

  const setExcludedFor = (key: RelationshipKey, values: number[]) =>
    setExcluded(prev => ({
      ...prev,
      [key]: normalizeExcludedValues(values, DEFAULT_EXCLUSION_VALUES, blockedExclusions(key)),
    }));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const userIdParam = searchParams.get('user_id');
    
    // Get userId from URL params first, then try localStorage as fallback
    if (userIdParam) {
      setUserId(userIdParam);
    } else {
      // Try to get user_id from localStorage (set during login)
      const storedUserId = localStorage.getItem('user_id');
      if (storedUserId) {
        setUserId(storedUserId);
      }
    }
  }, [searchParams]);


  const handleSliderChange = (questionKey: keyof typeof myAnswers, value: number) => {
    setMyAnswers(prev => ({ ...prev, [questionKey]: value }));
  };

  const handleNext = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Navigate to next page immediately (optimistic approach)
      const params = new URLSearchParams({ 
        user_id: userId
      });
      
      // Track question 1 as answered for introcard routing
      try {
        const key = `onboarding_answered_numbers_${userId}`;
        const existing: number[] = JSON.parse(localStorage.getItem(key) || '[]');
        if (!existing.includes(1)) { existing.push(1); localStorage.setItem(key, JSON.stringify(existing)); }
      } catch {}

      posthog.capture('onboarding_step_completed', { step: 'relationship', question_number: 1 });
      router.push(`/auth/gender?${params.toString()}`);

      // Save answers to backend in the background (don't wait for response)
      const saveAnswersInBackground = async () => {
        try {
          console.log('🚀 Starting to save relationship answers to backend...');
          console.log('📊 Current answers:', { myAnswers, importance });
          
          // Prepare user answers for each relationship question
          const userAnswers = Object.entries(myAnswers).map(([questionKey, answerValue]) => {
            const questionId = relationshipQuestionIds[questionKey as keyof typeof relationshipQuestionIds];

            return {
              user_id: userId,
              question_id: questionId,
              me_answer: answerValue,
              me_open_to_all: false,
              me_importance: importance.me,
              me_share: true,
              looking_for_answer: 1,
              looking_for_open_to_all: false,
              looking_for_importance: 1,
              looking_for_share: true,
              excluded_answer_values: normalizeExcludedValues(
                excluded[questionKey as RelationshipKey],
                DEFAULT_EXCLUSION_VALUES,
                blockedExclusions(questionKey as RelationshipKey)
              ),
              me_note: questionNote,
            };
          });

          console.log('🌐 Making API calls to:', getApiUrl(API_ENDPOINTS.ANSWERS));
          
          // Save each answer to backend
          const savePromises = userAnswers.map(async (userAnswer, index) => {
            console.log(`📤 Sending API request ${index + 1}/4:`, userAnswer);
            
            const response = await fetch(getApiUrl(API_ENDPOINTS.ANSWERS), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(userAnswer)
            });
            
            console.log(`📡 Response ${index + 1} status:`, response.status);
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`❌ API request ${index + 1} failed:`, response.status, errorText);
            } else {
              const responseData = await response.json();
              console.log(`✅ API request ${index + 1} successful:`, responseData);
            }
          });

          await Promise.all(savePromises);
          console.log('✅ All relationship answers processed');
        } catch (error) {
          console.error('❌ Error saving relationship answers to backend:', error);
        }
      };

      // Start background save (don't await)
      console.log('🎯 About to start background save...');
      saveAnswersInBackground();
      console.log('🎯 Background save function called');

    } catch (error: unknown) {
      console.error('❌ Error navigating to next page:', error);
      setError(error instanceof Error ? error.message : 'Failed to proceed');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const params = new URLSearchParams({ 
      user_id: userId
    });
    router.push(`/auth/introcard?${params.toString()}`);
  };

  return (
    <OnboardingShell
      progressPercent={30}
      onBack={handleBack}
      onNext={handleNext}
      loadingLabel="Saving..."
      loading={loading}
      questionNote={questionNote}
      onQuestionNoteChange={setQuestionNote}
    >
      <div className="mx-auto w-full min-w-0 max-w-[100%] sm:max-w-[640px] md:max-w-[630px] lg:max-w-[792px]">
        <OnboardingTitle step="1. Relationship" question="What relationship are you looking for?" />

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded border border-red-400 bg-red-100 p-3 text-red-700">
            {error}
          </div>
        )}

        {/* No Me heading: Relationship has no Them side to tell it apart from, so each
            sub-question heads its own section instead, as Importance does below. */}
        {relationshipLabels.map((label) => {
          const questionKey = label.toLowerCase() as keyof typeof myAnswers;

          return (
            <div key={label} className="mb-2">
              <RowHeading label={label} />

              <AnswerSliderRow
                label={label}
                hideRowLabel
                labels={DEFAULT_SCALE_LABELS}
                value={myAnswers[questionKey]}
                onChange={(value) => handleSliderChange(questionKey, value)}
                showExclude
                excludedValues={excluded[questionKey]}
                allowedExclusionValues={DEFAULT_EXCLUSION_VALUES}
                blockedExclusionValues={blockedExclusions(questionKey)}
                onExcludedValuesChange={(values) => setExcludedFor(questionKey, values)}
              />
            </div>
          );
        })}

        <div className="mb-2 pt-1">
          <h3 className="-mb-2 text-center text-lg font-bold">Importance</h3>

          <AnswerSliderRow
            label="IMPORTANCE"
            labels={IMPORTANCE_LABELS}
            value={importance.me}
            onChange={(value) => setImportance(prev => ({ ...prev, me: value }))}
            isImportance
            hideRowLabel
          />
        </div>
      </div>
    </OnboardingShell>
  );
}
