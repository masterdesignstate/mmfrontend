'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

type QuestionShape = {
  id: string;
  question_name: string;
  question_number: number;
  group_number?: number;
  group_name: string;
  text: string;
  answers: Array<{ value: string; answer_text: string }>;
  open_to_all_me: boolean;
  open_to_all_looking_for: boolean;
};

const questionKeys = ['answer1', 'answer2'] as const;
const meOpenKeys = ['answer1MeOpen', 'answer2MeOpen'] as const;
const lookingOpenKeys = ['answer1LookingOpen', 'answer2LookingOpen'] as const;

type QuestionKey = (typeof questionKeys)[number];
type MeOpenKey = (typeof meOpenKeys)[number];
type LookingOpenKey = (typeof lookingOpenKeys)[number];

export default function Question10Page() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState<string>('');
  const [questions, setQuestions] = useState<QuestionShape[]>([]);
  const [faithQuestions, setFaithQuestions] = useState<QuestionShape[]>([]);

  const [myAnswers, setMyAnswers] = useState<Record<QuestionKey, number>>({
    answer1: 3,
    answer2: 1
  });

  const [lookingForAnswers, setLookingForAnswers] = useState<Record<QuestionKey, number>>({
    answer1: 3,
    answer2: 1
  });

  const [openToAll, setOpenToAll] = useState<Record<MeOpenKey | LookingOpenKey, boolean>>({
    answer1MeOpen: false,
    answer1LookingOpen: false,
    answer2MeOpen: false,
    answer2LookingOpen: false
  });

  const [importance, setImportance] = useState({
    me: 1,
    lookingFor: 3
  });

  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState<string>('');

  const renderTopLabelsForWant = (question?: QuestionShape) => {
    if (!question?.answers || question.answers.length === 0) {
      return (
        <div className="flex justify-between text-xs text-gray-500 w-full">
          <span>LESS</span>
          <span>MORE</span>
        </div>
      );
    }

    const sortedAnswers = [...question.answers].sort((a, b) => parseInt(a.value) - parseInt(b.value));

    return (
      <div className="relative text-xs text-gray-500 w-full" style={{ height: '14px' }}>
        {sortedAnswers.map((answer) => {
          const value = parseInt(answer.value, 10);
          let leftPosition = '50%';

          if (value === 1) leftPosition = '14px';
          else if (value === 2) leftPosition = '25%';
          else if (value === 3) leftPosition = '50%';
          else if (value === 4) leftPosition = '75%';
          else if (value === 5) leftPosition = 'calc(100% - 14px)';

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

  const renderTopLabelsForHave = (question?: QuestionShape) => {
    if (!question?.answers || question.answers.length === 0) {
      return (
        <div className="flex justify-between text-xs text-gray-500 w-full">
          <span>NO</span>
          <span>YES</span>
        </div>
      );
    }

    const sortedAnswers = [...question.answers].sort((a, b) => parseInt(a.value) - parseInt(b.value));
    return (
      <div className="relative text-xs text-gray-500 w-full" style={{ height: '14px' }}>
        {sortedAnswers.map((answer) => {
          const value = parseInt(answer.value, 10);
          let leftPosition: string | undefined;

          if (value === 1) leftPosition = '14px';
          if (value === 5) leftPosition = 'calc(100% - 14px)';

          if (!leftPosition) {
            return null;
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

  useEffect(() => {
    const userIdParam = searchParams.get('user_id');
    const questionsParam = searchParams.get('questions');

    if (userIdParam) {
      setUserId(userIdParam);
    } else {
      const storedUserId = localStorage.getItem('user_id');
      if (storedUserId) {
        setUserId(storedUserId);
      }
    }

    if (questionsParam) {
      try {
        const parsedQuestions: QuestionShape[] = JSON.parse(questionsParam);
        setQuestions(parsedQuestions);
      } catch (err) {
        console.error('Error parsing questions from URL:', err);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchQuestionsIfNeeded = async () => {
      if (userId && questions.length === 0 && !searchParams.get('questions')) {
        setLoadingQuestions(true);
        try {
          const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=10`;
          const response = await fetch(apiUrl);

          if (response.ok) {
            const data = await response.json();
            const sortedQuestions = (data.results || []).sort((a: QuestionShape, b: QuestionShape) => {
              const groupA = a.group_number || 0;
              const groupB = b.group_number || 0;
              return groupA - groupB;
            });
            setQuestions(sortedQuestions);
          }
        } catch (err) {
          console.error('Error fetching Kids questions:', err);
        } finally {
          setLoadingQuestions(false);
        }
      }
    };

    fetchQuestionsIfNeeded();
  }, [userId, questions.length, searchParams]);

  useEffect(() => {
    const fetchFaithQuestions = async () => {
      if (userId && faithQuestions.length === 0) {
        try {
          const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=11`;
          const response = await fetch(apiUrl);

          if (response.ok) {
            const data = await response.json();
            const sortedFaithQuestions = (data.results || []).sort((a: QuestionShape, b: QuestionShape) => {
              const groupA = a.group_number || 0;
              const groupB = b.group_number || 0;
              return groupA - groupB;
            });
            setFaithQuestions(sortedFaithQuestions);
          }
        } catch (err) {
          console.warn('Failed to preload faith questions', err);
        }
      }
    };

    fetchFaithQuestions();
  }, [userId, faithQuestions.length]);

  const questionPairs = questionKeys.map((key, index) => ({
    key,
    index,
    question: questions[index],
    meOpenKey: meOpenKeys[index],
    lookingOpenKey: lookingOpenKeys[index],
    labelRenderer: index === 0 ? renderTopLabelsForWant : renderTopLabelsForHave
  }));

  const handleSliderChange = (
    section: 'myAnswers' | 'lookingForAnswers' | 'importance',
    questionKey?: QuestionKey,
    value?: number
  ) => {
    if (section === 'myAnswers' && questionKey && value !== undefined) {
      setMyAnswers(prev => ({ ...prev, [questionKey]: value }));
    } else if (section === 'lookingForAnswers' && questionKey && value !== undefined) {
      setLookingForAnswers(prev => ({ ...prev, [questionKey]: value }));
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
    let currentUserId = userId;

    if (!currentUserId) {
      const storedUserId = localStorage.getItem('user_id');
      if (storedUserId) {
        currentUserId = storedUserId;
        setUserId(storedUserId);
      } else {
        setError('User ID is required. Please log in again.');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const userAnswers = questionPairs
        .filter(pair => pair.question)
        .map(({ question, key, meOpenKey, lookingOpenKey }) => ({
          user_id: currentUserId,
          question_id: question!.id,
          me_answer: openToAll[meOpenKey] ? 6 : myAnswers[key],
          me_open_to_all: openToAll[meOpenKey],
          me_importance: importance.me,
          me_share: true,
          looking_for_answer: openToAll[lookingOpenKey] ? 6 : lookingForAnswers[key],
          looking_for_open_to_all: openToAll[lookingOpenKey],
          looking_for_importance: importance.lookingFor,
          looking_for_share: true
        }));

      const responses = await Promise.all(
        userAnswers.map(userAnswer =>
          fetch(getApiUrl(API_ENDPOINTS.ANSWERS), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userAnswer)
          })
        )
      );

      for (const response of responses) {
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to save answer');
        }
      }

      if (currentUserId) {
        localStorage.setItem('user_id', currentUserId);
      }

      router.push('/profile');
    } catch (err) {
      console.error('Error saving question 10 answers:', err);
      setError(err instanceof Error ? err.message : 'Failed to save answers');
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

  const primaryTitle = '10. Kids';
  const primarySubtitle = 'What are your thoughts on kids?';

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
        <button className="p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 py-6">
        <div className="w-full max-w-4xl">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">{primaryTitle}</h1>
            <p className="text-3xl font-bold text-black mb-12">
              {questions[0]?.text || primarySubtitle}
            </p>
          </div>

          {loadingQuestions && (
            <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded text-center">
              Loading kids questions...
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Looking For Section */}
          <div className="mb-10">
            <h3 className="text-2xl font-bold text-center mb-1" style={{ color: '#672DB7' }}>Them</h3>

            {questionPairs.map(({ key, index, question, lookingOpenKey, labelRenderer }) =>
              question ? (
                <React.Fragment key={`looking-${key}`}>
                  <div
                    className="grid items-center justify-center mx-auto w-full max-w-[640px] mb-2 mobile-grid-labels"
                    style={{
                      gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                      columnGap: 'clamp(12px, 5vw, 24px)'
                    }}
                  >
                    <div></div>
                    <div className="w-full">{labelRenderer(question)}</div>
                    <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
                      {question.open_to_all_looking_for ? 'OTA' : ''}
                    </div>
                  </div>

                  <div
                    className="grid items-center justify-center mx-auto w-full max-w-[640px] mobile-grid-rows"
                    style={{
                      gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                      columnGap: 'clamp(12px, 5vw, 24px)',
                      rowGap: 'clamp(24px, 6vw, 40px)'
                    }}
                  >
                    <div className="text-xs font-semibold text-gray-400">
                      {(question.question_name || `KIDS ${index + 1}`).toUpperCase()}
                    </div>
                    <div className="relative">
                      <SliderComponent
                        value={lookingForAnswers[key]}
                        onChange={(value) => handleSliderChange('lookingForAnswers', key, value)}
                        isOpenToAll={openToAll[lookingOpenKey]}
                        isBinary={index === 1}
                      />
                    </div>
                    <div className="flex justify-center">
                      {question.open_to_all_looking_for ? (
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={openToAll[lookingOpenKey]}
                              onChange={() => handleOpenToAllToggle(lookingOpenKey)}
                              className="sr-only"
                            />
                            <div className={`block w-11 h-6 rounded-full ${openToAll[lookingOpenKey] ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                            <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll[lookingOpenKey] ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                          </div>
                        </label>
                      ) : (
                        <div className="w-11 h-6"></div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              ) : null
            )}

            <div
              className="grid items-center justify-center mx-auto w-full max-w-[640px] mobile-grid-rows"
              style={{
                gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                columnGap: 'clamp(12px, 5vw, 24px)',
                rowGap: 'clamp(24px, 6vw, 40px)',
                marginTop: 'clamp(12px, 3vw, 24px)'
              }}
            >
              <div className="text-xs font-semibold text-gray-400">IMPORTANCE</div>
              <div className="relative">
                <SliderComponent
                  value={importance.lookingFor}
                  onChange={handleLookingForImportanceChange}
                  isOpenToAll={false}
                  isImportance={true}
                />
              </div>
              <div className="w-11 h-6"></div>
            </div>

            <div
              className="grid items-center justify-center mx-auto w-full max-w-[640px] mt-6"
              style={{
                gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                columnGap: 'clamp(12px, 5vw, 24px)'
              }}
            >
              <div></div>
              <div className="relative text-xs text-gray-500 w-full">
                {importance.lookingFor === 1 && (
                  <span className="absolute" style={{ left: '14px', transform: 'translateX(-50%)' }}>TRIVIAL</span>
                )}
                {importance.lookingFor === 2 && (
                  <span className="absolute" style={{ left: '25%', transform: 'translateX(-50%)' }}>MINOR</span>
                )}
                {importance.lookingFor === 3 && (
                  <span className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>AVERAGE</span>
                )}
                {importance.lookingFor === 4 && (
                  <span className="absolute" style={{ left: '75%', transform: 'translateX(-50%)' }}>SIGNIFICANT</span>
                )}
                {importance.lookingFor === 5 && (
                  <span className="absolute" style={{ left: 'calc(100% - 14px)', transform: 'translateX(-50%)' }}>ESSENTIAL</span>
                )}
              </div>
              <div></div>
            </div>
          </div>

          {/* Me Section */}
          <div className="mb-6 pt-8">
            <h3 className="text-2xl font-bold text-center mb-1">Me</h3>

            {questionPairs.map(({ key, index, question, meOpenKey, labelRenderer }) =>
              question ? (
                <React.Fragment key={`me-${key}`}>
                  <div
                    className="grid items-center justify-center mx-auto w-full max-w-[640px] mb-2 mobile-grid-labels"
                    style={{
                      gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                      columnGap: 'clamp(12px, 5vw, 24px)'
                    }}
                  >
                    <div></div>
                    <div className="w-full">{labelRenderer(question)}</div>
                    <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
                      {question.open_to_all_me ? 'OTA' : ''}
                    </div>
                  </div>

                  <div
                    className="grid items-center justify-center mx-auto w-full max-w-[640px] mobile-grid-rows"
                    style={{
                      gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                      columnGap: 'clamp(12px, 5vw, 24px)',
                      rowGap: 'clamp(20px, 5vw, 36px)'
                    }}
                  >
                    <div className="text-xs font-semibold text-gray-400">
                      {(question.question_name || `KIDS ${index + 1}`).toUpperCase()}
                    </div>
                    <div className="relative">
                      <SliderComponent
                        value={myAnswers[key]}
                        onChange={(value) => handleSliderChange('myAnswers', key, value)}
                        isOpenToAll={openToAll[meOpenKey]}
                        isBinary={index === 1}
                      />
                    </div>
                    <div className="flex justify-center">
                      {question.open_to_all_me ? (
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={openToAll[meOpenKey]}
                              onChange={() => handleOpenToAllToggle(meOpenKey)}
                              className="sr-only"
                            />
                            <div className={`block w-11 h-6 rounded-full ${openToAll[meOpenKey] ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                            <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll[meOpenKey] ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                          </div>
                        </label>
                      ) : (
                        <div className="w-11 h-6"></div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              ) : null
            )}
          </div>
        </div>
      </main>

      {/* Footer with Progress and Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="w-full h-1 bg-gray-200">
          <div className="h-full bg-black" style={{ width: '100%' }}></div>
        </div>

        <div className="flex justify-between items-center px-6 py-4">
          <button
            onClick={handleBack}
            className="text-gray-900 font-medium hover:text-gray-700 transition-colors cursor-pointer"
          >
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={loading}
            className={`px-8 py-3 rounded-md font-medium transition-colors ${
              !loading
                ? 'bg-black text-white hover:bg-gray-800 cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </div>
            ) : (
              'Next'
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}

const SliderComponent = ({
  value,
  onChange,
  isOpenToAll = false,
  isImportance = false,
  isBinary = false
}: {
  value: number;
  onChange: (value: number) => void;
  isOpenToAll?: boolean;
  isImportance?: boolean;
  isBinary?: boolean;
}) => {
  const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isOpenToAll) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;

    if (isBinary) {
      onChange(percentage < 0.5 ? 1 : 5);
      return;
    }

    const newValue = Math.round(percentage * 4) + 1;
    onChange(Math.max(1, Math.min(5, newValue)));
  };

  const handleSliderDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons === 1 && !isOpenToAll) {
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

  const positionStyle = (() => {
    if (isBinary) {
      return value === 1 ? '0px' : 'calc(100% - 28px)';
    }
    if (value === 1) return '0px';
    if (value === 5) return 'calc(100% - 28px)';
    return `calc(${((value - 1) / 4) * 100}% - 14px)`;
  })();

  return (
    <div
      className="w-full h-5 relative flex items-center select-none"
      style={{ userSelect: 'none' }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onDragStart={handleDragStart}
    >
      {!isOpenToAll && <span className="absolute left-2 text-xs text-gray-500 pointer-events-none z-10">1</span>}

      <div
        className="slider-track w-full h-5 rounded-[20px] relative cursor-pointer transition-all duration-200 border"
        style={{
          backgroundColor: isOpenToAll ? '#672DB7' : '#F5F5F5',
          borderColor: isOpenToAll ? '#672DB7' : '#ADADAD'
        }}
        onClick={handleSliderClick}
        onMouseMove={handleSliderDrag}
        onMouseDown={handleSliderDrag}
        onDragStart={handleDragStart}
      />

      {!isOpenToAll && (
        <div
          className="absolute top-1/2 transform -translate-y-1/2 w-7 h-7 border border-gray-300 rounded-full flex items-center justify-center text-sm font-semibold z-30 cursor-pointer"
          style={{
            backgroundColor: isImportance ? 'white' : '#672DB7',
            boxShadow: isImportance
              ? '0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)'
              : '0 1px 3px rgba(0,0,0,0.12)',
            left: positionStyle
          }}
          onDragStart={handleDragStart}
        >
          <span style={{ color: isImportance ? '#672DB7' : 'white' }}>{value}</span>
        </div>
      )}

      {!isOpenToAll && (
        <span className="absolute right-2 text-xs text-gray-500 pointer-events-none z-10">
          {isBinary ? '5' : '5'}
        </span>
      )}
    </div>
  );
};
