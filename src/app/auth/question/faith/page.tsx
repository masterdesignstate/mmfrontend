'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
import AnswerSliderRow, { AnswerScaleHeader } from '@/components/AnswerSliderRow';
import OnboardingShell, { OnboardingTitle } from '@/components/OnboardingShell';
import { DEFAULT_SCALE_LABELS, IMPORTANCE_LABELS } from '@/constants/answerLabels';
import type { AnswerValueLabel } from '@/utils/answerValues';
import { getAllowedExclusionValues, normalizeExcludedValues } from '@/utils/exclusionValues';

export default function FaithQuestionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string>('');
  const [question, setQuestion] = useState<{
    id: string;
    question_name: string;
    question_number: number;
    group_number?: number;
    group_name: string;
    text: string;
    answers: Array<{ value: string; answer_text: string }>;
    open_to_all_me: boolean;
    open_to_all_looking_for: boolean;
  } | null>(null);

  // State for single question slider
  const [myAnswer, setMyAnswer] = useState(3);
  const [lookingForAnswer, setLookingForAnswer] = useState(3);
  const [openToAll, setOpenToAll] = useState({
    answer1MeOpen: false,
    answer1LookingOpen: false
  });
  const [importance, setImportance] = useState({
    me: 3,
    lookingFor: 3
  });
  const [excludedAnswerValues, setExcludedAnswerValues] = useState<number[]>([]);
  const allowedExclusionValues = useMemo(
    () => getAllowedExclusionValues(question),
    [question]
  );
  const blockedExclusionValues = useMemo(
    () => openToAll.answer1MeOpen ? [] : [myAnswer],
    [myAnswer, openToAll.answer1MeOpen]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const userIdParam = searchParams.get('user_id');
    const faithParam = searchParams.get('faith');
    const questionDataParam = searchParams.get('question_data');
    
    console.log('🔍 Faith Question Page Load - URL Params:', {
      userIdParam,
      faithParam,
      questionDataParam: questionDataParam ? 'present' : 'missing'
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
    
    if (questionDataParam) {
      try {
        const parsedQuestion = JSON.parse(questionDataParam);
        setQuestion(parsedQuestion);
        console.log('📋 Received question from URL:', parsedQuestion);
        console.log('🔍 Faith question OTA settings from URL:', {
          number: parsedQuestion.question_number,
          group: parsedQuestion.group_name,
          ota_me: parsedQuestion.open_to_all_me,
          ota_looking: parsedQuestion.open_to_all_looking_for
        });
      } catch (error) {
        console.error('❌ Error parsing question from URL:', error);
      }
    } else {
      console.log('❌ No question_data parameter found in URL');
    }
  }, [searchParams]);

  const handleOpenToAllToggle = (switchType: string) => {
    setOpenToAll(prev => ({ ...prev, [switchType]: !prev[switchType as keyof typeof prev] }));
  };

  useEffect(() => {
    setExcludedAnswerValues(prev => normalizeExcludedValues(prev, allowedExclusionValues, blockedExclusionValues));
  }, [allowedExclusionValues, blockedExclusionValues]);

  const handleNext = async () => {
    if (!userId || !question) {
      setError('User ID and question are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Prepare user answer for the single question
      const userAnswer = {
        user_id: userId,
        question_id: question.id,
        me_answer: openToAll.answer1MeOpen ? 6 : myAnswer,
        me_open_to_all: openToAll.answer1MeOpen,
        me_importance: importance.me,
        me_share: true,
        looking_for_answer: openToAll.answer1LookingOpen ? 6 : lookingForAnswer,
        looking_for_open_to_all: openToAll.answer1LookingOpen,
        looking_for_importance: importance.lookingFor,
        looking_for_share: true,
        excluded_answer_values: normalizeExcludedValues(excludedAnswerValues, allowedExclusionValues, blockedExclusionValues)
      };

      // Save the user answer
      const response = await fetch(getApiUrl(API_ENDPOINTS.ANSWERS), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userAnswer)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save answer');
      }

      // Navigate back to faith list page with refresh flag
      const params = new URLSearchParams({ 
        user_id: userId,
        refresh: 'true'
      });
      router.push(`/auth/faith?${params.toString()}`);
    } catch (error) {
      console.error('Error saving faith answer:', error);
      setError(error instanceof Error ? error.message : 'Failed to save answer');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const params = new URLSearchParams({ 
      user_id: userId
    });
    router.push(`/auth/faith?${params.toString()}`);
  };

  const scaleLabels: AnswerValueLabel[] =
    question?.answers && question.answers.length > 0 ? question.answers : DEFAULT_SCALE_LABELS;

  return (
    <OnboardingShell
      progressPercent={null}
      onBack={handleBack}
      onNext={handleNext}
      nextLabel="Save"
      loadingLabel="Saving..."
      loading={loading}
    >
      <div className="mx-auto w-full min-w-0 max-w-[100%] sm:max-w-[640px] md:max-w-[630px] lg:max-w-[792px]">
        <OnboardingTitle
          step={`11. ${question?.question_name || 'Faith'}`}
          question={question?.text || 'Select a faith to answer'}
        />

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded border border-red-400 bg-red-100 p-3 text-red-700">
            {error}
          </div>
        )}

        {/* Me Section */}
        <div className="mb-2 sm:mb-6">
          <h3 className="mb-1 text-center text-lg font-bold sm:text-2xl">Me</h3>

          <AnswerScaleHeader
            labels={scaleLabels}
            showOta={Boolean(question?.open_to_all_me)}
            className="mb-2"
          />

          <div className="space-y-1 sm:space-y-3">
            <AnswerSliderRow
              label={(question?.question_name || 'ANSWER').toUpperCase()}
              labels={scaleLabels}
              value={myAnswer}
              onChange={setMyAnswer}
              showOta={Boolean(question?.open_to_all_me)}
              otaChecked={openToAll.answer1MeOpen}
              onOtaToggle={() => handleOpenToAllToggle('answer1MeOpen')}
              showExclude
              excludedValues={excludedAnswerValues}
              allowedExclusionValues={allowedExclusionValues}
              blockedExclusionValues={blockedExclusionValues}
              onExcludedValuesChange={(values) =>
                setExcludedAnswerValues(
                  normalizeExcludedValues(values, allowedExclusionValues, blockedExclusionValues)
                )
              }
            />

            <AnswerSliderRow
              label="IMPORTANCE"
              labels={IMPORTANCE_LABELS}
              value={importance.me}
              onChange={(value) => setImportance(prev => ({ ...prev, me: value }))}
              isImportance
              showActiveLabelBelow
            />
          </div>
        </div>

        {/* Them Section */}
        <div className="mb-2 pt-1 sm:mb-6 sm:pt-8">
          <h3 className="mb-1 text-center text-lg font-bold sm:text-2xl" style={{ color: '#672DB7' }}>
            Them
          </h3>

          <AnswerScaleHeader
            labels={scaleLabels}
            showOta={Boolean(question?.open_to_all_looking_for)}
            className="mb-2"
          />

          <div className="space-y-1 sm:space-y-3">
            <AnswerSliderRow
              label={(question?.question_name || 'ANSWER').toUpperCase()}
              labels={scaleLabels}
              value={lookingForAnswer}
              onChange={setLookingForAnswer}
              showOta={Boolean(question?.open_to_all_looking_for)}
              otaChecked={openToAll.answer1LookingOpen}
              onOtaToggle={() => handleOpenToAllToggle('answer1LookingOpen')}
            />

            <AnswerSliderRow
              label="IMPORTANCE"
              labels={IMPORTANCE_LABELS}
              value={importance.lookingFor}
              onChange={(value) => setImportance(prev => ({ ...prev, lookingFor: value }))}
              isImportance
              showActiveLabelBelow
            />
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}
