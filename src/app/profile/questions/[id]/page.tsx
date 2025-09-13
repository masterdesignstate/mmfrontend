'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

interface Question {
  id: string;
  question_name: string;
  question_number: number;
  group_number?: number;
  group_name: string;
  text: string;
  answers: Array<{ value: string; answer_text: string }>;
  open_to_all_me: boolean;
  open_to_all_looking_for: boolean;
}

interface UserAnswer {
  id: string;
  user: string;
  question: string;
  me_answer: number;
  looking_for_answer: number;
  me_importance: number;
  looking_for_importance: number;
  me_open_to_all: boolean;
  looking_for_open_to_all: boolean;
}

export default function QuestionEditPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const questionNumber = parseInt(params.id as string);
  
  const [userId, setUserId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [existingAnswers, setExistingAnswers] = useState<UserAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

  // State for different question types
  const [sliderAnswers, setSliderAnswers] = useState<Record<string, number>>({});
  const [openToAllStates, setOpenToAllStates] = useState<Record<string, boolean>>({});
  const [importanceValues, setImportanceValues] = useState({ me: 3, lookingFor: 3 });
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get user ID
        const storedUserId = localStorage.getItem('user_id');
        if (!storedUserId) {
          router.push('/auth/login');
          return;
        }
        setUserId(storedUserId);

        // Check if questions were stored in sessionStorage first (optimization from questions list page)
        let questionsList: Question[] = [];
        let answersList: any[] = [];
        
        const storedQuestions = sessionStorage.getItem('questionsData');
        const storedAnswers = sessionStorage.getItem('userAnswersData');
        const timestamp = sessionStorage.getItem('questionsDataTimestamp');
        
        // Use sessionStorage data if it's recent (within 5 minutes)
        const isRecentData = timestamp && (Date.now() - parseInt(timestamp)) < 5 * 60 * 1000;
        
        if (storedQuestions && isRecentData) {
          try {
            const parsedQuestions = JSON.parse(storedQuestions);
            // Filter to ONLY the specific question number we're viewing
            const filteredQuestions = parsedQuestions.filter((q: Question) => q.question_number === questionNumber);
            // Sort by group_number
            questionsList = filteredQuestions.sort((a: Question, b: Question) => 
              (a.group_number || 0) - (b.group_number || 0)
            );
            console.log('📋 Using filtered questions from sessionStorage for question', questionNumber, ':', questionsList);
          } catch (error) {
            console.error('❌ Error parsing questions from sessionStorage:', error);
          }
        }
        
        if (storedAnswers && isRecentData) {
          try {
            answersList = JSON.parse(storedAnswers);
            console.log('📋 Using answers from sessionStorage:', answersList);
          } catch (error) {
            console.error('❌ Error parsing answers from sessionStorage:', error);
          }
        }
        
        // Only fetch from API if we don't have questions from sessionStorage
        if (questionsList.length === 0) {
          console.log('🚀 Fetching questions from API...');
          const questionsResponse = await fetch(
            `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=${questionNumber}`
          );
          const questionsData = await questionsResponse.json();
          questionsList = questionsData.results || [];
          
          // Sort by group_number
          questionsList.sort((a: Question, b: Question) => 
            (a.group_number || 0) - (b.group_number || 0)
          );
          console.log('📋 Fetched questions from API:', questionsList);
        }
        
        setQuestions(questionsList);

        // Use answers from URL params if available, otherwise fetch from API
        let relevantAnswers: any[] = [];
        
        if (answersList.length > 0) {
          // Use answers from URL params
          relevantAnswers = answersList;
          console.log('📋 Using relevant answers from URL params:', relevantAnswers);
        } else {
          // Fetch user's existing answers from API
          console.log('🚀 Fetching answers from API...');
          const answersResponse = await fetch(
            `${getApiUrl(API_ENDPOINTS.ANSWERS)}?user=${storedUserId}`,
            {
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' }
            }
          );
          
          if (answersResponse.ok) {
            const answersData = await answersResponse.json();
            relevantAnswers = (answersData.results || []).filter(
              (answer: any) => answer.question.question_number === questionNumber
            );
            console.log('📋 Fetched relevant answers from API:', relevantAnswers);
          }
        }
        
        setExistingAnswers(relevantAnswers);
        
        // Initialize state based on existing answers
        initializeAnswerState(questionsList, relevantAnswers);
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
    setSelectedOption(question.question_name);
    
    // Navigate to individual question slider page, similar to onboarding
    const questionTypeMap: Record<number, string> = {
      3: 'ethnicity',
      4: 'education', 
      5: 'diet'
    };
    
    const pageType = questionTypeMap[questionNumber];
    if (!pageType) return;
    
    const params = new URLSearchParams();
    params.set('user_id', userId);
    params.set(pageType, question.question_name);
    params.set('question_number', questionNumber.toString());
    params.set('question_data', JSON.stringify(question));
    
    // Navigate back to auth-style individual question page for this option
    router.push(`/auth/question/${pageType}?${params.toString()}`);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const updates = [];

      if ([1, 2, 6, 7, 8, 9, 10].includes(questionNumber)) {
        // Slider-based questions
        for (const question of questions) {
          const key = `q${question.group_number || question.id}`;
          const existingAnswer = existingAnswers.find(a => {
            const questionId = typeof a.question === 'object' ? a.question.id : a.question;
            return questionId === question.id;
          });

          const answerData = {
            user_id: userId,
            question_id: question.id,
            me_answer: openToAllStates[`${key}_me`] ? 6 : sliderAnswers[`${key}_me`] || 3,
            me_open_to_all: openToAllStates[`${key}_me`] || false,
            me_importance: importanceValues.me,
            me_share: true,
            looking_for_answer: openToAllStates[`${key}_looking`] ? 6 : sliderAnswers[`${key}_looking`] || 3,
            looking_for_open_to_all: openToAllStates[`${key}_looking`] || false,
            looking_for_importance: importanceValues.lookingFor,
            looking_for_share: true
          };

          if (existingAnswer) {
            // Update existing answer
            updates.push(
              fetch(`${getApiUrl(API_ENDPOINTS.ANSWERS)}${existingAnswer.id}/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(answerData)
              })
            );
          } else {
            // Create new answer
            updates.push(
              fetch(getApiUrl(API_ENDPOINTS.ANSWERS), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
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
            looking_for_share: true
          };

          if (existingAnswer) {
            updates.push(
              fetch(`${getApiUrl(API_ENDPOINTS.ANSWERS)}${existingAnswer.id}/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(answerData)
              })
            );
          } else {
            updates.push(
              fetch(getApiUrl(API_ENDPOINTS.ANSWERS), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
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

      // Navigate back to questions list
      router.push('/profile/questions');
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
    isOpenToAll = false
  }: { 
    value: number; 
    onChange: (value: number) => void; 
    isOpenToAll?: boolean;
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
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newValue = Math.round(percentage * 4) + 1;
      onChange(Math.max(1, Math.min(5, newValue)));
    };

    return (
      <div className="w-full h-5 relative flex items-center select-none">
        {!isOpenToAll && <span className="absolute left-2 text-xs text-gray-500 pointer-events-none z-10">1</span>}
        
        <div 
          className="w-full h-5 rounded-[20px] relative cursor-pointer transition-all duration-200 border"
          style={{
            backgroundColor: isOpenToAll ? '#672DB7' : '#F5F5F5',
            borderColor: isOpenToAll ? '#672DB7' : '#ADADAD'
          }}
          onClick={handleSliderClick}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-[#672DB7] rounded-[20px]"
            style={{
              width: fillWidth,
              transition: 'width 1.2s ease-in-out'
            }}
          />
        </div>
        
        {!isOpenToAll && (
          <div 
            className="absolute top-1/2 transform -translate-y-1/2 w-7 h-7 border border-gray-300 rounded-full flex items-center justify-center text-sm font-semibold shadow-sm z-30"
            style={{
              backgroundColor: '#672DB7',
              left: value === 1 ? '0px' : value === 5 ? 'calc(100% - 28px)' : `calc(${((value - 1) / 4) * 100}% - 14px)`
            }}
          >
            <span className="text-white">{value}</span>
          </div>
        )}
        
        {!isOpenToAll && <span className="absolute right-2 text-xs text-gray-500 pointer-events-none z-10">5</span>}
      </div>
    );
  };

  const renderQuestionContent = () => {
    if (!questions || questions.length === 0) return null;

    // Relationship, Gender, Exercise, Habits, Kids, Religion, Politics - Slider questions
    if ([1, 2, 6, 7, 8, 9, 10].includes(questionNumber)) {
      const showLookingFor = [2, 6, 7, 8, 9, 10].includes(questionNumber); // Only these have "Them" sections
      const isKidsQuestion = questionNumber === 10;
      
      // For questions 6, 7, 8 and 9, show "Them" first, then "Me" (like onboarding)  
      const showThemFirst = [6, 7, 8, 9].includes(questionNumber);
      
      return (
        <div>
          {/* Them/Looking For Section (shown first for questions 6, 7, 8, 9) */}
          {showLookingFor && showThemFirst && (
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-center mb-1" style={{ color: '#672DB7' }}>Them</h3>
              
              <div className="grid items-center justify-center mx-auto max-w-fit mb-2"
                   style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
                <div></div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>LESS</span>
                  <span>MORE</span>
                </div>
                <div className="text-xs text-gray-500 text-center">
                  {questions[0]?.open_to_all_looking_for ? 'OTA' : ''}
                </div>
              </div>
              
              <div className="grid items-center justify-center mx-auto max-w-fit"
                   style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
                {questions.map((question) => {
                  const key = `q${question.group_number || question.id}`;
                  const lookingKey = `${key}_looking`;
                  
                  return (
                    <React.Fragment key={`looking-${question.id}`}>
                      <div className="text-xs font-semibold text-gray-400">
                        {(question.question_name || 'ANSWER').toUpperCase()}
                      </div>
                      <div className="relative">
                        <SliderComponent
                          value={sliderAnswers[lookingKey] || 3}
                          onChange={(value) => setSliderAnswers(prev => ({ ...prev, [lookingKey]: value }))}
                          isOpenToAll={openToAllStates[lookingKey] || false}
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
                              <div className={`block w-11 h-6 rounded-full ${
                                openToAllStates[lookingKey] ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'
                              }`}></div>
                              <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${
                                openToAllStates[lookingKey] ? 'transform translate-x-5 bg-white' : 'bg-white'
                              }`}></div>
                            </div>
                          </label>
                        ) : (
                          <div className="w-11 h-6"></div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
                
                {/* Importance Slider */}
                <div className="text-xs font-semibold text-gray-400">IMPORTANCE</div>
                <div className="relative">
                  <SliderComponent
                    value={importanceValues.lookingFor}
                    onChange={(value) => setImportanceValues(prev => ({ ...prev, lookingFor: value }))}
                    isOpenToAll={false}
                  />
                </div>
                <div className="w-11 h-6"></div>
              </div>
              
              {/* Importance labels */}
              <div className="grid items-center justify-center mx-auto max-w-fit mt-2" 
                   style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
                <div></div>
                <div className="relative text-xs text-gray-500" style={{ width: '500px' }}>
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
          )}

          {/* Me Section */}
          <div className={`mb-6 ${showLookingFor && showThemFirst ? 'pt-8' : ''}`}>
            <h3 className="text-2xl font-bold text-center mb-1">Me</h3>
            
            <div className="grid items-center justify-center mx-auto max-w-fit mb-2" 
                 style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
              <div></div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>LESS</span>
                <span>MORE</span>
              </div>
              <div className="text-xs text-gray-500 text-center">
                {questions[0]?.open_to_all_me ? 'OTA' : ''}
              </div>
            </div>
            
            <div className="grid items-center justify-center mx-auto max-w-fit"
                 style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
              {questions.map((question) => {
                const groupNum = question.group_number || 1;
                const key = `q${groupNum}`;
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
                    <div className="text-xs font-semibold text-gray-400">{label}</div>
                    <div className="relative">
                      <SliderComponent
                        value={sliderAnswers[meKey] || 3}
                        onChange={(value) => setSliderAnswers(prev => ({ ...prev, [meKey]: value }))}
                        isOpenToAll={openToAllStates[meKey] || false}
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
                            <div className={`block w-11 h-6 rounded-full ${
                              openToAllStates[meKey] ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'
                            }`}></div>
                            <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${
                              openToAllStates[meKey] ? 'transform translate-x-5 bg-white' : 'bg-white'
                            }`}></div>
                          </div>
                        </label>
                      ) : (
                        <div className="w-11 h-6"></div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
              
              {/* Importance Slider */}
              <div className="text-xs font-semibold text-gray-400">IMPORTANCE</div>
              <div className="relative">
                <SliderComponent
                  value={importanceValues.me}
                  onChange={(value) => setImportanceValues(prev => ({ ...prev, me: value }))}
                  isOpenToAll={false}
                />
              </div>
              <div className="w-11 h-6"></div>
            </div>
            
            {/* Importance labels */}
            <div className="grid items-center justify-center mx-auto max-w-fit mt-2" 
                 style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
              <div></div>
              <div className="relative text-xs text-gray-500" style={{ width: '500px' }}>
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

          {/* Them/Looking For Section (shown after Me for questions 2, 10) */}
          {showLookingFor && !showThemFirst && (
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-center mb-1" style={{ color: '#672DB7' }}>Them</h3>
              
              <div className="grid items-center justify-center mx-auto max-w-fit mb-2"
                   style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
                <div></div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>LESS</span>
                  <span>MORE</span>
                </div>
                <div className="text-xs text-gray-500 text-center">
                  {questions[0]?.open_to_all_looking_for ? 'OTA' : ''}
                </div>
              </div>
              
              <div className="grid items-center justify-center mx-auto max-w-fit"
                   style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
                {questions.map((question) => {
                  const key = `q${question.group_number || question.id}`;
                  const lookingKey = `${key}_looking`;
                  
                  return (
                    <React.Fragment key={`looking-${question.id}`}>
                      <div className="text-xs font-semibold text-gray-400">
                        {question.question_name.toUpperCase()}
                      </div>
                      <div className="relative">
                        <SliderComponent
                          value={sliderAnswers[lookingKey] || 3}
                          onChange={(value) => setSliderAnswers(prev => ({ ...prev, [lookingKey]: value }))}
                          isOpenToAll={openToAllStates[lookingKey] || false}
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
                              <div className={`block w-11 h-6 rounded-full ${
                                openToAllStates[lookingKey] ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'
                              }`}></div>
                              <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${
                                openToAllStates[lookingKey] ? 'transform translate-x-5 bg-white' : 'bg-white'
                              }`}></div>
                            </div>
                          </label>
                        ) : (
                          <div className="w-11 h-6"></div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
                
                {/* Importance Slider */}
                <div className="text-xs font-semibold text-gray-400">IMPORTANCE</div>
                <div className="relative">
                  <SliderComponent
                    value={importanceValues.lookingFor}
                    onChange={(value) => setImportanceValues(prev => ({ ...prev, lookingFor: value }))}
                    isOpenToAll={false}
                  />
                </div>
                <div className="w-11 h-6"></div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Single-choice questions (Ethnicity, Education, Diet)
    if ([3, 4, 5].includes(questionNumber)) {
      const optionIcons: Record<number, string> = {
        3: '/assets/ethn.png',
        4: '/assets/cpx.png',
        5: '/assets/leaf.png'  // Using leaf icon for diet
      };

      return (
        <div className="max-w-2xl mx-auto">
          <div className="space-y-3">
            {questions.map((question) => (
              <button
                key={question.id}
                onClick={() => handleSingleOptionClick(question)}
                className={`w-full flex items-center space-x-4 p-4 rounded-lg border transition-colors cursor-pointer ${
                  selectedOption === question.question_name
                    ? 'border-black bg-gray-50'
                    : 'border-black bg-white hover:bg-gray-50'
                }`}
              >
                <Image
                  src={optionIcons[questionNumber]}
                  alt=""
                  width={24}
                  height={24}
                />
                <span className="flex-1 text-left">{question.question_name}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#672DB7]"></div>
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
        <button className="p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-6 py-6">
        <div className="w-full max-w-4xl">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">
              {questionNumber}. {questionTitles[questionNumber]}
            </h1>
            <p className="text-3xl font-bold text-black mb-12">
              {questionTexts[questionNumber]}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-center">
              {error}
            </div>
          )}

          {/* Question Content */}
          {renderQuestionContent()}
        </div>
      </main>

      {/* Footer with Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex justify-between items-center px-6 py-4">
          <button
            onClick={() => router.push('/profile/questions')}
            className="text-gray-900 font-medium hover:text-gray-700 transition-colors"
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