'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AnswerSliderRow from '@/components/AnswerSliderRow';
import OnboardingShell, { OnboardingTitle } from '@/components/OnboardingShell';
import type { GroupedOptionQuestion } from '@/components/onboarding/GroupedPickerStep';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
import { DEFAULT_SCALE_LABELS, IMPORTANCE_LABELS } from '@/constants/answerLabels';
import { getOnboardingStep } from '@/constants/mandatoryQuestions';
import type { AnswerValueLabel } from '@/utils/answerValues';
import { getAllowedExclusionValues, normalizeExcludedValues } from '@/utils/exclusionValues';

interface GroupedQuestionStepProps {
  questionNumber: number;
  /** The picker this option was chosen from; Save and Back both return there. */
  pickerRoute: string;
}

/**
 * The Me / Them / Importance sliders for one option of a grouped onboarding question
 * (Faith, Ideology). The picker passes the option as `question_data`.
 */
export default function GroupedQuestionStep({ questionNumber, pickerRoute }: GroupedQuestionStepProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = getOnboardingStep(questionNumber);
  const [userId, setUserId] = useState('');
  const [question, setQuestion] = useState<GroupedOptionQuestion | null>(null);

  const [myAnswer, setMyAnswer] = useState(3);
  const [lookingForAnswer, setLookingForAnswer] = useState(3);
  const [meOpenToAll, setMeOpenToAll] = useState(false);
  const [lookingForOpenToAll, setLookingForOpenToAll] = useState(false);
  const [importance, setImportance] = useState({ me: 3, lookingFor: 3 });
  const [excludedAnswerValues, setExcludedAnswerValues] = useState<number[]>([]);
  const [questionNote, setQuestionNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const allowedExclusionValues = useMemo(() => getAllowedExclusionValues(question), [question]);
  const blockedExclusionValues = useMemo(() => (meOpenToAll ? [] : [myAnswer]), [myAnswer, meOpenToAll]);

  useEffect(() => {
    setUserId(searchParams.get('user_id') || localStorage.getItem('user_id') || '');
    const questionData = searchParams.get('question_data');
    if (!questionData) return;
    try {
      setQuestion(JSON.parse(questionData));
    } catch {
      setError('Could not read this option. Go back and choose it again.');
    }
  }, [searchParams]);

  useEffect(() => {
    setExcludedAnswerValues(prev => normalizeExcludedValues(prev, allowedExclusionValues, blockedExclusionValues));
  }, [allowedExclusionValues, blockedExclusionValues]);

  const backToPicker = (extra: Record<string, string> = {}) => {
    const params = new URLSearchParams({ user_id: userId, ...extra });
    router.push(`${pickerRoute}?${params.toString()}`);
  };

  const handleSave = async () => {
    if (!userId || !question) {
      setError('Choose an option first.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.ANSWERS), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          question_id: question.id,
          me_answer: meOpenToAll ? 6 : myAnswer,
          me_open_to_all: meOpenToAll,
          me_importance: importance.me,
          me_share: true,
          looking_for_answer: lookingForOpenToAll ? 6 : lookingForAnswer,
          looking_for_open_to_all: lookingForOpenToAll,
          looking_for_importance: importance.lookingFor,
          looking_for_share: true,
          excluded_answer_values: normalizeExcludedValues(excludedAnswerValues, allowedExclusionValues, blockedExclusionValues),
          me_note: questionNote,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save answer');
      }
      backToPicker({ just_answered: question.id });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save answer');
    } finally {
      setLoading(false);
    }
  };

  const scaleLabels: AnswerValueLabel[] = question?.answers?.length ? question.answers : DEFAULT_SCALE_LABELS;
  const rowLabel = (question?.question_name || 'ANSWER').toUpperCase();

  return (
    <OnboardingShell
      progressPercent={null}
      onBack={() => backToPicker()}
      onNext={handleSave}
      nextLabel="Save"
      loadingLabel="Saving..."
      loading={loading}
      questionNote={questionNote}
      onQuestionNoteChange={setQuestionNote}
    >
      <div className="mx-auto w-full min-w-0 max-w-[100%] sm:max-w-[640px] md:max-w-[630px] lg:max-w-[792px]">
        <OnboardingTitle
          step={`${questionNumber}. ${question?.question_name || step?.label || ''}`}
          question={question?.text || step?.prompt || ''}
        />

        {error && <div className="mb-4 rounded border border-red-400 bg-red-100 p-3 text-red-700">{error}</div>}

        <div className="flex flex-col">
          <div className="order-2 mb-2 pt-1">
            <h3 className="-mb-2 text-center text-lg font-bold">Me</h3>
            <div className="space-y-1">
              <AnswerSliderRow
                label={rowLabel}
                hideRowLabel
                labels={scaleLabels}
                value={myAnswer}
                onChange={setMyAnswer}
                showOta={Boolean(question?.open_to_all_me)}
                otaChecked={meOpenToAll}
                onOtaToggle={() => setMeOpenToAll(open => !open)}
                showExclude
                excludedValues={excludedAnswerValues}
                allowedExclusionValues={allowedExclusionValues}
                blockedExclusionValues={blockedExclusionValues}
                onExcludedValuesChange={values =>
                  setExcludedAnswerValues(normalizeExcludedValues(values, allowedExclusionValues, blockedExclusionValues))
                }
                showNote
                note={questionNote}
                onNoteChange={setQuestionNote}
              />
            </div>
          </div>

          <div className="order-1 mb-2">
            <h3 className="-mb-2 text-center text-lg font-bold text-black">Them</h3>
            <div className="space-y-1">
              <AnswerSliderRow
                label={rowLabel}
                hideRowLabel
                labels={scaleLabels}
                value={lookingForAnswer}
                onChange={setLookingForAnswer}
                showOta={Boolean(question?.open_to_all_looking_for)}
                otaChecked={lookingForOpenToAll}
                onOtaToggle={() => setLookingForOpenToAll(open => !open)}
              />
            </div>
          </div>

          <div className="order-3 mb-2 pt-1">
            <h3 className="-mb-2 text-center text-lg font-bold">Importance</h3>
            <div className="space-y-1">
              <AnswerSliderRow
                label="THEM"
                labels={IMPORTANCE_LABELS}
                value={importance.lookingFor}
                onChange={value => setImportance(prev => ({ ...prev, lookingFor: value }))}
                isImportance
              />
              <AnswerSliderRow
                label="ME"
                labels={IMPORTANCE_LABELS}
                value={importance.me}
                onChange={value => setImportance(prev => ({ ...prev, me: value }))}
                isImportance
              />
            </div>
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}
