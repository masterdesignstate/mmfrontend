'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

interface Question {
  id: string;
  question_name: string;
  question_number: number;
  group_number?: number;
  group_name?: string;
  group_name_text?: string;
  question_type?: 'basic' | 'grouped' | 'double' | 'triple' | 'four';
  text: string;
  answers: Array<{ value: string; answer_text: string }>;
  open_to_all_me: boolean;
  open_to_all_looking_for: boolean;
}

interface UserAnswer {
  id: string;
  question: Question;
  me_answer: number;
  looking_for_answer: number;
  me_importance?: number;
  looking_for_importance?: number;
  me_open_to_all?: boolean;
  looking_for_open_to_all?: boolean;
}

const IMPORTANCE_LABELS = [
  { value: "1", answer_text: "TRIVIAL" },
  { value: "2", answer_text: "MINOR" },
  { value: "3", answer_text: "AVERAGE" },
  { value: "4", answer_text: "SIGNIFICANT" },
  { value: "5", answer_text: "ESSENTIAL" }
];

export default function ReadOnlyQuestionViewPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const questionNumber = parseInt(params.questionNumber as string);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch questions for this question number
        const questionsResponse = await fetch(
          `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=${questionNumber}&page_size=100`
        );
        const questionsData = await questionsResponse.json();
        const questionsList = questionsData.results || [];
        
        // Sort by group_number
        questionsList.sort((a: Question, b: Question) => 
          (a.group_number || 0) - (b.group_number || 0)
        );

        // Fetch user answers for this question number
        const answersResponse = await fetch(
          `${getApiUrl(API_ENDPOINTS.ANSWERS)}?user=${userId}&page_size=100`
        );
        const answersData = await answersResponse.json();
        const answersList = answersData.results || [];
        
        // Filter to only answers for this question number
        const filteredAnswers = answersList.filter((answer: UserAnswer) => 
          answer.question.question_number === questionNumber
        );

        setQuestions(questionsList);
        setUserAnswers(filteredAnswers);
      } catch (err) {
        console.error('Error fetching question data:', err);
        setError('Failed to load question data');
      } finally {
        setLoading(false);
      }
    };

    if (userId && questionNumber) {
      fetchData();
    }
  }, [userId, questionNumber]);

  // Read-only Slider Component
  const ReadOnlySliderComponent = ({
    value,
    isOpenToAll = false,
    isImportance = false,
    labels = []
  }: {
    value: number;
    isOpenToAll?: boolean;
    isImportance?: boolean;
    labels?: Array<{ value: string; answer_text: string }>;
  }) => {
    const sortedLabels = labels.sort((a, b) => parseInt(a.value) - parseInt(b.value));
    const minValue = sortedLabels.length > 0 ? parseInt(sortedLabels[0].value) : 1;
    const maxValue = sortedLabels.length > 0 ? parseInt(sortedLabels[sortedLabels.length - 1].value) : 5;

    const percentage = ((value - minValue) / (maxValue - minValue)) * 100;

    return (
      <div className="w-full h-5 relative flex items-center select-none">
        <span className={`absolute left-2 text-xs pointer-events-none z-10 ${isOpenToAll ? 'text-white font-medium' : 'text-gray-500'}`}>{minValue}</span>

        <div
          className="w-full h-5 rounded-[20px] relative border"
          style={{
            backgroundColor: isOpenToAll ? '#672DB7' : '#F5F5F5',
            borderColor: isOpenToAll ? '#672DB7' : '#ADADAD'
          }}
        />

        {!isOpenToAll && (
          <div
            className="absolute top-1/2 transform -translate-y-1/2 w-7 h-7 border border-gray-300 rounded-full flex items-center justify-center text-sm font-semibold z-30"
            style={{
              backgroundColor: isImportance ? 'white' : '#672DB7',
              boxShadow: isImportance ? '0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.12)',
              left: value === minValue ? '0px' : value === maxValue ? 'calc(100% - 28px)' : `calc(${percentage}% - 14px)`
            }}
          >
            <span style={{ color: isImportance ? '#672DB7' : 'white' }}>{value}</span>
          </div>
        )}

        <span className={`absolute right-2 text-xs pointer-events-none z-10 ${isOpenToAll ? 'text-white font-medium' : 'text-gray-500'}`}>{maxValue}</span>
      </div>
    );
  };

  const renderQuestionContent = () => {
    if (!questions || questions.length === 0) return null;

    const questionType = questions[0]?.question_type || 'basic';

    // Special handling for Relationship question (question_number === 1) - ONLY Me section
    if (questionNumber === 1) {
      return (
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-center mb-1">Me</h3>

          <div className="grid items-center justify-center mx-auto max-w-fit mb-2" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
            <div></div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>LESS</span>
              <span>MORE</span>
            </div>
            <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
              {questions.some(q => q.open_to_all_me) ? 'OTA' : ''}
            </div>
          </div>

          <div className="grid items-center justify-center mx-auto max-w-fit" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
            {questions.map((question) => {
              const answer = userAnswers.find(a => {
                const questionId = typeof a.question === 'object' ? a.question.id : a.question;
                return questionId === question.id;
              });
              const meValue = answer?.me_answer || 3;
              const meOpenToAll = answer?.me_open_to_all || false;

              return (
                <React.Fragment key={question.id}>
                  <div className="text-xs font-semibold text-gray-400">{question.question_name.toUpperCase()}</div>
                  <div className="relative">
                    <ReadOnlySliderComponent
                      value={meValue}
                      isOpenToAll={meOpenToAll}
                      labels={question.answers}
                    />
                  </div>
                  <div>
                    {question.open_to_all_me ? (
                      <div className="flex items-center">
                        <div className={`block w-11 h-6 rounded-full ${meOpenToAll ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}>
                          <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${meOpenToAll ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-11 h-6"></div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}

            {/* IMPORTANCE Slider Row */}
            <div className="text-xs font-semibold text-gray-400">IMPORTANCE</div>
            <div className="relative">
              <ReadOnlySliderComponent
                value={userAnswers[0]?.me_importance || 3}
                isOpenToAll={false}
                isImportance={true}
                labels={IMPORTANCE_LABELS}
              />
            </div>
            <div className="w-11 h-6"></div>
          </div>

          {/* Importance labels */}
          <div className="grid items-center justify-center mx-auto max-w-fit mt-2" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
            <div></div>
            <div className="relative text-xs text-gray-500" style={{ width: '500px' }}>
              {(() => {
                const importance = userAnswers[0]?.me_importance || 3;
                const positions: Record<number, { left: string; label: string }> = {
                  1: { left: '14px', label: 'TRIVIAL' },
                  2: { left: '25%', label: 'MINOR' },
                  3: { left: '50%', label: 'AVERAGE' },
                  4: { left: '75%', label: 'SIGNIFICANT' },
                  5: { left: 'calc(100% - 14px)', label: 'ESSENTIAL' }
                };
                const pos = positions[importance];
                return pos ? <span className="absolute" style={{ left: pos.left, transform: 'translateX(-50%)' }}>{pos.label}</span> : null;
              })()}
            </div>
            <div></div>
          </div>
        </div>
      );
    }

    // Gender question (question_number === 2) - "Them" first with importance, then "Me" without importance
    if (questionNumber === 2) {
      return (
        <div>
          {/* Them Section */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-center mb-1" style={{ color: '#672DB7' }}>Them</h3>

            <div className="grid items-center justify-center mx-auto max-w-fit mb-2" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
              <div></div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>LESS</span>
                <span>MORE</span>
              </div>
              <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
                {questions.some(q => q.open_to_all_looking_for) ? 'OTA' : ''}
              </div>
            </div>

            <div className="grid items-center justify-center mx-auto max-w-fit" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
              {questions.map((question) => {
                const answer = userAnswers.find(a => {
                  const questionId = typeof a.question === 'object' ? a.question.id : a.question;
                  return questionId === question.id;
                });
                const lookingValue = answer?.looking_for_answer || 3;
                const lookingOpenToAll = answer?.looking_for_open_to_all || false;

                return (
                  <React.Fragment key={`looking-${question.id}`}>
                    <div className="text-xs font-semibold text-gray-400">{question.question_name.toUpperCase()}</div>
                    <div className="relative">
                      <ReadOnlySliderComponent
                        value={lookingValue}
                        isOpenToAll={lookingOpenToAll}
                        labels={question.answers}
                      />
                    </div>
                    <div>
                      {question.open_to_all_looking_for ? (
                        <div className="flex items-center">
                          <div className={`block w-11 h-6 rounded-full ${lookingOpenToAll ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}>
                            <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${lookingOpenToAll ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-11 h-6"></div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}

              {/* IMPORTANCE Slider Row */}
              <div className="text-xs font-semibold text-gray-400">IMPORTANCE</div>
              <div className="relative">
                <ReadOnlySliderComponent
                  value={userAnswers[0]?.looking_for_importance || 3}
                  isOpenToAll={false}
                  isImportance={true}
                  labels={IMPORTANCE_LABELS}
                />
              </div>
              <div className="w-11 h-6"></div>
            </div>

            {/* Importance labels */}
            <div className="grid items-center justify-center mx-auto max-w-fit mt-2" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
              <div></div>
              <div className="relative text-xs text-gray-500" style={{ width: '500px' }}>
                {(() => {
                  const importance = userAnswers[0]?.looking_for_importance || 3;
                  const positions: Record<number, { left: string; label: string }> = {
                    1: { left: '14px', label: 'TRIVIAL' },
                    2: { left: '25%', label: 'MINOR' },
                    3: { left: '50%', label: 'AVERAGE' },
                    4: { left: '75%', label: 'SIGNIFICANT' },
                    5: { left: 'calc(100% - 14px)', label: 'ESSENTIAL' }
                  };
                  const pos = positions[importance];
                  return pos ? <span className="absolute" style={{ left: pos.left, transform: 'translateX(-50%)' }}>{pos.label}</span> : null;
                })()}
              </div>
              <div></div>
            </div>
          </div>

          {/* Me Section */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-center mb-1">Me</h3>

            <div className="grid items-center justify-center mx-auto max-w-fit mb-2" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
              <div></div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>LESS</span>
                <span>MORE</span>
              </div>
              <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
                {questions.some(q => q.open_to_all_me) ? 'OTA' : ''}
              </div>
            </div>

            <div className="grid items-center justify-center mx-auto max-w-fit" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
              {questions.map((question) => {
                const answer = userAnswers.find(a => {
                  const questionId = typeof a.question === 'object' ? a.question.id : a.question;
                  return questionId === question.id;
                });
                const meValue = answer?.me_answer || 3;
                const meOpenToAll = answer?.me_open_to_all || false;

                return (
                  <React.Fragment key={`me-${question.id}`}>
                    <div className="text-xs font-semibold text-gray-400">{question.question_name.toUpperCase()}</div>
                    <div className="relative">
                      <ReadOnlySliderComponent
                        value={meValue}
                        isOpenToAll={meOpenToAll}
                        labels={question.answers}
                      />
                    </div>
                    <div>
                      {question.open_to_all_me ? (
                        <div className="flex items-center">
                          <div className={`block w-11 h-6 rounded-full ${meOpenToAll ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}>
                            <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${meOpenToAll ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                          </div>
                        </div>
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
      );
    }

    // Grouped questions - show cards
    if (questionType === 'grouped') {
      const optionIcons: Record<number, string> = {
        3: '/assets/ethn.png',
        4: '/assets/cpx.png',
        5: '/assets/lf2.png',
        7: '/assets/hands.png',
        8: '/assets/prayin.png',
        9: '/assets/politics.png',
        10: '/assets/pacifier.png',
        11: '/assets/prayin.png',
        12: '/assets/ethn.png'
      };

      return (
        <div className="max-w-2xl mx-auto">
          <div className="space-y-3">
            {questions.map((question) => {
              const answer = userAnswers.find(a => {
                const questionId = typeof a.question === 'object' ? a.question.id : a.question;
                return questionId === question.id;
              });
              const isSelected = !!answer;

              return (
                <div
                  key={question.id}
                  className={`w-full flex items-center space-x-4 p-4 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <Image
                    src={optionIcons[questionNumber] || '/assets/ethn.png'}
                    alt=""
                    width={24}
                    height={24}
                  />
                  <span className="flex-1 text-left">{question.question_name}</span>
                  {isSelected && (
                    <span className="text-xs text-[#672DB7] font-medium">Answered</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Basic multi-slider questions like Exercise/Habits/Religion (question_number === 6, 7, 8, 9, 10, etc.)
    if ([6, 7, 8, 9, 10].includes(questionNumber)) {
      const isKidsQuestion = questionNumber === 10;

      // Show "Them" first, then "Me" (like onboarding)
      return (
        <div>
          {/* Them Section */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-center mb-1" style={{ color: '#672DB7' }}>Them</h3>

            <div className="grid items-center justify-center mx-auto max-w-fit mb-2" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
              <div></div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>LESS</span>
                <span>MORE</span>
              </div>
              <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
                {questions.some(q => q.open_to_all_looking_for) ? 'OTA' : ''}
              </div>
            </div>

            <div className="grid items-center justify-center mx-auto max-w-fit" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
              {questions.map((question) => {
                const answer = userAnswers.find(a => {
                  const questionId = typeof a.question === 'object' ? a.question.id : a.question;
                  return questionId === question.id;
                });
                const lookingValue = answer?.looking_for_answer || 3;
                const lookingOpenToAll = answer?.looking_for_open_to_all || false;

                // For Kids question, use WANT/HAVE labels
                let label = (question.question_name || 'ANSWER').toUpperCase();
                if (isKidsQuestion && question.group_number === 1) {
                  label = 'WANT';
                } else if (isKidsQuestion && question.group_number === 2) {
                  label = 'HAVE';
                }

                return (
                  <React.Fragment key={`looking-${question.id}`}>
                    <div className="text-xs font-semibold text-gray-400">{label}</div>
                    <div className="relative">
                      <ReadOnlySliderComponent
                        value={lookingValue}
                        isOpenToAll={lookingOpenToAll}
                        labels={question.answers}
                      />
                    </div>
                    <div>
                      {question.open_to_all_looking_for ? (
                        <div className="flex items-center">
                          <div className={`block w-11 h-6 rounded-full ${lookingOpenToAll ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}>
                            <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${lookingOpenToAll ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-11 h-6"></div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}

              {/* IMPORTANCE Slider Row */}
              <div className="text-xs font-semibold text-gray-400">IMPORTANCE</div>
              <div className="relative">
                <ReadOnlySliderComponent
                  value={userAnswers[0]?.looking_for_importance || 3}
                  isOpenToAll={false}
                  isImportance={true}
                  labels={IMPORTANCE_LABELS}
                />
              </div>
              <div className="w-11 h-6"></div>
            </div>

            {/* Importance labels below Them section */}
            <div className="grid items-center justify-center mx-auto max-w-fit mt-2" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
              <div></div>
              <div className="relative text-xs text-gray-500" style={{ width: '500px' }}>
                {(() => {
                  const importance = userAnswers[0]?.looking_for_importance || 3;
                  const positions: Record<number, { left: string; label: string }> = {
                    1: { left: '14px', label: 'TRIVIAL' },
                    2: { left: '25%', label: 'MINOR' },
                    3: { left: '50%', label: 'AVERAGE' },
                    4: { left: '75%', label: 'SIGNIFICANT' },
                    5: { left: 'calc(100% - 14px)', label: 'ESSENTIAL' }
                  };
                  const pos = positions[importance];
                  return pos ? <span className="absolute" style={{ left: pos.left, transform: 'translateX(-50%)' }}>{pos.label}</span> : null;
                })()}
              </div>
              <div></div>
            </div>
          </div>

          {/* Me Section - NO importance slider */}
          <div className="mb-6 pt-8">
            <h3 className="text-2xl font-bold text-center mb-1">Me</h3>

            <div className="grid items-center justify-center mx-auto max-w-fit mb-2" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
              <div></div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>LESS</span>
                <span>MORE</span>
              </div>
              <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
                {questions.some(q => q.open_to_all_me) ? 'OTA' : ''}
              </div>
            </div>

            <div className="grid items-center justify-center mx-auto max-w-fit" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
              {questions.map((question) => {
                const answer = userAnswers.find(a => {
                  const questionId = typeof a.question === 'object' ? a.question.id : a.question;
                  return questionId === question.id;
                });
                const meValue = answer?.me_answer || 3;
                const meOpenToAll = answer?.me_open_to_all || false;

                // For Kids question, use WANT/HAVE labels
                let label = (question.question_name || 'ANSWER').toUpperCase();
                if (isKidsQuestion && question.group_number === 1) {
                  label = 'WANT';
                } else if (isKidsQuestion && question.group_number === 2) {
                  label = 'HAVE';
                }

                return (
                  <React.Fragment key={`me-${question.id}`}>
                    <div className="text-xs font-semibold text-gray-400">{label}</div>
                    <div className="relative">
                      <ReadOnlySliderComponent
                        value={meValue}
                        isOpenToAll={meOpenToAll}
                        labels={question.answers}
                      />
                    </div>
                    <div>
                      {question.open_to_all_me ? (
                        <div className="flex items-center">
                          <div className={`block w-11 h-6 rounded-full ${meOpenToAll ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}>
                            <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${meOpenToAll ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                          </div>
                        </div>
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
      );
    }

    // Grouped questions - show cards
    if (questionType === 'grouped') {
      const optionIcons: Record<number, string> = {
        3: '/assets/ethn.png',
        4: '/assets/cpx.png',
        5: '/assets/lf2.png',
        7: '/assets/hands.png',
        8: '/assets/prayin.png',
        9: '/assets/politics.png',
        10: '/assets/pacifier.png',
        11: '/assets/prayin.png',
        12: '/assets/ethn.png'
      };

      return (
        <div className="max-w-2xl mx-auto">
          <div className="space-y-3">
            {questions.map((question) => {
              const answer = userAnswers.find(a => {
                const questionId = typeof a.question === 'object' ? a.question.id : a.question;
                return questionId === question.id;
              });
              const isSelected = !!answer;

              return (
                <div
                  key={question.id}
                  className={`w-full flex items-center space-x-4 p-4 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <Image
                    src={optionIcons[questionNumber] || '/assets/ethn.png'}
                    alt=""
                    width={24}
                    height={24}
                  />
                  <span className="flex-1 text-left">{question.question_name}</span>
                  {isSelected && (
                    <span className="text-xs text-[#672DB7] font-medium">Answered</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Double, Triple, Four, Basic questions - show sliders
    return (
      <div>
        {/* Me Section */}
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-center mb-1">Me</h3>

          <div className="grid items-center justify-center mx-auto max-w-fit mb-2" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
            <div></div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>LESS</span>
              <span>MORE</span>
            </div>
            <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
              {questions.some(q => q.open_to_all_me) ? 'OTA' : ''}
            </div>
          </div>

          <div className="grid items-center justify-center mx-auto max-w-fit" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
            {questions.map((question) => {
              const answer = userAnswers.find(a => {
                const questionId = typeof a.question === 'object' ? a.question.id : a.question;
                return questionId === question.id;
              });
              const meValue = answer?.me_answer || 3;
              const meOpenToAll = answer?.me_open_to_all || false;

              return (
                <React.Fragment key={`me-${question.id}`}>
                  <div className="text-xs font-semibold text-gray-400">{question.question_name.toUpperCase()}</div>
                  <div className="relative">
                    <ReadOnlySliderComponent
                      value={meValue}
                      isOpenToAll={meOpenToAll}
                      labels={question.answers}
                    />
                  </div>
                  <div>
                    {question.open_to_all_me ? (
                      <div className="flex items-center">
                        <div className={`block w-11 h-6 rounded-full ${meOpenToAll ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}>
                          <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${meOpenToAll ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-11 h-6"></div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Them Section */}
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-center mb-1" style={{ color: '#672DB7' }}>Them</h3>

          <div className="grid items-center justify-center mx-auto max-w-fit mb-2" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
            <div></div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>LESS</span>
              <span>MORE</span>
            </div>
            <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
              {questions.some(q => q.open_to_all_looking_for) ? 'OTA' : ''}
            </div>
          </div>

          <div className="grid items-center justify-center mx-auto max-w-fit" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
            {questions.map((question) => {
              const answer = userAnswers.find(a => {
                const questionId = typeof a.question === 'object' ? a.question.id : a.question;
                return questionId === question.id;
              });
              const lookingValue = answer?.looking_for_answer || 3;
              const lookingOpenToAll = answer?.looking_for_open_to_all || false;

              return (
                <React.Fragment key={`looking-${question.id}`}>
                  <div className="text-xs font-semibold text-gray-400">{question.question_name.toUpperCase()}</div>
                  <div className="relative">
                    <ReadOnlySliderComponent
                      value={lookingValue}
                      isOpenToAll={lookingOpenToAll}
                      labels={question.answers}
                    />
                  </div>
                  <div>
                    {question.open_to_all_looking_for ? (
                      <div className="flex items-center">
                        <div className={`block w-11 h-6 rounded-full ${lookingOpenToAll ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}>
                          <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${lookingOpenToAll ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                        </div>
                      </div>
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
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#672DB7]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-[#672DB7] text-white rounded-md hover:bg-purple-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const questionTitles: Record<number, string> = {
    1: 'Relationship',
    2: 'Gender',
    3: 'Ethnicity',
    4: 'Education',
    5: 'Diet',
    6: 'Exercise',
    7: 'Habits',
    8: 'Religion',
    9: 'Politics',
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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button onClick={() => router.back()} className="p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <Image
          src="/assets/mmlogox.png"
          alt="Logo"
          width={32}
          height={32}
        />
        <div className="w-10"></div>
      </div>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-6 py-6">
        <div className="w-full max-w-4xl">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">
              {questionNumber}. {questions && questions.length > 0 && questions[0].group_name ? questions[0].group_name : questionTitles[questionNumber]}
            </h1>
            <p className="text-3xl font-bold text-black mb-12">
              {questions && questions.length > 0 && questions[0].group_name_text ? questions[0].group_name_text : questionTexts[questionNumber]}
            </p>
          </div>

          {/* Question Content */}
          {renderQuestionContent()}
        </div>
      </main>
    </div>
  );
}

