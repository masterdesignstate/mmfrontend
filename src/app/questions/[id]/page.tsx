'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
import HamburgerMenu from '@/components/HamburgerMenu';

interface Question {
  id: string;
  question_name: string;
  question_number: number;
  group_number?: number;
  group_name: string;
  group_name_text?: string;
  question_type?: 'basic' | 'grouped' | 'double' | 'triple' | 'four';
  text: string;
  answers: Array<{ value: string; answer_text: string }>;
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
}

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
  const IMPORTANCE_LABELS = [
    { value: "1", answer_text: "TRIVIAL" },
    { value: "2", answer_text: "MINOR" },
    { value: "3", answer_text: "AVERAGE" },
    { value: "4", answer_text: "SIGNIFICANT" },
    { value: "5", answer_text: "ESSENTIAL" }
  ];

  const renderTopLabels = () => {
    if (!questions || questions.length === 0 || !questions[0]?.answers || questions[0].answers.length === 0) {
      return (
        <div className="flex justify-between text-xs text-gray-500 mb-2 ml-16 sm:ml-20">
          <span>LESS</span>
          <span>MORE</span>
        </div>
      );
    }

    const sortedAnswers = questions[0].answers.sort((a, b) => parseInt(a.value) - parseInt(b.value));

    return (
      <div className="relative text-xs text-gray-500 mb-2" style={{ width: '500px', height: '14px' }}>
        {sortedAnswers.map((answer) => {
          const value = parseInt(answer.value);
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
              {answer.answer_text.toUpperCase()}
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
                        labels={question.answers}
                      />
                    </div>
                    <button
                      onClick={() => setOpenToAllStates({
                        ...openToAllStates,
                        [`me_${question.id}_open`]: !openToAllStates[`me_${question.id}_open`]
                      })}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-xs font-medium bg-white hover:bg-gray-50"
                    >
                      ALL
                    </button>
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
                        labels={question.answers}
                      />
                    </div>
                    <button
                      onClick={() => setOpenToAllStates({
                        ...openToAllStates,
                        [`them_${question.id}_open`]: !openToAllStates[`them_${question.id}_open`]
                      })}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-xs font-medium bg-white hover:bg-gray-50"
                    >
                      ALL
                    </button>
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
  const IMPORTANCE_LABELS = [
    { value: "1", answer_text: "TRIVIAL" },
    { value: "2", answer_text: "MINOR" },
    { value: "3", answer_text: "AVERAGE" },
    { value: "4", answer_text: "SIGNIFICANT" },
    { value: "5", answer_text: "ESSENTIAL" }
  ];

  const renderTopLabels = () => {
    if (!question?.answers || question.answers.length === 0) {
      return (
        <div className="flex justify-between text-xs text-gray-500">
          <span>LESS</span>
          <span>MORE</span>
        </div>
      );
    }

    const sortedAnswers = question.answers.sort((a, b) => parseInt(a.value) - parseInt(b.value));

    return (
      <div className="relative text-xs text-gray-500" style={{ width: '500px', height: '14px' }}>
        {sortedAnswers.map((answer) => {
          const value = parseInt(answer.value);
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
              {answer.answer_text.toUpperCase()}
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
                    labels={question.answers}
                  />
                </div>
                <button
                  onClick={() => setOpenToAllStates({
                    ...openToAllStates,
                    [`me_${question.id}_open`]: !openToAllStates[`me_${question.id}_open`]
                  })}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-xs font-medium bg-white hover:bg-gray-50"
                >
                  ALL
                </button>
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
                    labels={question.answers}
                  />
                </div>
                <button
                  onClick={() => setOpenToAllStates({
                    ...openToAllStates,
                    [`them_${question.id}_open`]: !openToAllStates[`them_${question.id}_open`]
                  })}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-xs font-medium bg-white hover:bg-gray-50"
                >
                  ALL
                </button>
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

export default function QuestionEditPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const questionNumber = parseInt(params.id as string);
  
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
  const [importanceValues, setImportanceValues] = useState({ me: 3, lookingFor: 3 });
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [showAllGroupedOptions, setShowAllGroupedOptions] = useState(false);
  const [meShare, setMeShare] = useState(true);
  const [meRequired, setMeRequired] = useState(false);

  // Static importance labels for importance sliders
  const IMPORTANCE_LABELS = [
    { value: "1", answer_text: "TRIVIAL" },
    { value: "2", answer_text: "MINOR" },
    { value: "3", answer_text: "AVERAGE" },
    { value: "4", answer_text: "SIGNIFICANT" },
    { value: "5", answer_text: "ESSENTIAL" }
  ];

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
        // Get user ID
        const storedUserId = localStorage.getItem('user_id');
        console.log('👤 Current user_id from localStorage:', storedUserId);
        if (!storedUserId) {
          router.push('/auth/login');
          return;
        }
        setUserId(storedUserId);

        // Always fetch fresh questions from API to get accurate is_answered values
        // (sessionStorage data may be stale or from a different user session)
        let questionsList: Question[] = [];

        console.log('🚀 Fetching questions from API...');
        const questionsResponse = await fetch(
          `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=${questionNumber}`,
          {
            headers: { 'Content-Type': 'application/json' }
          }
        );
        const questionsData = await questionsResponse.json();
        questionsList = questionsData.results || [];

        // Sort by group_number
        questionsList.sort((a: Question, b: Question) =>
          (a.group_number || 0) - (b.group_number || 0)
        );
        console.log('📋 Fetched questions from API:', questionsList);

        console.log('✅ Setting questions state:', {
          questionNumber,
          questionsList,
          count: questionsList.length,
          firstQuestionType: questionsList[0]?.question_type,
          allTypes: questionsList.map((q: Question) => q.question_type)
        });
        setQuestions(questionsList);

        // Fetch user's existing answers from API (handle pagination)
        console.log('🚀 Fetching answers from API...');
        let allAnswers: UserAnswer[] = [];
        let nextUrl: string | null = `${getApiUrl(API_ENDPOINTS.ANSWERS)}?user=${storedUserId}&page_size=100`;

        while (nextUrl) {
          const answersResponse = await fetch(nextUrl, {
            headers: { 'Content-Type': 'application/json' }
          });

          if (answersResponse.ok) {
            const answersData = await answersResponse.json();
            allAnswers = [...allAnswers, ...(answersData.results || [])];
            nextUrl = answersData.next || null;
          } else {
            break;
          }
        }

        const relevantAnswers = allAnswers.filter(
          (answer: UserAnswer) => {
            const questionId = typeof answer.question === 'object' ? answer.question : answer.question;
            // Find the question number from our questionsList
            const matchingQuestion = questionsList.find(q => q.id === questionId ||
              (typeof answer.question === 'object' && (answer.question as { question_number?: number }).question_number === questionNumber));
            return matchingQuestion !== undefined ||
              (typeof answer.question === 'object' && (answer.question as { question_number?: number }).question_number === questionNumber);
          }
        );
        console.log('📋 Fetched relevant answers from API:', {
          totalAnswers: allAnswers.length,
          relevantCount: relevantAnswers.length
        });
        // Log each answer's question ID separately for clarity
        relevantAnswers.forEach((a, i) => {
          const qId = typeof a.question === 'object' ? (a.question as any).id : a.question;
          const qName = typeof a.question === 'object' ? (a.question as any).question_name : 'unknown';
          console.log(`📌 Answer ${i + 1}: questionId=${qId}, questionName=${qName}, me_answer=${a.me_answer}`);
        });
        // Also log the question IDs we're trying to match against
        console.log('📋 Questions we have:', questionsList.map(q => ({ id: q.id, name: q.question_name })));
        
        setExistingAnswers(relevantAnswers);
        
        // Fetch user's required question IDs (UserRequiredQuestion)
        let requiredQuestionIds: string[] = [];
        try {
          const reqRes = await fetch(
            `${getApiUrl(API_ENDPOINTS.USER_REQUIRED_QUESTIONS)}?user=${encodeURIComponent(storedUserId)}`,
            { headers: { 'Content-Type': 'application/json' } }
          );
          if (reqRes.ok) {
            const reqData = await reqRes.json();
            requiredQuestionIds = (reqData.results ?? []).map((r: { question_id: string }) => r.question_id);
          }
        } catch (_) {
          // Non-fatal; meRequired will default to false
        }
        
        // Initialize state based on existing answers
        initializeAnswerState(questionsList, relevantAnswers);
        // Per-user required: meRequired from user-required-questions list, else question default
        if (questionsList.length > 0 && questionNumber > 10 && questionsList[0].question_type !== 'grouped') {
          const firstQId = questionsList[0].id;
          setMeRequired(
            requiredQuestionIds.includes(firstQId) || questionsList[0].is_required_for_match === true
          );
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
      }
    });
    
    setSliderAnswers(sliders);
    setOpenToAllStates(openToAll);
    
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
    console.log('🔵 handleSingleOptionClick called', { questionNumber, questionName: question.question_name });
    setSelectedOption(question.question_name);

    // Navigate to individual question slider page for this specific sub-question
    const params = new URLSearchParams();
    params.set('user_id', userId);
    params.set('question_number', questionNumber.toString());
    params.set('question_data', JSON.stringify(question));
    params.set('from_questions_page', 'true'); // Add flag to return to questions page after answering

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

    console.log('🔵 Navigating to:', fullUrl);

    // Navigate to auth-style individual question page for this option
    router.push(fullUrl);
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
      console.log('✅ Immediately saved questions to localStorage:', questions.map(q => q.id));

      const updates = [];

      if ([1, 2, 6, 7, 8, 9, 10].includes(questionNumber) || (questionNumber > 10 && questions.length > 0 && questions[0].question_type !== 'grouped')) {
        // Slider-based questions (including non-grouped questions > 10)
        for (const question of questions) {
          const key = `q${question.group_number || question.id}`;
          const existingAnswer = existingAnswers.find(a => {
            const questionId = typeof a.question === 'object' ? a.question.id : a.question;
            return questionId === question.id;
          });

          // For non-grouped questions > 10, use meShare and meRequired from state
          // For other questions, use defaults
          const isNonGroupedQuestionOver10 = questionNumber > 10 && questions.length > 0 && questions[0].question_type !== 'grouped';

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

      const results = await Promise.all(updates);
      const failed = results.find(r => !r.ok);
      
      if (failed) {
        throw new Error('Failed to save some answers');
      }

      // Navigate back to questions list with refresh parameter
      router.push('/questions?refresh=true');
    } catch (error) {
      console.error('Error saving answers:', error);
      setError('Failed to save answers');
    } finally {
      setSaving(false);
    }
  };

  const SliderComponent = ({ 
    value, 
    onChange,
    isOpenToAll = false,
    isImportance = false,
    labels = []
  }: { 
    value: number; 
    onChange: (value: number) => void; 
    isOpenToAll?: boolean;
    isImportance?: boolean;
    labels?: Array<{ value: string; answer_text: string }>;
  }) => {
    const [fillWidth, setFillWidth] = useState('0%');
    const hasAnimatedRef = useRef(false);
    const raf1Ref = useRef<number | null>(null);
    const raf2Ref = useRef<number | null>(null);

    useLayoutEffect(() => {
      if (isOpenToAll && !hasAnimatedRef.current) {
        setFillWidth('0%');
        raf1Ref.current = requestAnimationFrame(() => {
          raf2Ref.current = requestAnimationFrame(() => {
            setFillWidth('100%');
            hasAnimatedRef.current = true;
          });
        });
        return () => {
          if (raf1Ref.current) cancelAnimationFrame(raf1Ref.current);
          if (raf2Ref.current) cancelAnimationFrame(raf2Ref.current);
        };
      }
      if (!isOpenToAll) {
        hasAnimatedRef.current = false;
        setFillWidth('0%');
      }
    }, [isOpenToAll]);

    const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isOpenToAll) return;
      
      // Get min and max values from labels, fallback to 1 and 5
      const sortedLabels = labels.sort((a, b) => parseInt(a.value) - parseInt(b.value));
      const minValue = sortedLabels.length > 0 ? parseInt(sortedLabels[0].value) : 1;
      const maxValue = sortedLabels.length > 0 ? parseInt(sortedLabels[sortedLabels.length - 1].value) : 5;
      
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newValue = Math.round(percentage * (maxValue - minValue)) + minValue;
      onChange(Math.max(minValue, Math.min(maxValue, newValue)));
    };

    const handleSliderDrag = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.buttons === 1 && !isOpenToAll) { // Left mouse button
        handleSliderClick(e);
      }
    };

    const handleMouseDown = () => {
      document.body.style.userSelect = 'none';
      window.getSelection()?.removeAllRanges();
    };

    const handleMouseUp = () => {
      document.body.style.userSelect = '';
    };

    const handleMouseLeave = () => {
      document.body.style.userSelect = '';
    };

    const handleDragStart = (e: React.DragEvent) => {
      e.preventDefault();
    };

    return (
      <div className="w-full h-6 min-h-6 sm:h-5 relative flex items-center select-none"
        style={{ userSelect: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDragStart={handleDragStart}
      >
        {(() => {
          // Get min and max values from labels, fallback to 1 and 5
          const sortedLabels = labels.sort((a, b) => parseInt(a.value) - parseInt(b.value));
          const minValue = sortedLabels.length > 0 ? parseInt(sortedLabels[0].value) : 1;
          const maxValue = sortedLabels.length > 0 ? parseInt(sortedLabels[sortedLabels.length - 1].value) : 5;
          
          
          return (
            <>
              <span className={`absolute left-2 text-xs pointer-events-none z-10 ${isOpenToAll ? 'text-white font-medium' : 'text-gray-500'}`}>{minValue}</span>
              
              <div
                className="w-full h-full min-h-5 rounded-[20px] relative cursor-pointer transition-all duration-200 border"
                style={{
                  backgroundColor: isOpenToAll ? '#672DB7' : '#F5F5F5',
                  borderColor: isOpenToAll ? '#672DB7' : '#ADADAD'
                }}
                onClick={handleSliderClick}
                onMouseMove={handleSliderDrag}
                onMouseDown={handleSliderDrag}
                onDragStart={handleDragStart}
              >
                {isOpenToAll && (
                  <div
                    className="absolute top-0 left-0 h-full bg-[#672DB7] rounded-[20px]"
                    style={{
                      width: fillWidth,
                      transition: 'width 1.2s ease-in-out'
                    }}
                  />
                )}
              </div>
              
              {!isOpenToAll && (
                <div 
                  className="absolute top-1/2 transform -translate-y-1/2 w-7 h-7 border border-gray-300 rounded-full flex items-center justify-center text-sm font-semibold z-30 cursor-pointer"
                  style={{
                    backgroundColor: isImportance ? 'white' : '#672DB7',
                    boxShadow: isImportance ? '0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.12)',
                    left: value === minValue ? '0px' : value === maxValue ? 'calc(100% - 28px)' : `calc(${((value - minValue) / (maxValue - minValue)) * 100}% - 14px)`
                  }}
                >
                  <span style={{ color: isImportance ? '#672DB7' : 'white' }}>{value}</span>
                </div>
              )}
              
              <span className={`absolute right-2 text-xs pointer-events-none z-10 ${isOpenToAll ? 'text-white font-medium' : 'text-gray-500'}`}>{maxValue}</span>
            </>
          );
        })()}
      </div>
    );
  };

  const SliderLabels = ({ 
    labels, 
    currentValue 
  }: { 
    labels: Array<{ value: string; answer_text: string }>; 
    currentValue: number;
  }) => {
    if (labels.length === 0) return null;
    
    // Sort labels by value
    const sortedLabels = labels.sort((a, b) => parseInt(a.value) - parseInt(b.value));
    const minValue = parseInt(sortedLabels[0].value);
    const maxValue = parseInt(sortedLabels[sortedLabels.length - 1].value);
    
    // Find the current label
    const currentLabel = sortedLabels.find(label => parseInt(label.value) === currentValue);
    
    
    return (
      <div className="relative text-xs text-gray-500" style={{ width: '500px' }}>
        {currentLabel && (
          <span 
            className="absolute" 
            style={{ 
              left: currentValue === minValue 
                ? '14px' 
                : currentValue === maxValue 
                  ? 'calc(100% - 14px)' 
                  : `${((currentValue - minValue) / (maxValue - minValue)) * 100}%`,
              transform: 'translateX(-50%)' 
            }}
          >
            {currentLabel.answer_text.toUpperCase()}
          </span>
        )}
      </div>
    );
  };

  // Helper function to get min/max labels from questions
  const getMinMaxLabels = () => {
    if (!questions || questions.length === 0) return { minLabel: 'LESS', maxLabel: 'MORE' };
    
    // Get all answers from all questions and find global min/max
    const allAnswers = questions.flatMap(q => q.answers || []);
    if (allAnswers.length === 0) return { minLabel: 'LESS', maxLabel: 'MORE' };
    
    const sortedAnswers = allAnswers.sort((a, b) => parseInt(a.value) - parseInt(b.value));
    const minLabel = sortedAnswers[0]?.answer_text?.toUpperCase() || 'LESS';
    const maxLabel = sortedAnswers[sortedAnswers.length - 1]?.answer_text?.toUpperCase() || 'MORE';
    
    return { minLabel, maxLabel };
  };

  const renderQuestionTemplate = () => {
    if (!questions || questions.length === 0) return null;

    // Special handling for Relationship question (question_number === 1) - ONLY Me section, no "Looking For"
    if (questionNumber === 1) {
      return (
        <div className="mb-6 w-full overflow-x-hidden">
          <h3 className="text-2xl font-bold text-center mb-1">Me</h3>

          {/* Responsive slider block — narrower on medium and smaller */}
          <div className="w-full max-w-[95vw] sm:max-w-[640px] md:max-w-[630px] lg:max-w-[692px] mx-auto">
          {/* LESS, MORE, and OTA labels — responsive grid */}
          <div className="grid items-center justify-center mb-2 grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
            <div></div>
            <div className="flex justify-between text-xs text-gray-500 min-w-0">
              <span>LESS</span>
              <span>MORE</span>
            </div>
            <div className="text-xs text-gray-500 text-center lg:ml-[-15px]">
              {questions.some(q => q.open_to_all_me) ? 'OTA' : ''}
            </div>
          </div>

          {/* Grid container for perfect alignment — responsive */}
          <div className="grid items-center justify-center grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">

            {/* Question Rows for Relationship Questions */}
            {questions.map((question) => {
              const questionKey = `q${question.group_number}`;
              const meKey = `${questionKey}_me`;

              return (
                <React.Fragment key={question.id}>
                  <div className="text-xs font-semibold text-gray-400 min-w-0">{question.question_name.toUpperCase()}</div>
                  <div className="relative min-w-0">
                    <SliderComponent
                      value={sliderAnswers[meKey] || 3}
                      onChange={(value) => setSliderAnswers(prev => ({ ...prev, [meKey]: value }))}
                      isOpenToAll={openToAllStates[meKey] || false}
                      labels={question.answers}
                    />
                  </div>
                  <div>
                    {question.open_to_all_me ? (
                      <label className="flex items-center cursor-pointer">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={openToAllStates[meKey] || false}
                            onChange={() => setOpenToAllStates(prev => ({
                              ...prev,
                              [meKey]: !prev[meKey]
                            }))}
                            className="sr-only"
                          />
                          <div className={`block w-11 h-6 rounded-full ${openToAllStates[meKey] ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                          <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAllStates[meKey] ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                        </div>
                      </label>
                    ) : (
                      <div className="w-11 h-6"></div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}

            {/* IMPORTANCE Slider Row */}
            <div className="text-xs font-semibold text-gray-400">IMPORTANCE</div>
            <div className="relative min-w-0">
              <SliderComponent
                value={importanceValues.me}
                onChange={(value) => setImportanceValues(prev => ({ ...prev, me: value }))}
                isOpenToAll={false}
                isImportance={true}
                labels={IMPORTANCE_LABELS}
              />
            </div>
            <div className="w-11 h-6"></div>
          </div>

          {/* Importance labels below Me section — responsive */}
          <div className="grid items-center justify-center mt-2 grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
            <div></div>
            <div className="relative text-xs text-gray-500 w-full min-w-0">
              {importanceValues.me === 1 && (
                <span className="absolute" style={{ left: '14px', transform: 'translateX(-50%)' }}>TRIVIAL</span>
              )}
              {importanceValues.me === 2 && (
                <span className="absolute" style={{ left: '25%', transform: 'translateX(-50%)' }}>MINOR</span>
              )}
              {importanceValues.me === 3 && (
                <span className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>AVERAGE</span>
              )}
              {importanceValues.me === 4 && (
                <span className="absolute" style={{ left: '75%', transform: 'translateX(-50%)' }}>SIGNIFICANT</span>
              )}
              {importanceValues.me === 5 && (
                <span className="absolute" style={{ left: 'calc(100% - 14px)', transform: 'translateX(-50%)' }}>ESSENTIAL</span>
              )}
            </div>
            <div></div>
          </div>
          </div>
        </div>
      );
    }

    // For all other questions, use the renderQuestionContent implementation
    return renderQuestionContent();
  };

  const renderQuestionContent = () => {
    console.log('🔴 renderQuestionContent called', { questionNumber, questionsCount: questions?.length, firstQuestionType: questions?.[0]?.question_type });
    if (!questions || questions.length === 0) return null;

    // Gender question (question_number === 2) - "Them" first with importance, then "Me" without importance
    if (questionNumber === 2) {
      return (
        <div className="w-full overflow-x-hidden">
          {/* Responsive slider block — same as question 1 */}
          <div className="w-full max-w-[95vw] sm:max-w-[640px] md:max-w-[630px] lg:max-w-[692px] mx-auto">
          {/* Them Section */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-center mb-1" style={{ color: '#672DB7' }}>Them</h3>

            <div className="grid items-center justify-center mb-2 grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
              <div></div>
              <div className="flex justify-between text-xs text-gray-500 min-w-0">
                <span>LESS</span>
                <span>MORE</span>
              </div>
              <div className="text-xs text-gray-500 text-center lg:ml-[-15px]">
                {questions.some(q => q.open_to_all_looking_for) ? 'OTA' : ''}
              </div>
            </div>

            <div className="grid items-center justify-center grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
              {questions.map((question) => {
                const key = `q${question.group_number || question.id}`;
                const lookingKey = `${key}_looking`;

                return (
                  <React.Fragment key={`looking-${question.id}`}>
                    <div className="text-xs font-semibold text-gray-400 min-w-0">{question.question_name.toUpperCase()}</div>
                    <div className="relative min-w-0">
                      <SliderComponent
                        value={sliderAnswers[lookingKey] || 3}
                        onChange={(value) => setSliderAnswers(prev => ({ ...prev, [lookingKey]: value }))}
                        isOpenToAll={openToAllStates[lookingKey] || false}
                        labels={question.answers}
                      />
                    </div>
                    <div>
                      {question.open_to_all_looking_for ? (
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={openToAllStates[lookingKey] || false}
                              onChange={() => setOpenToAllStates(prev => ({
                                ...prev,
                                [lookingKey]: !prev[lookingKey]
                              }))}
                              className="sr-only"
                            />
                            <div className={`block w-11 h-6 rounded-full ${openToAllStates[lookingKey] ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                            <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAllStates[lookingKey] ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                          </div>
                        </label>
                      ) : (
                        <div className="w-11 h-6"></div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}

              {/* IMPORTANCE Slider Row */}
              <div className="text-xs font-semibold text-gray-400">IMPORTANCE</div>
              <div className="relative min-w-0">
                <SliderComponent
                  value={importanceValues.lookingFor}
                  onChange={(value) => setImportanceValues(prev => ({ ...prev, lookingFor: value }))}
                  isOpenToAll={false}
                  isImportance={true}
                  labels={IMPORTANCE_LABELS}
                />
              </div>
              <div className="w-11 h-6"></div>
            </div>

            {/* Importance labels below Them section — responsive */}
            <div className="grid items-center justify-center mt-2 grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
              <div></div>
              <div className="relative text-xs text-gray-500 w-full min-w-0">
                {importanceValues.lookingFor === 1 && (
                  <span className="absolute" style={{ left: '14px', transform: 'translateX(-50%)' }}>TRIVIAL</span>
                )}
                {importanceValues.lookingFor === 2 && (
                  <span className="absolute" style={{ left: '25%', transform: 'translateX(-50%)' }}>MINOR</span>
                )}
                {importanceValues.lookingFor === 3 && (
                  <span className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>AVERAGE</span>
                )}
                {importanceValues.lookingFor === 4 && (
                  <span className="absolute" style={{ left: '75%', transform: 'translateX(-50%)' }}>SIGNIFICANT</span>
                )}
                {importanceValues.lookingFor === 5 && (
                  <span className="absolute" style={{ left: 'calc(100% - 14px)', transform: 'translateX(-50%)' }}>ESSENTIAL</span>
                )}
              </div>
              <div></div>
            </div>
          </div>

          {/* Me Section - NO importance slider */}
          <div className="mb-6 pt-8">
            <h3 className="text-2xl font-bold text-center mb-1">Me</h3>

            <div className="grid items-center justify-center mb-2 grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
              <div></div>
              <div className="flex justify-between text-xs text-gray-500 min-w-0">
                <span>LESS</span>
                <span>MORE</span>
              </div>
              <div className="text-xs text-gray-500 text-center lg:ml-[-15px]">
                {questions.some(q => q.open_to_all_me) ? 'OTA' : ''}
              </div>
            </div>

            <div className="grid items-center justify-center grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
              {questions.map((question) => {
                const key = `q${question.group_number || question.id}`;
                const meKey = `${key}_me`;

                return (
                  <React.Fragment key={question.id}>
                    <div className="text-xs font-semibold text-gray-400 min-w-0">{question.question_name.toUpperCase()}</div>
                    <div className="relative min-w-0">
                      <SliderComponent
                        value={sliderAnswers[meKey] || 3}
                        onChange={(value) => setSliderAnswers(prev => ({ ...prev, [meKey]: value }))}
                        isOpenToAll={openToAllStates[meKey] || false}
                        labels={question.answers}
                      />
                    </div>
                    <div>
                      {question.open_to_all_me ? (
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={openToAllStates[meKey] || false}
                              onChange={() => setOpenToAllStates(prev => ({
                                ...prev,
                                [meKey]: !prev[meKey]
                              }))}
                              className="sr-only"
                            />
                            <div className={`block w-11 h-6 rounded-full ${openToAllStates[meKey] ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                            <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAllStates[meKey] ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                          </div>
                        </label>
                      ) : (
                        <div className="w-11 h-6"></div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          </div>
        </div>
      );
    }

    // Basic multi-slider questions like Exercise/Habits/Religion (question_number === 6, 7, 8, 9, 10, etc.)
    if ([6, 7, 8, 9, 10].includes(questionNumber)) {
      const isKidsQuestion = questionNumber === 10;

      // Show "Them" first, then "Me" (like onboarding) — responsive container and grids for small/medium devices
      return (
        <div className="w-full overflow-x-hidden">
          <div className="w-full max-w-[95vw] sm:max-w-[640px] md:max-w-[630px] lg:max-w-[692px] mx-auto">
          {/* Them Section */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-center mb-1" style={{ color: '#672DB7' }}>Them</h3>

            <div className="grid items-center justify-center mb-2 grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
              <div></div>
              <div className="flex justify-between text-xs text-gray-500 min-w-0">
                <span>LESS</span>
                <span>MORE</span>
              </div>
              <div className="text-xs text-gray-500 text-center lg:ml-[-15px]">
                {questions.some(q => q.open_to_all_looking_for) ? 'OTA' : ''}
              </div>
            </div>

            <div className="grid items-center justify-center grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
              {questions.map((question) => {
                const key = `q${question.group_number || question.id}`;
                const lookingKey = `${key}_looking`;

                // For Kids question, use WANT/HAVE labels
                let label = (question.question_name || 'ANSWER').toUpperCase();
                if (isKidsQuestion && question.group_number === 1) {
                  label = 'WANT';
                } else if (isKidsQuestion && question.group_number === 2) {
                  label = 'HAVE';
                }

                return (
                  <React.Fragment key={`looking-${question.id}`}>
                    <div className="text-xs font-semibold text-gray-400 min-w-0">{label}</div>
                    <div className="relative min-w-0">
                      <SliderComponent
                        value={sliderAnswers[lookingKey] || 3}
                        onChange={(value) => setSliderAnswers(prev => ({ ...prev, [lookingKey]: value }))}
                        isOpenToAll={openToAllStates[lookingKey] || false}
                        labels={question.answers}
                      />
                    </div>
                    <div>
                      {question.open_to_all_looking_for ? (
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={openToAllStates[lookingKey] || false}
                              onChange={() => setOpenToAllStates(prev => ({
                                ...prev,
                                [lookingKey]: !prev[lookingKey]
                              }))}
                              className="sr-only"
                            />
                            <div className={`block w-11 h-6 rounded-full ${openToAllStates[lookingKey] ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                            <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAllStates[lookingKey] ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                          </div>
                        </label>
                      ) : (
                        <div className="w-11 h-6"></div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}

              {/* IMPORTANCE Slider Row */}
              <div className="text-xs font-semibold text-gray-400 min-w-0">IMPORTANCE</div>
              <div className="relative min-w-0">
                <SliderComponent
                  value={importanceValues.lookingFor}
                  onChange={(value) => setImportanceValues(prev => ({ ...prev, lookingFor: value }))}
                  isOpenToAll={false}
                  isImportance={true}
                  labels={IMPORTANCE_LABELS}
                />
              </div>
              <div className="w-11 h-6"></div>
            </div>

            {/* Importance labels below Them section — responsive */}
            <div className="grid items-center justify-center mt-2 grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
              <div></div>
              <div className="relative text-xs text-gray-500 w-full min-w-0">
                {importanceValues.lookingFor === 1 && (
                  <span className="absolute" style={{ left: '14px', transform: 'translateX(-50%)' }}>TRIVIAL</span>
                )}
                {importanceValues.lookingFor === 2 && (
                  <span className="absolute" style={{ left: '25%', transform: 'translateX(-50%)' }}>MINOR</span>
                )}
                {importanceValues.lookingFor === 3 && (
                  <span className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>AVERAGE</span>
                )}
                {importanceValues.lookingFor === 4 && (
                  <span className="absolute" style={{ left: '75%', transform: 'translateX(-50%)' }}>SIGNIFICANT</span>
                )}
                {importanceValues.lookingFor === 5 && (
                  <span className="absolute" style={{ left: 'calc(100% - 14px)', transform: 'translateX(-50%)' }}>ESSENTIAL</span>
                )}
              </div>
              <div></div>
            </div>
          </div>

          {/* Me Section - NO importance slider */}
          <div className="mb-6 pt-8">
            <h3 className="text-2xl font-bold text-center mb-1">Me</h3>

            <div className="grid items-center justify-center mb-2 grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
              <div></div>
              <div className="flex justify-between text-xs text-gray-500 min-w-0">
                <span>LESS</span>
                <span>MORE</span>
              </div>
              <div className="text-xs text-gray-500 text-center lg:ml-[-15px]">
                {questions.some(q => q.open_to_all_me) ? 'OTA' : ''}
              </div>
            </div>

            <div className="grid items-center justify-center grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
              {questions.map((question) => {
                const key = `q${question.group_number || question.id}`;
                const meKey = `${key}_me`;

                // For Kids question, use WANT/HAVE labels
                let label = (question.question_name || 'ANSWER').toUpperCase();
                if (isKidsQuestion && question.group_number === 1) {
                  label = 'WANT';
                } else if (isKidsQuestion && question.group_number === 2) {
                  label = 'HAVE';
                }

                return (
                  <React.Fragment key={question.id}>
                    <div className="text-xs font-semibold text-gray-400 min-w-0">{label}</div>
                    <div className="relative min-w-0">
                      <SliderComponent
                        value={sliderAnswers[meKey] || 3}
                        onChange={(value) => setSliderAnswers(prev => ({ ...prev, [meKey]: value }))}
                        isOpenToAll={openToAllStates[meKey] || false}
                        labels={question.answers}
                      />
                    </div>
                    <div>
                      {question.open_to_all_me ? (
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={openToAllStates[meKey] || false}
                              onChange={() => setOpenToAllStates(prev => ({
                                ...prev,
                                [meKey]: !prev[meKey]
                              }))}
                              className="sr-only"
                            />
                            <div className={`block w-11 h-6 rounded-full ${openToAllStates[meKey] ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                            <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAllStates[meKey] ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                          </div>
                        </label>
                      ) : (
                        <div className="w-11 h-6"></div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          </div>
        </div>
      );
    }

    // Grouped questions (question_type === 'grouped') - Card selection UI like ethnicity
    console.log('🟡 About to check grouped at line 1601:', {
      questionNumber,
      questionsLength: questions.length,
      firstQuestion: questions[0],
      questionType: questions[0]?.question_type,
      isGrouped: questions.length > 0 && questions[0].question_type === 'grouped'
    });
    if (questions.length > 0 && questions[0].question_type === 'grouped') {
      const visibleQuestions = showAllGroupedOptions ? questions : questions.slice(0, 6);
      const hasMoreQuestions = questions.length > 6;

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

              // Debug: Log the isAnswered check for each question
              console.log(`🔍 isAnswered check for "${question.question_name}":`, {
                questionId: question.id,
                existingAnswersCount: existingAnswers.length,
                isAnswered
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
    console.log('🟢 Checking if grouped:', { questionNumber, isGroupedQuestion, questionType: questions[0]?.question_type, questionsCount: questions.length });

    if (isGroupedQuestion) {
      console.log('🟢 Rendering grouped question cards for question', questionNumber);
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

      return (
        <div className="w-full overflow-x-hidden">
          <div className="w-full max-w-[95vw] sm:max-w-[640px] md:max-w-[630px] lg:max-w-[692px] mx-auto">
          {/* Them Section — same 3-col responsive grid as grouped/auth */}
          <div className="mb-4 sm:mb-6">
            <h3 className="text-xl sm:text-2xl font-bold text-center mb-1" style={{ color: '#672DB7' }}>Them</h3>

            <div className="grid items-center mb-1 sm:mb-2 grid-cols-[72px_minmax(0,1fr)_44px] sm:grid-cols-[80px_1fr_44px] gap-x-2 sm:gap-x-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5">
              <div className="min-w-0" aria-hidden></div>
              <div className="flex justify-between text-xs text-gray-500 min-w-0">
                <span>{lessLabel}</span>
                <span>{moreLabel}</span>
              </div>
              <div className="text-xs text-gray-500 text-center min-w-0 shrink-0 w-11 lg:ml-[-15px]">
                {question.open_to_all_looking_for ? 'OTA' : ''}
              </div>
            </div>

            <div className="grid items-center grid-cols-[72px_minmax(0,1fr)_44px] sm:grid-cols-[80px_1fr_44px] gap-x-2 gap-y-3 sm:gap-x-3 sm:gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
              <div className="min-w-0" aria-hidden></div>
              <div className="relative min-w-0">
                <SliderComponent
                  value={sliderAnswers[lookingKey] || 3}
                  onChange={(value) => setSliderAnswers(prev => ({ ...prev, [lookingKey]: value }))}
                  isOpenToAll={openToAllStates[lookingKey] || false}
                  labels={question.answers}
                />
              </div>
              <div className="flex justify-center shrink-0 w-11">
                {question.open_to_all_looking_for ? (
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={openToAllStates[lookingKey] || false}
                        onChange={() => setOpenToAllStates(prev => ({
                          ...prev,
                          [lookingKey]: !prev[lookingKey]
                        }))}
                        className="sr-only"
                      />
                      <div className={`block w-11 h-6 rounded-full ${openToAllStates[lookingKey] ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                      <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAllStates[lookingKey] ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                    </div>
                  </label>
                ) : (
                  <div className="w-11 h-6" aria-hidden></div>
                )}
              </div>

              {/* Importance row — same column widths so slider is full width */}
              <div className="text-xs font-semibold text-gray-400 min-w-0 shrink-0 overflow-hidden text-ellipsis whitespace-nowrap max-w-[72px] sm:max-w-none">
                IMPORTANCE
              </div>
              <div className="relative min-w-0">
                <SliderComponent
                  value={importanceValues.lookingFor}
                  onChange={(value) => setImportanceValues(prev => ({ ...prev, lookingFor: value }))}
                  isOpenToAll={false}
                  isImportance={true}
                  labels={IMPORTANCE_LABELS}
                />
              </div>
              <div className="shrink-0 w-11 h-6" aria-hidden></div>
            </div>

            {/* Importance labels below Them section */}
            <div className="grid items-center mt-1 sm:mt-2 grid-cols-[72px_minmax(0,1fr)_44px] sm:grid-cols-[80px_1fr_44px] gap-x-2 sm:gap-x-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5">
              <div className="min-w-0" aria-hidden></div>
              <div className="relative text-xs text-gray-500 w-full min-w-0">
                {importanceValues.lookingFor === 1 && (
                  <span className="absolute" style={{ left: '14px', transform: 'translateX(-50%)' }}>TRIVIAL</span>
                )}
                {importanceValues.lookingFor === 2 && (
                  <span className="absolute" style={{ left: '25%', transform: 'translateX(-50%)' }}>MINOR</span>
                )}
                {importanceValues.lookingFor === 3 && (
                  <span className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>AVERAGE</span>
                )}
                {importanceValues.lookingFor === 4 && (
                  <span className="absolute" style={{ left: '75%', transform: 'translateX(-50%)' }}>SIGNIFICANT</span>
                )}
                {importanceValues.lookingFor === 5 && (
                  <span className="absolute" style={{ left: 'calc(100% - 14px)', transform: 'translateX(-50%)' }}>ESSENTIAL</span>
                )}
              </div>
              <div className="min-w-0 shrink-0 w-11" aria-hidden></div>
            </div>
          </div>

          {/* Me Section */}
          <div className="mb-4 sm:mb-6 pt-4 sm:pt-8">
            <h3 className="text-xl sm:text-2xl font-bold text-center mb-1">Me</h3>

            <div className="grid items-center mb-1 sm:mb-2 grid-cols-[72px_minmax(0,1fr)_44px] sm:grid-cols-[80px_1fr_44px] gap-x-2 sm:gap-x-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5">
              <div className="min-w-0" aria-hidden></div>
              <div className="flex justify-between text-xs text-gray-500 min-w-0">
                <span>{lessLabel}</span>
                <span>{moreLabel}</span>
              </div>
              <div className="text-xs text-gray-500 text-center min-w-0 shrink-0 w-11 lg:ml-[-15px]">
                {question.open_to_all_me ? 'OTA' : ''}
              </div>
            </div>

            <div className="grid items-center grid-cols-[72px_minmax(0,1fr)_44px] sm:grid-cols-[80px_1fr_44px] gap-x-2 gap-y-3 sm:gap-x-3 sm:gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
              <div className="min-w-0" aria-hidden></div>
              <div className="relative min-w-0">
                <SliderComponent
                  value={sliderAnswers[meKey] || 3}
                  onChange={(value) => setSliderAnswers(prev => ({ ...prev, [meKey]: value }))}
                  isOpenToAll={openToAllStates[meKey] || false}
                  labels={question.answers}
                />
              </div>
              <div className="flex justify-center shrink-0 w-11">
                {question.open_to_all_me ? (
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={openToAllStates[meKey] || false}
                        onChange={() => setOpenToAllStates(prev => ({
                          ...prev,
                          [meKey]: !prev[meKey]
                        }))}
                        className="sr-only"
                      />
                      <div className={`block w-11 h-6 rounded-full ${openToAllStates[meKey] ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                      <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAllStates[meKey] ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                    </div>
                  </label>
                ) : (
                  <div className="w-11 h-6" aria-hidden></div>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>
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

          .qdetail-math-operator:nth-child(1) { animation: qdetailOrbit0 3.5s linear infinite; }
          .qdetail-math-operator:nth-child(2) { animation: qdetailOrbit1 4.0s linear infinite; }
          .qdetail-math-operator:nth-child(3) { animation: qdetailOrbit2 3.2s linear infinite; }
          .qdetail-math-operator:nth-child(4) { animation: qdetailOrbit3 3.8s linear infinite; }
          .qdetail-math-operator:nth-child(5) { animation: qdetailOrbit4 4.2s linear infinite; }
          .qdetail-math-operator:nth-child(6) { animation: qdetailOrbit5 3.6s linear infinite; }
          .qdetail-math-operator:nth-child(7) { animation: qdetailOrbit6 3.4s linear infinite; }

          .qdetail-loading-text {
            animation: qdetailTextFade 1.5s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
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
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4 sm:px-6 py-6 overflow-x-hidden">
        <div className={`w-full min-w-0 mx-auto ${[1, 2, 6, 7, 8, 9, 10].includes(questionNumber) || questionNumber > 10 ? 'max-w-[95vw] sm:max-w-[640px] md:max-w-[630px] lg:max-w-[692px]' : 'max-w-4xl'}`}>
          {/* Title — responsive typography for small/medium/large */}
          <div className="text-center mb-4 sm:mb-6 lg:mb-8">
            <div className="inline-block w-full max-w-full px-0 sm:px-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-black mb-1 sm:mb-2">
                {questionNumber}. {questions && questions.length > 0 ? (
                  questions[0].group_name ? questions[0].group_name : 
                  (questions[0].question_name || questionTitles[questionNumber])
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
            <p className="text-base sm:text-xl lg:text-2xl xl:text-3xl font-bold text-black mb-6 sm:mb-8 lg:mb-12 break-words">
              {questions && questions.length > 0 && questions[0].group_name_text ? questions[0].group_name_text : questionTexts[questionNumber]}
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

      {/* Footer with Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex justify-between items-center px-6 py-4">
          <button
            onClick={() => {
              // Restore the page from sessionStorage if available
              const savedPage = typeof window !== 'undefined' 
                ? sessionStorage.getItem('questions_current_page') 
                : null;
              const pageParam = savedPage ? `?page=${savedPage}` : '';
              router.push(`/questions${pageParam}`);
            }}
            className="text-gray-900 font-medium hover:text-gray-500 transition-colors"
          >
            Back
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-8 py-3 rounded-md font-medium transition-colors ${
              !saving
                ? 'bg-black text-white hover:bg-gray-800'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </footer>
    </div>
  );
}