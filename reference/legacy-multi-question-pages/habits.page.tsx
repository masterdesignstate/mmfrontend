'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
import AnswerSliderRow from '@/components/AnswerSliderRow';
import OnboardingShell, { OnboardingTitle } from '@/components/OnboardingShell';
import { IMPORTANCE_LABELS } from '@/constants/answerLabels';
import { DEFAULT_EXCLUSION_VALUES, normalizeExcludedValues } from '@/utils/exclusionValues';
import posthog from 'posthog-js';

const HABITS_LABELS = [
  { value: '1', answer_text: 'NEVER' },
  { value: '2', answer_text: 'RARELY' },
  { value: '3', answer_text: 'SOMETIMES' },
  { value: '4', answer_text: 'REGULARLY' },
  { value: '5', answer_text: 'DAILY' },
];

export default function HabitsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string>('');
  // Removed questions state - using hardcoded data only

  // Hardcoded habits question IDs from Django database (question_number=7)
  const habitsQuestionIds = {
    'Alcohol': 'befc610f-6fda-4b0e-9b5a-8100ec0d14e7',        // Group 1: Alcohol
    'Cigarettes': '13d18dd3-00c1-4f86-9337-24fc07e24091',     // Group 2: Cigarettes
    'Vape': '07453d3e-5f22-4b73-9cd5-a09520b412b5'             // Group 3: Vape
  };

  // Hardcoded habits labels
  const habitsLabels = ['ALCOHOL', 'CIGARETTES', 'VAPE'];

  // State for 3 habits sliders
  const habitKeys = ['habit1', 'habit2', 'habit3'] as const;
  const meOpenKeys = ['habit1MeOpen', 'habit2MeOpen', 'habit3MeOpen'] as const;
  const lookingOpenKeys = ['habit1LookingOpen', 'habit2LookingOpen', 'habit3LookingOpen'] as const;
  type HabitKey = (typeof habitKeys)[number];
  type MeOpenKey = (typeof meOpenKeys)[number];
  type LookingOpenKey = (typeof lookingOpenKeys)[number];

  const [myHabits, setMyHabits] = useState<Record<HabitKey, number>>({
    habit1: 3,
    habit2: 3,
    habit3: 3
  });

  const [lookingFor, setLookingFor] = useState<Record<HabitKey, number>>({
    habit1: 3,
    habit2: 3,
    habit3: 3
  });

  const [openToAll, setOpenToAll] = useState<Record<MeOpenKey | LookingOpenKey, boolean>>({
    habit1MeOpen: false,
    habit2MeOpen: false,
    habit3MeOpen: false,
    // Open-to-all starts off, like every other question — the user opts in.
    habit1LookingOpen: false,
    habit2LookingOpen: false,
    habit3LookingOpen: false
  });

  const [importance, setImportance] = useState({
    me: 1,
    lookingFor: 3
  });

  const [loading, setLoading] = useState(false);
  // Removed loadingQuestions state - no longer fetching data
  const [error, setError] = useState<string>('');
  // Removed exerciseQuestion state - not needed for habits page

  const [excluded, setExcluded] = useState<Record<HabitKey, number[]>>({
    habit1: [], habit2: [], habit3: []
  });
  const [questionNote, setQuestionNote] = useState('');

  const blockedExclusions = (key: HabitKey) =>
    openToAll[`${key}MeOpen` as MeOpenKey] ? [] : [myHabits[key]];

  const setExcludedFor = (key: HabitKey, values: number[]) =>
    setExcluded(prev => ({
      ...prev,
      [key]: normalizeExcludedValues(values, DEFAULT_EXCLUSION_VALUES, blockedExclusions(key)),
    }));

  
  // Removed nextQuestions state - not needed for habits page

  useEffect(() => {
    const userIdParam = searchParams.get('user_id');
    const questionsParam = searchParams.get('questions');
    
    console.log('🔍 Habits Page Load - URL Params:', {
      userIdParam,
      questionsParam: questionsParam ? 'present' : 'missing',
      questionsParamLength: questionsParam?.length
    });
    
    // Get userId from URL params first, then try localStorage as fallback
    if (userIdParam) {
      setUserId(userIdParam);
      console.log('📋 Set userId from URL param:', userIdParam);
    } else {
      // Try to get user_id from localStorage (set during login)
      const storedUserId = localStorage.getItem('user_id');
      if (storedUserId) {
        setUserId(storedUserId);
        console.log('📋 Set userId from localStorage:', storedUserId);
      } else {
        console.log('❌ No userId found in URL params or localStorage');
      }
    }
    
    // Removed questions parameter parsing - using hardcoded data only
  }, [searchParams]);

  // Removed habits questions fetching - using hardcoded data only

  // Removed next questions fetching - not needed for habits page

  // Removed fetchExerciseQuestion function - not needed for habits page

  const handleSliderChange = (section: 'myHabits' | 'lookingFor' | 'importance', habitKey?: HabitKey, value?: number) => {
    if (section === 'myHabits' && habitKey && value !== undefined) {
      setMyHabits(prev => ({ ...prev, [habitKey]: value }));
    } else if (section === 'lookingFor' && habitKey && value !== undefined) {
      setLookingFor(prev => ({ ...prev, [habitKey]: value }));
    } else if (section === 'importance' && value !== undefined) {
      setImportance(prev => ({ ...prev, me: value }));
    }
  };

  const handleLookingForImportanceChange = (value: number) => {
    setImportance(prev => ({ ...prev, lookingFor: value }));
  };

  const handleOpenToAllToggle = (switchType: MeOpenKey | LookingOpenKey) => {
    setOpenToAll(prev => ({ ...prev, [switchType]: !prev[switchType] }));
  };

  const handleNext = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Prepare user answers for all 3 habits questions using hardcoded question IDs
      const userAnswers: Array<{
        user_id: string;
        question_id: string;
        me_answer: number;
        me_open_to_all: boolean;
        me_importance: number;
        me_share: boolean;
        looking_for_answer: number;
        looking_for_open_to_all: boolean;
        looking_for_importance: number;
        looking_for_share: boolean;
        excluded_answer_values: number[];
        me_note: string;
      }> = [];
      
      // Habit 1 (Alcohol)
      userAnswers.push({
        user_id: userId,
        question_id: habitsQuestionIds.Alcohol,
        me_answer: openToAll.habit1MeOpen ? 6 : myHabits.habit1,
        me_open_to_all: openToAll.habit1MeOpen,
        me_importance: importance.me,
        me_share: true,
        looking_for_answer: openToAll.habit1LookingOpen ? 6 : lookingFor.habit1,
        looking_for_open_to_all: openToAll.habit1LookingOpen,
        looking_for_importance: importance.lookingFor,
        looking_for_share: true,
        excluded_answer_values: normalizeExcludedValues(
          excluded.habit1, DEFAULT_EXCLUSION_VALUES, blockedExclusions('habit1')
        ),
        me_note: questionNote
      });

      // Habit 2 (Cigarettes)
      userAnswers.push({
        user_id: userId,
        question_id: habitsQuestionIds.Cigarettes,
        me_answer: openToAll.habit2MeOpen ? 6 : myHabits.habit2,
        me_open_to_all: openToAll.habit2MeOpen,
        me_importance: importance.me,
        me_share: true,
        looking_for_answer: openToAll.habit2LookingOpen ? 6 : lookingFor.habit2,
        looking_for_open_to_all: openToAll.habit2LookingOpen,
        looking_for_importance: importance.lookingFor,
        looking_for_share: true,
        excluded_answer_values: normalizeExcludedValues(
          excluded.habit2, DEFAULT_EXCLUSION_VALUES, blockedExclusions('habit2')
        ),
        me_note: questionNote
      });

      // Habit 3 (Vape)
      userAnswers.push({
        user_id: userId,
        question_id: habitsQuestionIds.Vape,
        me_answer: openToAll.habit3MeOpen ? 6 : myHabits.habit3,
        me_open_to_all: openToAll.habit3MeOpen,
        me_importance: importance.me,
        me_share: true,
        looking_for_answer: openToAll.habit3LookingOpen ? 6 : lookingFor.habit3,
        looking_for_open_to_all: openToAll.habit3LookingOpen,
        looking_for_importance: importance.lookingFor,
        looking_for_share: true,
        excluded_answer_values: normalizeExcludedValues(
          excluded.habit3, DEFAULT_EXCLUSION_VALUES, blockedExclusions('habit3')
        ),
        me_note: questionNote
      });

      // Save answers in background (optimistic approach)
      const saveAnswersInBackground = async () => {
        try {
          console.log('🚀 Starting to save habits answers to backend...');
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

          console.log('✅ All habits answers processed');
        } catch (error) {
          console.error('❌ Error saving habits answers to backend:', error);
        }
      };

      // Start background save (don't await)
      console.log('🏃 About to start background save...');
      saveAnswersInBackground();
      console.log('🏃 Background save function called');
      
      // Continue with navigation immediately
      console.log('🏃 Continuing with navigation...');
      
      // Track question 7 as answered for introcard routing
      try {
        const key = `onboarding_answered_numbers_${userId}`;
        const existing: number[] = JSON.parse(localStorage.getItem(key) || '[]');
        if (!existing.includes(7)) { existing.push(7); localStorage.setItem(key, JSON.stringify(existing)); }
      } catch {}

      // Navigate to next onboarding step immediately
      const params = new URLSearchParams({
        user_id: userId
      });

      posthog.capture('onboarding_step_completed', { step: 'habits', question_number: 7 });
      router.push(`/auth/question/8?${params.toString()}`);
    } catch (error) {
      console.error('Error saving habits answers:', error);
      setError(error instanceof Error ? error.message : 'Failed to save answers');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const params = new URLSearchParams({ 
      user_id: userId
    });
    
    router.push(`/auth/question/6?${params.toString()}`);
  };

  // Slider component - EXACT COPY from gender page
  const habitRows = habitKeys.map((key, index) => ({
    key,
    index,
    label: habitsLabels[index],
  }));

  return (
    <OnboardingShell
      progressPercent={70}
      onBack={handleBack}
      onNext={handleNext}
      loadingLabel="Saving..."
      loading={loading}
      questionNote={questionNote}
      onQuestionNoteChange={setQuestionNote}
    >
      <div className="mx-auto w-full min-w-0 max-w-[100%] sm:max-w-[640px] md:max-w-[630px] lg:max-w-[792px]">
        <OnboardingTitle step="7. Habits" question="How often do you engage in these habits?" />

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
            {habitRows.map(({ key, index, label }) => (
              <AnswerSliderRow
                key={`looking-${key}`}
                label={label}
                labels={HABITS_LABELS}
                value={lookingFor[key]}
                onChange={(value) => handleSliderChange('lookingFor', key, value)}
                showOta
                otaChecked={openToAll[lookingOpenKeys[index]]}
                onOtaToggle={() => handleOpenToAllToggle(lookingOpenKeys[index])}
                showExclude
                excludedValues={excluded[key]}
                allowedExclusionValues={DEFAULT_EXCLUSION_VALUES}
                blockedExclusionValues={blockedExclusions(key)}
                onExcludedValuesChange={(values) => setExcludedFor(key, values)}
              />
            ))}

          </div>
        </div>

        {/* Me Section */}
        <div className="mb-2 pt-1">
          <h3 className="-mb-2 text-center text-lg font-bold">Me</h3>


          <div className="space-y-1">
            {habitRows.map(({ key, index, label }) => (
              <AnswerSliderRow
                key={`me-${key}`}
                label={label}
                labels={HABITS_LABELS}
                value={myHabits[key]}
                onChange={(value) => handleSliderChange('myHabits', key, value)}
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
