'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { mutate as globalMutate } from 'swr';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
import HamburgerMenu from '@/components/HamburgerMenu';
import ProtectedPageGate from '@/components/ProtectedPageGate';
import AnswerSliderRow, { AnswerScaleHeader } from '@/components/AnswerSliderRow';
import {
  MobileQuestionActionDock,
  MobileQuestionActionsProvider,
} from '@/components/MobileQuestionActions';
import { DEFAULT_SCALE_LABELS, IMPORTANCE_LABELS } from '@/constants/answerLabels';
import { normalizeEthnicityQuestions } from '@/utils/ethnicityQuestions';
import { getAnswerValues, getSliderLabelsForQuestion } from '@/utils/answerValues';
import type { AnswerValueLabel } from '@/utils/answerValues';
import { getAllowedExclusionValues, normalizeExcludedValues } from '@/utils/exclusionValues';
import posthog from 'posthog-js';

interface Question {
  id: string;
  question_name: string;
  question_number: number;
  group_number?: number;
  group_name: string;
  group_name_text?: string;
  question_type?: 'basic' | 'grouped' | 'double' | 'triple' | 'four';
  text: string;
  answers: AnswerValueLabel[];
  open_to_all_me: boolean;
  open_to_all_looking_for: boolean;
  is_answered?: boolean;  // From backend - whether current user has answered this question
  is_required_for_match?: boolean;  // From backend - whether this question is required for matching
}

interface UserAnswer {
  id: string;
  user: string;
  question: string | { id: string; [key: string]: any };
  me_answer: number;
  looking_for_answer: number;
  me_importance: number;
  looking_for_importance: number;
  me_open_to_all: boolean;
  looking_for_open_to_all: boolean;
  excluded_answer_values?: number[];
  /** Empty string when the viewer is not permitted to see it (stripped server-side). */
  me_note?: string;
}

const FREQUENCY_SCALE_LABELS = ['NEVER', 'RARELY', 'SOMETIMES', 'REGULARLY', 'DAILY'];
const POLITICS_SCALE_LABELS = ['UNINVOLVED', 'OBSERVANT', 'ACTIVE', 'FERVENT', 'RADICAL'];
const WANT_KIDS_SCALE_LABELS = ["DON'T WANT", 'DOUBTFUL', 'UNSURE', 'EVENTUALLY', 'WANT'];
const HAVE_KIDS_SCALE_LABELS = ["DON'T HAVE", 'HAVE'];

const getScaleLabelsForQuestion = (questionNumber: number, question?: Pick<Question, 'group_number'>) => {
  if ([6, 7, 8].includes(questionNumber)) return FREQUENCY_SCALE_LABELS;
  if (questionNumber === 9) return POLITICS_SCALE_LABELS;
  if (questionNumber === 10) {
    return question?.group_number === 1 ? HAVE_KIDS_SCALE_LABELS : WANT_KIDS_SCALE_LABELS;
  }
  return null;
};

const questionAllowsLookingOta = (question: Pick<Question, 'question_number' | 'open_to_all_looking_for'>) => (
  question.open_to_all_looking_for || [2, 3, 4, 5, 6, 7, 8, 9, 10, 13].includes(question.question_number)
);

const getRequiredOverrideKey = (userId: string, questionId: string) => (
  `question_required_override_${userId}_${questionId}`
);

// Template Components
const CardSelectionTemplate = ({
  questions,
  selectedOptions,
  setSelectedOptions,
  onSave,
  saving,
  router,
  userId
}: {
  questions: Question[];
  selectedOptions: string[];
  setSelectedOptions: (options: string[]) => void;
  onSave: () => void;
  saving: boolean;
  router: ReturnType<typeof useRouter>;
  userId: string;
}) => {
  const handleCardClick = (question: Question) => {
    // Navigate to slider page for this specific question (like onboarding)
    const params = new URLSearchParams({
      user_id: userId,
      question_data: JSON.stringify(question),
      from_questions_page: 'true'  // Flag to return to questions page after answering
    });

    router.push(`/auth/question/${question.question_number}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-lg mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">{questions[0]?.text || 'Select Options'}</h1>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {questions.map((question) => {
            return (
              <div
                key={question.id}
                onClick={() => handleCardClick(question)}
                className="relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 mb-3 flex items-center justify-center">
                    <Image
                      src="/assets/ethn.png"
                      alt={question.question_name}
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {question.question_name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const MultiSliderTemplate = ({
  questions,
  sliderCount,
  showImportance = false,
  sliderAnswers,
  setSliderAnswers,
  openToAllStates,
  setOpenToAllStates,
  importanceValues,
  setImportanceValues,
  onSave,
  saving,
  SliderComponent
}: {
  questions: Question[];
  sliderCount: number;
  showImportance?: boolean;
  sliderAnswers: Record<string, number>;
  setSliderAnswers: (answers: Record<string, number>) => void;
  openToAllStates: Record<string, boolean>;
  setOpenToAllStates: (states: Record<string, boolean>) => void;
  importanceValues: { me: number; lookingFor: number };
  setImportanceValues: (values: { me: number; lookingFor: number }) => void;
  onSave: () => void;
  saving: boolean;
  SliderComponent: any;
}) => {
  const renderTopLabels = () => {
    if (!questions || questions.length === 0 || !questions[0]?.answers || questions[0].answers.length === 0) {
      return (
        <div className="flex justify-between text-xs text-gray-500 mb-2 ml-16 sm:ml-20">
          <span>LESS</span>
          <span>MORE</span>
        </div>
      );
    }

    const sortedAnswers = [...questions[0].answers].sort((a, b) => Number(a.value) - Number(b.value));

    return (
      <div className="relative text-xs text-gray-500 mb-2" style={{ width: '500px', height: '14px' }}>
        {sortedAnswers.map((answer) => {
          const value = Number(answer.value);
          let leftPosition;

          if (value === 1) {
            leftPosition = '14px';
          } else if (value === 2) {
            leftPosition = '25%';
          } else if (value === 3) {
            leftPosition = '50%';
          } else if (value === 4) {
            leftPosition = '75%';
          } else if (value === 5) {
            leftPosition = 'calc(100% - 14px)';
          }

          return (
            <span
              key={value}
              className="absolute text-xs text-gray-500"
              style={{ left: leftPosition, transform: 'translateX(-50%)' }}
            >
              {(answer.answer_text || '').toUpperCase()}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-2xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">{questions[0]?.text || 'Question'}</h1>
        </div>

        <div className="flex items-center justify-center">
          <div style={{ width: '500px' }}>
            {/* Top labels */}
            {renderTopLabels()}

            {/* Me Section */}
            <div className="mb-8">
              <div className="flex justify-center mb-4">
                <h3 className="font-semibold text-lg">Me</h3>
              </div>

              <div className="space-y-4">
                {questions.slice(0, sliderCount).map((question, index) => (
                  <div key={question.id} className="flex items-center gap-4">
                    <div className="text-xs font-semibold text-gray-400 w-16 text-left">
                      {question.question_name.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <SliderComponent
                        value={sliderAnswers[`me_${question.id}`] || 3}
                        onChange={(value: number) => setSliderAnswers({
                          ...sliderAnswers,
                          [`me_${question.id}`]: value
                        })}
                        isOpenToAll={openToAllStates[`me_${question.id}_open`] || false}
                        labels={getSliderLabelsForQuestion(question.question_number, question.answers)}
                      />
                    </div>
                    {question.open_to_all_me ? (
                      <button
                        onClick={() => setOpenToAllStates({
                          ...openToAllStates,
                          [`me_${question.id}_open`]: !openToAllStates[`me_${question.id}_open`]
                        })}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-xs font-medium bg-white hover:bg-gray-50"
                      >
                        ALL
                      </button>
                    ) : (
                      <div className="w-8 h-8"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Them Section */}
            <div className="mb-8">
              <div className="flex justify-center mb-4">
                <h3 className="font-semibold text-lg" style={{ color: '#672DB7' }}>Them</h3>
              </div>

              <div className="space-y-4">
                {questions.slice(0, sliderCount).map((question, index) => (
                  <div key={question.id} className="flex items-center gap-4">
                    <div className="text-xs font-semibold text-gray-400 w-16 text-left">
                      {question.question_name.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <SliderComponent
                        value={sliderAnswers[`them_${question.id}`] || 3}
                        onChange={(value: number) => setSliderAnswers({
                          ...sliderAnswers,
                          [`them_${question.id}`]: value
                        })}
                        isOpenToAll={openToAllStates[`them_${question.id}_open`] || false}
                        labels={getSliderLabelsForQuestion(question.question_number, question.answers)}
                      />
                    </div>
                    {questionAllowsLookingOta(question) ? (
                      <button
                        onClick={() => setOpenToAllStates({
                          ...openToAllStates,
                          [`them_${question.id}_open`]: !openToAllStates[`them_${question.id}_open`]
                        })}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-xs font-medium bg-white hover:bg-gray-50"
                      >
                        ALL
                      </button>
                    ) : (
                      <div className="w-8 h-8"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Importance Section */}
            {showImportance && (
              <div className="mb-8">
                <div className="flex justify-center mb-4">
                  <h3 className="font-semibold text-lg">Importance</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="text-xs font-semibold text-gray-400 w-16 text-left">ME</div>
                    <div className="flex-1">
                      <SliderComponent
                        value={importanceValues.me}
                        onChange={(value: number) => setImportanceValues({
                          ...importanceValues,
                          me: value
                        })}
                        isImportance={true}
                        labels={IMPORTANCE_LABELS}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-xs font-semibold text-gray-400 w-16 text-left">THEM</div>
                    <div className="flex-1">
                      <SliderComponent
                        value={importanceValues.lookingFor}
                        onChange={(value: number) => setImportanceValues({
                          ...importanceValues,
                          lookingFor: value
                        })}
                        isImportance={true}
                        labels={IMPORTANCE_LABELS}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={onSave}
                disabled={saving}
                className="flex-1 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BasicSliderTemplate = ({
  question,
  sliderAnswers,
  setSliderAnswers,
  openToAllStates,
  setOpenToAllStates,
  importanceValues,
  setImportanceValues,
  onSave,
  saving,
  SliderComponent
}: {
  question: Question;
  sliderAnswers: Record<string, number>;
  setSliderAnswers: (answers: Record<string, number>) => void;
  openToAllStates: Record<string, boolean>;
  setOpenToAllStates: (states: Record<string, boolean>) => void;
  importanceValues: { me: number; lookingFor: number };
  setImportanceValues: (values: { me: number; lookingFor: number }) => void;
  onSave: () => void;
  saving: boolean;
  SliderComponent: any;
}) => {
  const renderTopLabels = () => {
    if (!question?.answers || question.answers.length === 0) {
      return (
        <div className="flex justify-between text-xs text-gray-500">
          <span>LESS</span>
          <span>MORE</span>
        </div>
      );
    }

    const sortedAnswers = [...question.answers].sort((a, b) => Number(a.value) - Number(b.value));

    return (
      <div className="relative text-xs text-gray-500" style={{ width: '500px', height: '14px' }}>
        {sortedAnswers.map((answer) => {
          const value = Number(answer.value);
          let leftPosition;

          if (value === 1) {
            leftPosition = '14px';
          } else if (value === 2) {
            leftPosition = '25%';
          } else if (value === 3) {
            leftPosition = '50%';
          } else if (value === 4) {
            leftPosition = '75%';
          } else if (value === 5) {
            leftPosition = 'calc(100% - 14px)';
          }

          return (
            <span
              key={value}
              className="absolute text-xs text-gray-500"
              style={{ left: leftPosition, transform: 'translateX(-50%)' }}
            >
              {(answer.answer_text || '').toUpperCase()}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-2xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">{question.text}</h1>
        </div>

        <div className="flex items-center justify-center">
          <div style={{ width: '500px' }}>
            {/* Top labels */}
            <div className="mb-4">
              {renderTopLabels()}
            </div>

            {/* Me Section */}
            <div className="mb-8">
              <div className="flex justify-center mb-4">
                <h3 className="font-semibold text-lg">Me</h3>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <SliderComponent
                    value={sliderAnswers[`me_${question.id}`] || 3}
                    onChange={(value: number) => setSliderAnswers({
                      ...sliderAnswers,
                      [`me_${question.id}`]: value
                    })}
                    isOpenToAll={openToAllStates[`me_${question.id}_open`] || false}
                    labels={getSliderLabelsForQuestion(question.question_number, question.answers)}
                  />
                </div>
                {question.open_to_all_me ? (
                  <button
                    onClick={() => setOpenToAllStates({
                      ...openToAllStates,
                      [`me_${question.id}_open`]: !openToAllStates[`me_${question.id}_open`]
                    })}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-xs font-medium bg-white hover:bg-gray-50"
                  >
                    ALL
                  </button>
                ) : (
                  <div className="w-8 h-8"></div>
                )}
              </div>
            </div>

            {/* Them Section */}
            <div className="mb-8">
              <div className="flex justify-center mb-4">
                <h3 className="font-semibold text-lg" style={{ color: '#672DB7' }}>Them</h3>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <SliderComponent
                    value={sliderAnswers[`them_${question.id}`] || 3}
                    onChange={(value: number) => setSliderAnswers({
                      ...sliderAnswers,
                      [`them_${question.id}`]: value
                    })}
                    isOpenToAll={openToAllStates[`them_${question.id}_open`] || false}
                    labels={getSliderLabelsForQuestion(question.question_number, question.answers)}
                  />
                </div>
                {questionAllowsLookingOta(question) ? (
                  <button
                    onClick={() => setOpenToAllStates({
                      ...openToAllStates,
                      [`them_${question.id}_open`]: !openToAllStates[`them_${question.id}_open`]
                    })}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-xs font-medium bg-white hover:bg-gray-50"
                  >
                    ALL
                  </button>
                ) : (
                  <div className="w-8 h-8"></div>
                )}
              </div>
            </div>

            {/* Importance Section */}
            <div className="mb-8">
              <div className="flex justify-center mb-4">
                <h3 className="font-semibold text-lg">Importance</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-xs font-semibold text-gray-400 w-16 text-left">ME</div>
                  <div className="flex-1">
                    <SliderComponent
                      value={importanceValues.me}
                      onChange={(value: number) => setImportanceValues({
                        ...importanceValues,
                        me: value
                      })}
                      isImportance={true}
                      labels={IMPORTANCE_LABELS}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-xs font-semibold text-gray-400 w-16 text-left">THEM</div>
                  <div className="flex-1">
                    <SliderComponent
                      value={importanceValues.lookingFor}
                      onChange={(value: number) => setImportanceValues({
                        ...importanceValues,
                        lookingFor: value
                      })}
                      isImportance={true}
                      labels={IMPORTANCE_LABELS}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={onSave}
                disabled={saving}
                className="flex-1 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function QuestionEditPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const questionNumber = parseInt(params.id as string);
  const isDemo = searchParams.get('demo') === 'true';

  const [userId, setUserId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [existingAnswers, setExistingAnswers] = useState<UserAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

  // State for different question types
  const [sliderAnswers, setSliderAnswers] = useState<Record<string, number>>({});
  const [openToAllStates, setOpenToAllStates] = useState<Record<string, boolean>>({});
  const [excludedAnswerValues, setExcludedAnswerValues] = useState<Record<string, number[]>>({});
  const [answerNotes, setAnswerNotes] = useState<Record<string, string>>({});
  const [importanceValues, setImportanceValues] = useState({ me: 3, lookingFor: 3 });
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [showAllGroupedOptions, setShowAllGroupedOptions] = useState(false);
  const [meShare, setMeShare] = useState(true);
  const [meRequired, setMeRequired] = useState(false);

  // Static importance labels for importance sliders
  // Question display names
  const questionTitles: Record<number, string> = {
    1: 'Relationship',
    2: 'Gender',
    3: 'Ethnicity',
    4: 'Education',
    5: 'Diet',
    6: 'Exercise',
    7: 'Habits',
    8: 'Politics',
    9: 'Faith',
    10: 'Kids'
  };

  const questionTexts: Record<number, string> = {
    1: 'What relationship are you looking for?',
    2: 'What gender do you identify with?',
    3: 'What ethnicity do you identify with?',
    4: 'What is your highest level of education?',
    5: 'Which diet best describes you?',
    6: 'How often do you exercise?',
    7: 'How often do you engage in these habits?',
    8: 'How important is religion in your life?',
    9: 'How important is politics in your life?',
    10: 'What are your thoughts on kids?'
  };

  // Cycle loading text
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingTextIndex(prev => (prev + 1) % 3);
    }, 1500);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedUserId = localStorage.getItem('user_id');
        if (!storedUserId && !isDemo) {
          router.push('/auth/login');
          return;
        }
        if (storedUserId) setUserId(storedUserId);

        const headers = { 'Content-Type': 'application/json' };

        if (isDemo) {
          // Demo mode: only fetch questions, no answers or required
          const questionsRes = await fetch(`${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=${questionNumber}`, { headers });
          const questionsData = await questionsRes.json();
          const rawQuestions = (questionsData.results || []) as Question[];
          const questionsList: Question[] = normalizeEthnicityQuestions(rawQuestions.sort(
            (a: Question, b: Question) => (a.group_number || 0) - (b.group_number || 0)
          ), questionNumber);
          setQuestions(questionsList);
          initializeAnswerState(questionsList, []);
        } else {
        // Fire all 3 requests in parallel instead of sequentially
        const [questionsRes, answersRes, requiredRes] = await Promise.all([
          fetch(`${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=${questionNumber}`, { headers }),
          // user_id identifies the viewer so the server returns this user's own me_note
          // rather than stripping it (see NoteVisibilityResolver on the backend).
          fetch(`${getApiUrl(API_ENDPOINTS.ANSWERS)}?user=${storedUserId}&user_id=${storedUserId}&question_number=${questionNumber}&page_size=100`, { headers }),
          fetch(`${getApiUrl(API_ENDPOINTS.USER_REQUIRED_QUESTIONS)}?user=${encodeURIComponent(storedUserId!)}&page_size=200`, { headers }),
        ]);

        // Process questions
        const questionsData = await questionsRes.json();
        const rawQuestions = (questionsData.results || []) as Question[];
        const questionsList: Question[] = normalizeEthnicityQuestions(rawQuestions.sort(
          (a: Question, b: Question) => (a.group_number || 0) - (b.group_number || 0)
        ), questionNumber);
        setQuestions(questionsList);

        // Process answers — already filtered by question_number on the server
        const answersData = answersRes.ok ? await answersRes.json() : { results: [] };
        const relevantAnswers: UserAnswer[] = answersData.results || [];
        setExistingAnswers(relevantAnswers);

        // Process required questions
        let requiredQuestionIds: string[] = [];
        if (requiredRes.ok) {
          const reqData = await requiredRes.json();
          requiredQuestionIds = (reqData.results ?? []).map((r: { question_id: string }) => r.question_id);
        }

        // Initialize state based on existing answers
        initializeAnswerState(questionsList, relevantAnswers);
        // Per-user required: user-facing switch must reflect UserRequiredQuestion only.
        // Question.is_required_for_match is an admin/default flag and should not re-enable
        // a non-mandatory question after the user turns this switch off.
        if (questionsList.length > 0 && questionNumber > 10 && questionsList[0].question_type !== 'grouped') {
          const firstQId = questionsList[0].id;
          const override = storedUserId
            ? sessionStorage.getItem(getRequiredOverrideKey(storedUserId, firstQId))
            : null;
          setMeRequired(override === null ? requiredQuestionIds.includes(firstQId) : override === 'true');
        }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load question');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [questionNumber, router, searchParams]);

  const initializeAnswerState = (questions: Question[], answers: any[]) => {
    const sliders: Record<string, number> = {};
    const openToAll: Record<string, boolean> = {};
    const exclusions: Record<string, number[]> = {};
    const notes: Record<string, string> = {};

    questions.forEach(question => {
      // Handle both cases: answer.question as object or as string
      const answer = answers.find(a => {
        const questionId = typeof a.question === 'object' ? a.question.id : a.question;
        return questionId === question.id;
      });
      const key = `q${question.group_number || question.id}`;
      
      if (answer) {
        sliders[`${key}_me`] = answer.me_answer;
        sliders[`${key}_looking`] = answer.looking_for_answer;
        openToAll[`${key}_me`] = answer.me_open_to_all;
        openToAll[`${key}_looking`] = answer.looking_for_open_to_all;
        exclusions[key] = normalizeExcludedValues(
          answer.excluded_answer_values,
          getAllowedExclusionValues(question),
          answer.me_open_to_all ? [] : [answer.me_answer || 3]
        );
        notes[key] = answer.me_note || '';

        setImportanceValues({
          me: answer.me_importance || 3,
          lookingFor: answer.looking_for_importance || 3
        });
        
        // Initialize meShare for non-grouped questions > 10
        if (question.question_number > 10 && question.question_type !== 'grouped') {
          setMeShare(answer.me_share !== false); // Default to true if not set
        }
      } else {
        // Default values
        sliders[`${key}_me`] = 3;
        sliders[`${key}_looking`] = 3;
        openToAll[`${key}_me`] = false;
        openToAll[`${key}_looking`] = false;
        exclusions[key] = [];
        notes[key] = '';
      }
    });

    setSliderAnswers(sliders);
    setOpenToAllStates(openToAll);
    setExcludedAnswerValues(exclusions);
    setAnswerNotes(notes);
    
    // For single-choice questions (3, 4, 5)
    if ([3, 4, 5].includes(questionNumber) && answers.length > 0) {
      const highestAnswer = answers.reduce((prev, curr) => 
        curr.me_answer > prev.me_answer ? curr : prev
      );
      const questionId = typeof highestAnswer.question === 'object' ? highestAnswer.question.id : highestAnswer.question;
      const question = questions.find(q => q.id === questionId);
      if (question) {
        setSelectedOption(question.question_name);
      }
    }
  };

  const handleSingleOptionClick = (question: Question) => {
    setSelectedOption(question.question_name);

    // Navigate to individual question slider page for this specific sub-question
    const params = new URLSearchParams();
    params.set('user_id', userId);
    params.set('question_number', questionNumber.toString());
    params.set('question_data', JSON.stringify(question));
    params.set('from_questions_page', 'true'); // Add flag to return to questions page after answering

    // Pass existing answer data so the destination page can show values instantly
    const existingAnswer = existingAnswers.find(a => {
      const qId = typeof a.question === 'object' ? a.question.id : a.question;
      return qId === question.id;
    });
    if (existingAnswer) {
      params.set('ea', JSON.stringify({
        me: existingAnswer.me_answer,
        lf: existingAnswer.looking_for_answer,
        mi: existingAnswer.me_importance,
        li: existingAnswer.looking_for_importance,
        mo: existingAnswer.me_open_to_all,
        lo: existingAnswer.looking_for_open_to_all,
        exc: normalizeExcludedValues(
          existingAnswer.excluded_answer_values,
          getAllowedExclusionValues(question),
          existingAnswer.me_open_to_all ? [] : [existingAnswer.me_answer || 3]
        ),
        note: existingAnswer.me_note || '',
      }));
    }

    // Map question numbers to their page routes (for special named routes like ethnicity, education, diet)
    const namedRoutes: Record<number, string> = {
      3: 'ethnicity',
      4: 'education',
      5: 'diet'
    };

    // For ethnicity/education/diet, also set the selection parameter
    if (questionNumber === 3) {
      params.set('ethnicity', question.question_name);
    } else if (questionNumber === 4) {
      params.set('education', question.question_name);
    } else if (questionNumber === 5) {
      params.set('diet', question.question_name);
    }

    // Use named route if available, otherwise use question number
    const route = namedRoutes[questionNumber] || questionNumber.toString();
    const fullUrl = `/auth/question/${route}?${params.toString()}`;

    // Navigate to auth-style individual question page for this option
    router.push(fullUrl);
  };

  const handleUndoAnswer = async () => {
    if (!confirm('Are you sure you want to clear your answer to this question? This will remove all your responses.')) return;

    setSaving(true);
    try {
      const response = await fetch(`${getApiUrl(API_ENDPOINTS.ANSWERS)}undo_question/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, question_number: questionNumber }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to undo answer');
        setSaving(false);
        return;
      }

      // Clear localStorage for this question
      const answeredKey = `answered_questions_${userId}`;
      const existing = JSON.parse(localStorage.getItem(answeredKey) || '[]');
      const questionIds = questions.map(q => q.id);
      localStorage.setItem(answeredKey, JSON.stringify(existing.filter((id: string) => !questionIds.includes(id))));

      // Clear cached data so the questions list refreshes
      sessionStorage.removeItem('questionsMetadataCache');
      sessionStorage.removeItem('questionsDataTimestamp');
      sessionStorage.removeItem('userAnswersData');

      // Navigate back to questions list
      const savedPage = typeof window !== 'undefined'
        ? sessionStorage.getItem('questions_current_page')
        : null;
      const pageParam = savedPage ? `?page=${savedPage}` : '';
      router.push(`/questions${pageParam}`);
    } catch (err) {
      console.error('Failed to undo answer:', err);
      setError('Failed to undo answer. Please try again.');
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      // IMMEDIATELY save to localStorage for instant UI feedback
      const answeredQuestionsKey = `answered_questions_${userId}`;
      const existingAnswered = JSON.parse(localStorage.getItem(answeredQuestionsKey) || '[]');
      
      // Add all questions being answered to localStorage
      questions.forEach(question => {
        if (!existingAnswered.includes(question.id)) {
          existingAnswered.push(question.id);
        }
      });
      
      localStorage.setItem(answeredQuestionsKey, JSON.stringify(existingAnswered));
      const updates: Promise<Response>[] = [];
      const isNonGroupedQuestionOver10 = questionNumber > 10 && questions.length > 0 && questions[0].question_type !== 'grouped';

      if ([1, 2, 6, 7, 8, 9, 10].includes(questionNumber) || (questionNumber > 10 && questions.length > 0 && questions[0].question_type !== 'grouped')) {
        // Slider-based questions (including non-grouped questions > 10)
        for (const question of questions) {
          const key = `q${question.group_number || question.id}`;
          const existingAnswer = existingAnswers.find(a => {
            const questionId = typeof a.question === 'object' ? a.question.id : a.question;
            return questionId === question.id;
          });

          // For non-grouped questions > 10, use meShare and meRequired from state.
          // For other questions, use defaults.

          const answerData = {
            user_id: userId,
            question_id: question.id,
            me_answer: openToAllStates[`${key}_me`] ? 6 : sliderAnswers[`${key}_me`] || 3,
            me_open_to_all: openToAllStates[`${key}_me`] || false,
            me_importance: importanceValues.me,
            me_share: isNonGroupedQuestionOver10 ? meShare : true,
            looking_for_answer: openToAllStates[`${key}_looking`] ? 6 : sliderAnswers[`${key}_looking`] || 3,
            looking_for_open_to_all: openToAllStates[`${key}_looking`] || false,
            looking_for_importance: importanceValues.lookingFor,
            looking_for_share: true,
            excluded_answer_values: normalizeExcludedValues(
              excludedAnswerValues[key] || [],
              getAllowedExclusionValues(question),
              openToAllStates[`${key}_me`] ? [] : [sliderAnswers[`${key}_me`] || 3]
            ),
            me_note: answerNotes[key] || '',
            is_required_for_me: isNonGroupedQuestionOver10 ? meRequired : false
          };

          if (existingAnswer) {
            // Update existing answer
            updates.push(
              fetch(`${getApiUrl(API_ENDPOINTS.ANSWERS)}${existingAnswer.id}/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
               
                body: JSON.stringify(answerData)
              })
            );
          } else {
            // Create new answer
            updates.push(
              fetch(getApiUrl(API_ENDPOINTS.ANSWERS), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
           
                body: JSON.stringify(answerData)
              })
            );
          }
        }
      } else if (questions.length > 0 && questions[0].question_type === 'grouped') {
        // Grouped questions - handle multi-select
        if (selectedOptions.length === 0) {
          setError('Please select at least one option');
          setSaving(false);
          return;
        }

        for (const question of questions) {
          const existingAnswer = existingAnswers.find(a => {
            const questionId = typeof a.question === 'object' ? a.question.id : a.question;
            return questionId === question.id;
          });

          // Set answer value to 5 if selected, 1 if not selected
          const isSelected = selectedOptions.includes(question.question_name);
          const answerValue = isSelected ? 5 : 1;

          const answerData = {
            user_id: userId,
            question_id: question.id,
            me_answer: answerValue,
            me_open_to_all: false,
            me_importance: 3,
            me_share: true,
            looking_for_answer: answerValue,
            looking_for_open_to_all: false,
            looking_for_importance: 3,
            looking_for_share: true,
            excluded_answer_values: normalizeExcludedValues(
              excludedAnswerValues[`q${question.group_number || question.id}`] || existingAnswer?.excluded_answer_values,
              getAllowedExclusionValues(question),
              [answerValue]
            ),
            me_note: answerNotes[`q${question.group_number || question.id}`] ?? existingAnswer?.me_note ?? '',
            is_required_for_me: false
          };

          if (existingAnswer) {
            // Update existing answer
            updates.push(
              fetch(`${getApiUrl(API_ENDPOINTS.ANSWERS)}${existingAnswer.id}/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
           
                body: JSON.stringify(answerData)
              })
            );
          } else {
            // Create new answer
            updates.push(
              fetch(getApiUrl(API_ENDPOINTS.ANSWERS), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
             
                body: JSON.stringify(answerData)
              })
            );
          }
        }
      } else if ([3, 4, 5].includes(questionNumber)) {
        // Single-choice questions
        const selectedQuestion = questions.find(q => q.question_name === selectedOption);
        if (!selectedQuestion) {
          setError('Please select an option');
          setSaving(false);
          return;
        }

        // Clear other answers and set selected one to 5
        for (const question of questions) {
          const existingAnswer = existingAnswers.find(a => {
            const questionId = typeof a.question === 'object' ? a.question.id : a.question;
            return questionId === question.id;
          });
          
          const answerValue = question.id === selectedQuestion.id ? 5 : 1;
          
          const answerData = {
            user_id: userId,
            question_id: question.id,
            me_answer: answerValue,
            me_open_to_all: false,
            me_importance: 3,
            me_share: true,
            looking_for_answer: answerValue,
            looking_for_open_to_all: false,
            looking_for_importance: 3,
            looking_for_share: true,
            excluded_answer_values: normalizeExcludedValues(
              excludedAnswerValues[`q${question.group_number || question.id}`] || existingAnswer?.excluded_answer_values,
              getAllowedExclusionValues(question),
              [answerValue]
            ),
            me_note: answerNotes[`q${question.group_number || question.id}`] ?? existingAnswer?.me_note ?? '',
            is_required_for_me: false
          };

          if (existingAnswer) {
            updates.push(
              fetch(`${getApiUrl(API_ENDPOINTS.ANSWERS)}${existingAnswer.id}/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
         
                body: JSON.stringify(answerData)
              })
            );
          } else {
            updates.push(
              fetch(getApiUrl(API_ENDPOINTS.ANSWERS), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(answerData)
              })
            );
          }
        }
      }

      posthog.capture('question_answered', { question_number: questionNumber, question_count: questions.length });
      if (meRequired) {
        posthog.capture('question_marked_required', { question_number: questionNumber });
      }

      const answeredQuestionsUrl = userId
        ? `${getApiUrl(API_ENDPOINTS.ANSWERS)}my_answered_questions/?user=${userId}`
        : null;
      if (answeredQuestionsUrl) {
        globalMutate(
          answeredQuestionsUrl,
          (current: { answered_question_numbers?: number[] } | undefined) => ({
            answered_question_numbers: Array.from(new Set([...(current?.answered_question_numbers ?? []), questionNumber])).sort((a, b) => a - b),
          }),
          { revalidate: false }
        );
      }

      const requiredOverrideKey = isNonGroupedQuestionOver10 && questions[0]?.id
        ? getRequiredOverrideKey(userId, questions[0].id)
        : null;
      if (requiredOverrideKey) {
        sessionStorage.setItem(requiredOverrideKey, String(meRequired));
      }

      // Navigate optimistically; the network writes continue in the background.
      router.push('/questions?refresh=true');
      setSaving(false);

      void Promise.all(updates)
        .then((results) => {
          const failed = results.find(r => !r.ok);
          if (failed) {
            throw new Error('Failed to save some answers');
          }

          sessionStorage.removeItem('questionsMetadataCache');
          sessionStorage.removeItem('questionsDataTimestamp');
          sessionStorage.removeItem('userAnswersData');
          if (requiredOverrideKey) {
            sessionStorage.removeItem(requiredOverrideKey);
          }
          if (answeredQuestionsUrl) {
            globalMutate(answeredQuestionsUrl);
          }
          globalMutate(`${getApiUrl(API_ENDPOINTS.QUESTIONS)}metadata/`);
        })
        .catch((error) => {
          console.error('Background question save failed:', error);
          posthog.captureException(error);
          if (requiredOverrideKey) {
            sessionStorage.removeItem(requiredOverrideKey);
          }
          if (answeredQuestionsUrl) {
            globalMutate(answeredQuestionsUrl);
          }
          globalMutate(`${getApiUrl(API_ENDPOINTS.QUESTIONS)}metadata/`);
        });
    } catch (error) {
      console.error('Error saving answers:', error);
      posthog.captureException(error);
      setError('Failed to save answers');
    } finally {
      setSaving(false);
    }
  };

  // Helper function to get min/max labels from questions
  const getMinMaxLabels = () => {
    if (!questions || questions.length === 0) return { minLabel: 'LESS', maxLabel: 'MORE' };
    
    // Get all answers from all questions and find global min/max
    const allAnswers = questions.flatMap(q => q.answers || []);
    if (allAnswers.length === 0) return { minLabel: 'LESS', maxLabel: 'MORE' };
    
    const sortedAnswers = [...allAnswers].sort((a, b) => Number(a.value) - Number(b.value));
    const minLabel = sortedAnswers[0]?.answer_text?.toUpperCase() || 'LESS';
    const maxLabel = sortedAnswers[sortedAnswers.length - 1]?.answer_text?.toUpperCase() || 'MORE';
    
    return { minLabel, maxLabel };
  };

  const getBlockedExclusionValuesForKey = (key: string) => (
    openToAllStates[`${key}_me`] ? [] : [sliderAnswers[`${key}_me`] || 3]
  );

  const setExcludedValuesForKey = (key: string, values: number[], question?: Question) => {
    setExcludedAnswerValues(prev => ({
      ...prev,
      [key]: normalizeExcludedValues(values, getAllowedExclusionValues(question), getBlockedExclusionValuesForKey(key)),
    }));
  };

  const setNoteForKey = (key: string, note: string) => {
    setAnswerNotes(prev => ({ ...prev, [key]: note }));
  };

  /**
   * Value stops plus captions for one row. Captions come from the hardcoded per-question
   * scales where they exist (frequency, politics, kids), otherwise from the question's own
   * answer texts. A two-caption scale (e.g. "have kids") yields a two-stop slider.
   */
  const buildRowLabels = (question: Question): AnswerValueLabel[] => {
    const captions = getScaleLabelsForQuestion(questionNumber, question);
    const valueLabels = getSliderLabelsForQuestion(question.question_number, question.answers);

    if (!captions) return valueLabels.length > 0 ? valueLabels : DEFAULT_SCALE_LABELS;
    if (captions.length === 2) {
      return [
        { value: '1', answer_text: captions[0] },
        { value: '5', answer_text: captions[1] },
      ];
    }

    const values = getAnswerValues(valueLabels);
    return values.map((value, index) => ({ value, answer_text: captions[index] || '' }));
  };

  /** The Kids question labels its two parts HAVE / WANT rather than by question name. */
  const rowLabelFor = (question: Question, isKidsQuestion: boolean) => {
    if (isKidsQuestion && question.group_number === 1) return 'HAVE';
    if (isKidsQuestion && question.group_number === 2) return 'WANT';
    return (question.question_name || 'ANSWER').toUpperCase();
  };

  type SliderRowSpec = {
    question: Question;
    /** Key into excludedAnswerValues / answerNotes. */
    storageKey: string;
    /** Key into sliderAnswers / openToAllStates. */
    stateKey: string;
    label: string;
    labels: AnswerValueLabel[];
    otaEnabled: boolean;
  };

  const renderSliderSection = ({
    title,
    titleColor,
    rows,
    showExclude = false,
    showNote = false,
    /** Omit for sections without an importance slider (the Me side of multi-part questions). */
    importanceValue,
    onImportanceChange,
    /** True when each row carries its own scale, so there is no shared header strip. */
    perRowScale = false,
    className = '',
  }: {
    title: string;
    titleColor?: string;
    rows: SliderRowSpec[];
    showExclude?: boolean;
    showNote?: boolean;
    importanceValue?: number;
    onImportanceChange?: (value: number) => void;
    perRowScale?: boolean;
    className?: string;
  }) => (
    <div className={`mb-2 sm:mb-6 ${className}`}>
      <h3
        className={`-mb-2 text-center text-lg font-bold sm:mb-1 sm:text-2xl ${
          titleColor ? 'text-black' : ''
        }`}
      >
        {title}
      </h3>

      {!perRowScale && (
        <AnswerScaleHeader
          labels={rows[0]?.labels || DEFAULT_SCALE_LABELS}
          showOta={rows.some(row => row.otaEnabled)}
          className="mb-2"
        />
      )}

      <div className="space-y-1 sm:space-y-3">
        {rows.map(row => (
          <AnswerSliderRow
            key={`${title}-${row.stateKey}`}
            label={row.label}
            // Mandatory questions split into several named rows (FEMALE/MALE, HAVE/WANT)
            // that each need their caption. Above 10 a question is a single row whose
            // caption only repeats the heading, so the row caption is dropped.
            hideRowLabel={questionNumber > 10}
            labels={row.labels}
            showScaleAbove={perRowScale}
            value={sliderAnswers[row.stateKey] || 3}
            onChange={(value) => setSliderAnswers(prev => ({ ...prev, [row.stateKey]: value }))}
            showOta={row.otaEnabled}
            otaChecked={openToAllStates[row.stateKey] || false}
            onOtaToggle={() =>
              setOpenToAllStates(prev => ({ ...prev, [row.stateKey]: !prev[row.stateKey] }))
            }
            showExclude={showExclude}
            excludedValues={excludedAnswerValues[row.storageKey] || []}
            allowedExclusionValues={getAllowedExclusionValues(row.question)}
            blockedExclusionValues={getBlockedExclusionValuesForKey(row.storageKey)}
            onExcludedValuesChange={(values) =>
              setExcludedValuesForKey(row.storageKey, values, row.question)
            }
            showNote={showNote}
            note={answerNotes[row.storageKey] || ''}
            onNoteChange={(note) => setNoteForKey(row.storageKey, note)}
          />
        ))}

        {importanceValue !== undefined && onImportanceChange && (
          <div className="hidden sm:block">
            <AnswerSliderRow
              label="IMPORTANCE"
              labels={IMPORTANCE_LABELS}
              value={importanceValue}
              onChange={onImportanceChange}
              isImportance
              showActiveLabelBelow
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderMobileImportanceSection = (
    value: number,
    onChange: (value: number) => void
  ) => (
    <div className="mb-2 pt-1 sm:hidden">
      <h3 className="-mb-2 text-center text-lg font-bold">Importance</h3>

      <AnswerSliderRow
        label="IMPORTANCE"
        labels={IMPORTANCE_LABELS}
        value={value}
        onChange={onChange}
        isImportance
        hideRowLabel
      />
    </div>
  );

  const sliderSectionShell = (children: React.ReactNode) => (
    <div className="w-full overflow-x-hidden">
      <div className="mx-auto w-full min-w-0 max-w-[100%] sm:max-w-[640px] md:max-w-[630px] lg:max-w-[792px]">
        {children}
      </div>
    </div>
  );

  const renderQuestionTemplate = () => {
    if (!questions || questions.length === 0) return null;

    // Special handling for Relationship question (question_number === 1) - ONLY Me section, no "Looking For"
    if (questionNumber === 1) {
      const relationshipHasOta = questions.some(q => q.open_to_all_me);
      const relationshipGridClass = 'grid items-center justify-center grid-cols-[114px_260px_144px] gap-x-2 gap-y-3 lg:grid-cols-[108px_500px_144px] lg:gap-x-5 lg:gap-y-3';

      return (
        sliderSectionShell(
          <>
            {renderSliderSection({
              title: 'Me',
              rows: questions.map((question) => ({
                question,
                storageKey: `q${question.group_number}`,
                stateKey: `q${question.group_number}_me`,
                label: question.question_name.toUpperCase(),
                labels: DEFAULT_SCALE_LABELS,
                otaEnabled: question.open_to_all_me,
              })),
              showExclude: true,
              importanceValue: importanceValues.me,
              onImportanceChange: (value) => setImportanceValues(prev => ({ ...prev, me: value })),
            })}
            {renderMobileImportanceSection(
              importanceValues.me,
              (value) => setImportanceValues(prev => ({ ...prev, me: value }))
            )}
          </>
        )
      );
    }

    // For all other questions, use the renderQuestionContent implementation
    return renderQuestionContent();
  };

  const renderQuestionContent = () => {
    if (!questions || questions.length === 0) return null;

    // Gender question (question_number === 2) - "Them" first with importance, then "Me" without importance
    if (questionNumber === 2) {
      const genderQuestions = [...questions].sort((a, b) => (b.group_number || 0) - (a.group_number || 0));

      return (
        sliderSectionShell(
          <>
            {renderSliderSection({
              title: 'Them',
              titleColor: '#672DB7',
              rows: genderQuestions.map((question) => ({
                question,
                storageKey: `q${question.group_number || question.id}`,
                stateKey: `q${question.group_number || question.id}_looking`,
                label: question.question_name.toUpperCase(),
                labels: DEFAULT_SCALE_LABELS,
                otaEnabled: questionAllowsLookingOta(question),
              })),
              showExclude: true,
              importanceValue: importanceValues.lookingFor,
              onImportanceChange: (value) => setImportanceValues(prev => ({ ...prev, lookingFor: value })),
            })}

            {/* Me section — no importance slider, it is shared with Them. */}
            {renderSliderSection({
              title: 'Me',
              rows: genderQuestions.map((question) => ({
                question,
                storageKey: `q${question.group_number || question.id}`,
                stateKey: `q${question.group_number || question.id}_me`,
                label: question.question_name.toUpperCase(),
                labels: DEFAULT_SCALE_LABELS,
                otaEnabled: question.open_to_all_me,
              })),
              showNote: true,
              className: 'pt-1 sm:pt-8',
            })}
            {renderMobileImportanceSection(
              importanceValues.lookingFor,
              (value) => setImportanceValues(prev => ({ ...prev, lookingFor: value }))
            )}
          </>
        )
      );
    }

    // Basic multi-slider questions like Exercise/Habits/Religion (question_number === 6, 7, 8, 9, 10, etc.)
    if ([6, 7, 8, 9, 10].includes(questionNumber)) {
      const isKidsQuestion = questionNumber === 10;
      const hasRowScaleLabels = Boolean(getScaleLabelsForQuestion(questionNumber));

      // For kids question, sort so Want (group_number=2) comes before Have (group_number=1)
      if (isKidsQuestion) {
        questions.sort((a, b) => (b.group_number || 0) - (a.group_number || 0));
      }

      // Show "Them" first, then "Me" (like onboarding) — responsive container and grids for small/medium devices
      return (
        sliderSectionShell(
          <>
            {renderSliderSection({
              title: 'Them',
              titleColor: '#672DB7',
              perRowScale: hasRowScaleLabels,
              rows: questions.map((question) => ({
                question,
                storageKey: `q${question.group_number || question.id}`,
                stateKey: `q${question.group_number || question.id}_looking`,
                label: rowLabelFor(question, isKidsQuestion),
                labels: buildRowLabels(question),
                otaEnabled: questionAllowsLookingOta(question),
              })),
              showExclude: true,
              importanceValue: importanceValues.lookingFor,
              onImportanceChange: (value) => setImportanceValues(prev => ({ ...prev, lookingFor: value })),
            })}

            {/* Me section — no importance slider, it is shared with Them. */}
            {renderSliderSection({
              title: 'Me',
              perRowScale: hasRowScaleLabels,
              rows: questions.map((question) => ({
                question,
                storageKey: `q${question.group_number || question.id}`,
                stateKey: `q${question.group_number || question.id}_me`,
                label: rowLabelFor(question, isKidsQuestion),
                labels: buildRowLabels(question),
                otaEnabled: question.open_to_all_me,
              })),
              showNote: true,
              className: 'pt-1 sm:pt-8',
            })}
            {renderMobileImportanceSection(
              importanceValues.lookingFor,
              (value) => setImportanceValues(prev => ({ ...prev, lookingFor: value }))
            )}
          </>
        )
      );
    }

    // Grouped questions (question_type === 'grouped') - Card selection UI like ethnicity
    if (questions.length > 0 && questions[0].question_type === 'grouped') {
      const initialVisibleQuestionCount = 6;
      const visibleQuestions = showAllGroupedOptions ? questions : questions.slice(0, initialVisibleQuestionCount);
      const hasMoreQuestions = questions.length > initialVisibleQuestionCount;

      return (
        <div className="max-w-2xl mx-auto">
          <div className="space-y-3">
            {visibleQuestions.map((question) => {
              const isSelected = selectedOptions.includes(question.question_name);

              // Check if this question has been answered by looking at existingAnswers
              const isAnswered = existingAnswers.some(answer => {
                const answeredQuestionId = typeof answer.question === 'object'
                  ? answer.question.id
                  : answer.question;
                return answeredQuestionId === question.id;
              });

              return (
                <div
                  key={question.id}
                  onClick={() => handleSingleOptionClick(question)}
                  className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-black bg-gray-50'
                      : isAnswered
                        ? 'border-[#672DB7] bg-purple-50'
                        : 'border-black bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Image
                      src="/assets/ethn.png" // Default icon, can be customized per question
                      alt="Option icon"
                      width={24}
                      height={24}
                      className="w-6 h-6"
                    />
                    <span className="text-black font-medium">{question.question_name}</span>
                    {isAnswered && (
                      <span className="text-[#672DB7] text-sm">✓ Answered</span>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              );
            })}

            {/* Show More Button */}
            {hasMoreQuestions && !showAllGroupedOptions && (
              <button
                onClick={() => setShowAllGroupedOptions(true)}
                className="w-full py-3 bg-black text-white font-medium rounded-full hover:bg-gray-800 cursor-pointer transition-colors"
              >
                Show More
              </button>
            )}

            {/* Show Less Button */}
            {hasMoreQuestions && showAllGroupedOptions && (
              <button
                onClick={() => setShowAllGroupedOptions(false)}
                className="w-full py-3 bg-black text-white font-medium rounded-full hover:bg-gray-800 cursor-pointer transition-colors"
              >
                Show Less
              </button>
            )}
          </div>
        </div>
      );
    }

    // Grouped questions - show as card selection (Ethnicity, Education, Diet, Faith, Ideology)
    // Check if this is a grouped question type
    const isGroupedQuestion = questions.length > 0 && questions[0].question_type === 'grouped';
    if (isGroupedQuestion) {
      const optionIcons: Record<number, string> = {
        3: '/assets/ethn.png',
        4: '/assets/cpx.png',
        5: '/assets/lf2.png',
        11: '/assets/prayin.png',  // Faith icon
        12: '/assets/ethn.png'  // Ideology icon (using ethn as placeholder)
      };

      return (
        <div className="max-w-2xl mx-auto">
          <div className="space-y-3">
            {questions.map((question) => {
              // Check if this question has been answered by looking at existingAnswers
              const isAnswered = existingAnswers.some(answer => {
                const answeredQuestionId = typeof answer.question === 'object'
                  ? answer.question.id
                  : answer.question;
                return answeredQuestionId === question.id;
              });

              return (
                <button
                  key={question.id}
                  onClick={() => handleSingleOptionClick(question)}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer ${
                    isAnswered
                      ? 'border-[#672DB7] bg-purple-50'
                      : 'border-black bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Image
                      src={optionIcons[questionNumber]}
                      alt=""
                      width={24}
                      height={24}
                    />
                    <span className="text-left">{question.question_name}</span>
                    {isAnswered && (
                      <span className="text-[#672DB7] text-sm">✓ Answered</span>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    // Basic single questions (non-grouped questions > 10) - render with Me and Them sliders
    // Check if this is NOT a grouped question and question_number > 10
    const isBasicSingleQuestion = questions.length > 0 && 
                                   questions[0].question_type !== 'grouped' && 
                                   questionNumber > 10;
    
    if (isBasicSingleQuestion && questions.length === 1) {
      const question = questions[0];
      const key = `q${question.id}`;
      const meKey = `${key}_me`;
      const lookingKey = `${key}_looking`;

      const lessLabel = question.answers?.find((a: { value: string | number }) => String(a.value) === '1')?.answer_text?.toUpperCase() || 'LESS';
      const moreLabel = question.answers?.find((a: { value: string | number }) => String(a.value) === '5')?.answer_text?.toUpperCase() || 'MORE';

      const scaleLabels: AnswerValueLabel[] = [
        { value: '1', answer_text: lessLabel },
        { value: '2', answer_text: '' },
        { value: '3', answer_text: '' },
        { value: '4', answer_text: '' },
        { value: '5', answer_text: moreLabel },
      ];

      return (
        sliderSectionShell(
          <>
            {renderSliderSection({
              title: 'Them',
              titleColor: '#672DB7',
              rows: [{
                question,
                storageKey: key,
                stateKey: lookingKey,
                label: (question.question_name || 'ANSWER').toUpperCase(),
                labels: scaleLabels,
                otaEnabled: questionAllowsLookingOta(question),
              }],
              showExclude: true,
              importanceValue: importanceValues.lookingFor,
              onImportanceChange: (value) => setImportanceValues(prev => ({ ...prev, lookingFor: value })),
            })}

            {renderSliderSection({
              title: 'Me',
              rows: [{
                question,
                storageKey: key,
                stateKey: meKey,
                label: (question.question_name || 'ANSWER').toUpperCase(),
                labels: scaleLabels,
                otaEnabled: question.open_to_all_me,
              }],
              showNote: true,
              className: 'pt-1 sm:pt-8',
            })}
            {renderMobileImportanceSection(
              importanceValues.lookingFor,
              (value) => setImportanceValues(prev => ({ ...prev, lookingFor: value }))
            )}
          </>
        )
      );
    }

    // Other questions - need to implement based on onboarding structure
    return (
      <div>
        <p>Question type {questionNumber} structure needs to be implemented based on onboarding</p>
      </div>
    );
  };

  if (loading) {
    const loadingTexts = ['Loading question...', 'Fetching details...', 'Almost there...'];
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          {/* Heart with math operators */}
          <div className="relative w-40 h-40 flex items-center justify-center">
            {['×', '÷', '+', '−', '=', '%', '√'].map((op, i) => (
              <span
                key={op}
                className="qdetail-math-operator absolute text-xl font-bold"
                style={{
                  color: '#672DB7',
                  opacity: 0.6,
                  animationDelay: `${i * 0.3}s`,
                  top: '50%',
                  left: '50%',
                }}
              >
                {op}
              </span>
            ))}
            <svg
              className="qdetail-heart-pulse relative z-10"
              width="72"
              height="72"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="qdetailHeartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#A855F7" />
                  <stop offset="50%" stopColor="#7C3AED" />
                  <stop offset="100%" stopColor="#672DB7" />
                </linearGradient>
              </defs>
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill="url(#qdetailHeartGradient)"
              />
            </svg>
          </div>
          <p className="mt-6 text-lg font-semibold text-gray-700 qdetail-loading-text">
            {loadingTexts[loadingTextIndex]}
          </p>
        </div>

        <style jsx>{`
          @keyframes qdetailHeartPulse {
            0%, 100% { transform: scale(1); }
            15% { transform: scale(1.18); }
            30% { transform: scale(1); }
            45% { transform: scale(1.12); }
            60% { transform: scale(1); }
          }

          @keyframes qdetailOrbit0 { 0% { transform: translate(-50%, -50%) rotate(0deg) translateX(60px) rotate(0deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(360deg) translateX(60px) rotate(-360deg); opacity: 0.5; } }
          @keyframes qdetailOrbit1 { 0% { transform: translate(-50%, -50%) rotate(51deg) translateX(64px) rotate(-51deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(411deg) translateX(64px) rotate(-411deg); opacity: 0.5; } }
          @keyframes qdetailOrbit2 { 0% { transform: translate(-50%, -50%) rotate(103deg) translateX(58px) rotate(-103deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(463deg) translateX(58px) rotate(-463deg); opacity: 0.5; } }
          @keyframes qdetailOrbit3 { 0% { transform: translate(-50%, -50%) rotate(154deg) translateX(66px) rotate(-154deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(514deg) translateX(66px) rotate(-514deg); opacity: 0.5; } }
          @keyframes qdetailOrbit4 { 0% { transform: translate(-50%, -50%) rotate(206deg) translateX(60px) rotate(-206deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(566deg) translateX(60px) rotate(-566deg); opacity: 0.5; } }
          @keyframes qdetailOrbit5 { 0% { transform: translate(-50%, -50%) rotate(257deg) translateX(62px) rotate(-257deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(617deg) translateX(62px) rotate(-617deg); opacity: 0.5; } }
          @keyframes qdetailOrbit6 { 0% { transform: translate(-50%, -50%) rotate(309deg) translateX(58px) rotate(-309deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(669deg) translateX(58px) rotate(-669deg); opacity: 0.5; } }

          @keyframes qdetailTextFade {
            0%, 100% { opacity: 0; transform: translateY(4px); }
            15%, 85% { opacity: 1; transform: translateY(0); }
          }

          .qdetail-heart-pulse {
            animation: qdetailHeartPulse 1.6s ease-in-out infinite;
          }

          .qdetail-math-operator:nth-child(1) { animation: qdetailOrbit0 3.5s linear infinite both; }
          .qdetail-math-operator:nth-child(2) { animation: qdetailOrbit1 4.0s linear infinite both; }
          .qdetail-math-operator:nth-child(3) { animation: qdetailOrbit2 3.2s linear infinite both; }
          .qdetail-math-operator:nth-child(4) { animation: qdetailOrbit3 3.8s linear infinite both; }
          .qdetail-math-operator:nth-child(5) { animation: qdetailOrbit4 4.2s linear infinite both; }
          .qdetail-math-operator:nth-child(6) { animation: qdetailOrbit5 3.6s linear infinite both; }
          .qdetail-math-operator:nth-child(7) { animation: qdetailOrbit6 3.4s linear infinite both; }

          .qdetail-loading-text {
            animation: qdetailTextFade 1.5s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    // Pinned footer + a single scrolling content area, so Save is always reachable. The
    // provider/dock pair mirrors OnboardingShell so phones get the same action rail — OTA
    // help, the exclusion picker and the note editor — instead of per-row inline controls.
    <MobileQuestionActionsProvider>
    <div className="h-[100dvh] overflow-hidden bg-white flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between p-3 sm:p-4">
        <div className="flex items-center">
          <Image
            src="/assets/mmlogox.png"
            alt="Logo"
            width={32}
            height={32}
            className="mr-2"
          />
        </div>
        <HamburgerMenu />
      </div>

      {/* Main Content */}
      <main className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden flex flex-col justify-center ${questionNumber === 1 ? 'px-2 sm:px-6 py-1.5' : 'px-3 sm:px-6 py-2 sm:py-4'}`}>
        <div className={`w-full min-w-0 mx-auto ${
          questionNumber === 1
            ? 'max-w-[calc(100vw-1rem)] sm:max-w-[640px] md:max-w-[630px] lg:max-w-[792px]'
            : [2, 6, 7, 8, 9, 10].includes(questionNumber) || questionNumber > 10
              ? 'max-w-[95vw] sm:max-w-[640px] md:max-w-[630px] lg:max-w-[792px]'
              : 'max-w-4xl'
        }`}>
          {/* Title — responsive typography for small/medium/large */}
          <div className={`text-center ${questionNumber === 1 ? 'mb-2 sm:mb-3' : 'mb-4 sm:mb-6 lg:mb-8'}`}>
            <div className="inline-block w-full max-w-full px-0 sm:px-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-black mb-1 sm:mb-2 break-words">
                {questionNumber}. {questions && questions.length > 0 ? (
                  questions[0].group_name ? questions[0].group_name :
                  (questionNumber <= 10
                    ? (questions[0].question_name || questionTitles[questionNumber])
                    : questions[0].text)
                ) : questionTitles[questionNumber]}
            </h1>
              
              {/* Share Answer and Required switches - Only show for non-mandatory questions (question_number > 10) */}
              {questionNumber > 10 && questions && questions.length > 0 && questions[0].question_type !== 'grouped' && (
                <div className="flex flex-wrap items-center justify-center sm:justify-between gap-3 sm:gap-4 w-full mt-3 sm:mt-4">
                  {/* Required For Match - Left */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setMeRequired(!meRequired)}
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                      style={{ backgroundColor: meRequired ? '#000000' : '#ADADAD' }}
                    >
                      <span
                        className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
                        style={{ transform: meRequired ? 'translateX(20px)' : 'translateX(2px)' }}
                      />
                    </button>
                    <span className="text-sm text-black">Required For Match</span>
                  </div>

                  {/* Share Answer - Right */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setMeShare(!meShare)}
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                      style={{ backgroundColor: meShare ? '#000000' : '#ADADAD' }}
                    >
                      <span
                        className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
                        style={{ transform: meShare ? 'translateX(20px)' : 'translateX(2px)' }}
                      />
                    </button>
                    <span className="text-sm text-black">Share Answer</span>
                  </div>
                </div>
              )}
            </div>
            <p className={`text-base sm:text-xl lg:text-2xl xl:text-3xl font-bold text-black break-words ${questionNumber === 1 ? 'mb-3 sm:mb-4' : 'mb-3 sm:mb-8 lg:mb-12'}`}>
              {questions && questions.length > 0 ? (
                questions[0].group_name_text ||
                (questionNumber <= 10 ? questionTexts[questionNumber] : '')
              ) : questionTexts[questionNumber]}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-center">
              {error}
            </div>
          )}

          {/* Question Content */}
          {renderQuestionTemplate()}
        </div>
      </main>

      <MobileQuestionActionDock />

      {/* Footer with Navigation */}
      <footer className="shrink-0 bg-white border-t border-gray-200">
        <div className="flex justify-between items-center px-6 py-3 sm:py-4">
          <button
            onClick={() => {
              if (isDemo) {
                router.push('/#questions');
                return;
              }
              // Restore the page from sessionStorage if available
              const savedPage = typeof window !== 'undefined'
                ? sessionStorage.getItem('questions_current_page')
                : null;
              const pageParam = savedPage ? `?page=${savedPage}` : '';
              router.push(`/questions${pageParam}`);
            }}
            className="text-gray-900 font-medium hover:text-gray-500 transition-colors cursor-pointer"
          >
            Back
          </button>

          <div className="flex items-center gap-3">
            {isDemo ? (
              <button
                onClick={() => router.push('/auth/register')}
                className="px-8 py-3 rounded-md font-medium bg-[#672DB7] text-white hover:bg-[#5a27a0] cursor-pointer transition-colors"
              >
                Sign Up to Save
              </button>
            ) : (
              <>
                {/* Undo button - only for non-mandatory questions that have been answered */}
                {questionNumber > 10 && existingAnswers.length > 0 && (
                  <button
                    onClick={handleUndoAnswer}
                    disabled={saving}
                    className={`px-4 py-3 rounded-md font-medium transition-colors cursor-pointer ${
                      !saving
                        ? 'border border-red-300 text-red-500 hover:bg-red-50'
                        : 'border border-gray-200 text-gray-400 !cursor-not-allowed'
                    }`}
                  >
                    Clear Answer
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`px-8 py-3 rounded-md font-medium transition-colors cursor-pointer ${
                    !saving
                      ? 'bg-black text-white hover:bg-gray-800'
                      : 'bg-gray-300 text-gray-500 !cursor-not-allowed'
                  }`}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
    </MobileQuestionActionsProvider>
  );
}

function QuestionEditPageWrapper() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  if (isDemo) {
    return <QuestionEditPageContent />;
  }

  return (
    <ProtectedPageGate>
      <QuestionEditPageContent />
    </ProtectedPageGate>
  );
}

export default function QuestionEditPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="w-8 h-8 border-2 border-gray-200 border-t-[#672DB7] rounded-full animate-spin" /></div>}>
      <QuestionEditPageWrapper />
    </React.Suspense>
  );
}
