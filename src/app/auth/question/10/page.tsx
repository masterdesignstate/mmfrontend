'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

export default function Question10Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string>('');
  const [questions, setQuestions] = useState<Array<{
    id: string;
    question_name: string;
    question_number: number;
    group_number?: number;
    group_name: string;
    text: string;
    answers: Array<{ value: string; answer_text: string }>;
    open_to_all_me: boolean;
    open_to_all_looking_for: boolean;
  }>>([]);

  // State for two questions sliders
  const [myAnswers, setMyAnswers] = useState({
    answer1: 3,  // WANT: default middle value
    answer2: 1   // HAVE: default to NO (1)
  });

  const [lookingForAnswers, setLookingForAnswers] = useState({
    answer1: 3,  // WANT: default middle value
    answer2: 1   // HAVE: default to NO (1)
  });

  const [openToAll, setOpenToAll] = useState({
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
  
  // For faith question page (question 11) - preloaded in background
  const [faithQuestions, setFaithQuestions] = useState<Array<{
    id: string;
    question_name: string;
    question_number: number;
    group_number?: number;
    group_name: string;
    text: string;
    answers: Array<{ value: string; answer_text: string }>;
    open_to_all_me: boolean;
    open_to_all_looking_for: boolean;
  }>>([]);

  // Helper function to render all available answer labels for the first question (WANT)
  const renderTopLabelsForWant = () => {
    if (!questions || questions.length === 0 || !questions[0]?.answers || questions[0].answers.length === 0) {
      return (
        <div className="flex justify-between text-xs text-gray-500">
          <span>LESS</span>
          <span>MORE</span>
        </div>
      );
    }
    
    const sortedAnswers = questions[0].answers.sort((a, b) => parseInt(a.value) - parseInt(b.value));
    
    return (
      <div className="relative text-xs text-gray-500" style={{ width: '500px', height: '14px' }}>
        {sortedAnswers.map((answer, index) => {
          const value = parseInt(answer.value);
          let leftPosition;
          
          // Position labels to center on slider thumb positions
          if (value === 1) {
            leftPosition = '14px'; // Left edge of thumb (14px from left)
          } else if (value === 2) {
            leftPosition = '25%';
          } else if (value === 3) {
            leftPosition = '50%';
          } else if (value === 4) {
            leftPosition = '75%';
          } else if (value === 5) {
            leftPosition = 'calc(100% - 14px)'; // Right edge of thumb (14px from right)
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

  // Helper function to render all available answer labels for the second question (HAVE)
  const renderTopLabelsForHave = () => {
    if (!questions || questions.length < 2 || !questions[1]?.answers || questions[1].answers.length === 0) {
      return (
        <div className="flex justify-between text-xs text-gray-500">
          <span>NO</span>
          <span>YES</span>
        </div>
      );
    }
    
    const sortedAnswers = questions[1].answers.sort((a, b) => parseInt(a.value) - parseInt(b.value));
    
    return (
      <div className="relative text-xs text-gray-500" style={{ width: '500px', height: '14px' }}>
        {sortedAnswers.map((answer, index) => {
          const value = parseInt(answer.value);
          let leftPosition;
          
          // Binary slider - only positions 1 and 5
          if (value === 1) {
            leftPosition = '14px'; // Left edge
          } else if (value === 5) {
            leftPosition = 'calc(100% - 14px)'; // Right edge
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
    
    console.log('🔍 Question 10 Page Load - URL Params:', {
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
    
    if (questionsParam) {
      try {
        const parsedQuestions = JSON.parse(questionsParam);
        setQuestions(parsedQuestions);
        console.log('📋 Received questions from URL:', parsedQuestions);
        console.log('🔍 Question 10 OTA settings from URL:', parsedQuestions.map((q: typeof questions[0]) => ({
          number: q.question_number,
          group: q.group_name,
          ota_me: q.open_to_all_me,
          ota_looking: q.open_to_all_looking_for
        })));
      } catch (error) {
        console.error('❌ Error parsing questions from URL:', error);
      }
    } else {
      console.log('❌ No questions parameter found in URL');
    }
  }, [searchParams]);

  // Fetch questions from backend when userId is available (only once)
  useEffect(() => {
    const fetchQuestionsIfNeeded = async () => {
      // Only fetch if we have a userId, questions array is empty, and we don't have questions from URL params
      if (userId && questions.length === 0 && !searchParams.get('questions')) {
        console.log('🚀 Starting to fetch question 10 from backend...');
        setLoadingQuestions(true);
        try {
          const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=10`;
          console.log('🌐 Fetching from URL:', apiUrl);
          
          const response = await fetch(apiUrl);
          console.log('📡 Response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('📋 Raw API response:', data);
            
            // Sort questions by group_number in DESCENDING order so WANT (group 2) comes first
            const sortedQuestions = (data.results || []).sort((a: typeof questions[0], b: typeof questions[0]) => {
              const groupA = a.group_number || 0;
              const groupB = b.group_number || 0;
              return groupB - groupA;  // Reversed to show group 2 first, then group 1
            });
            
            setQuestions(sortedQuestions);
            console.log('📋 Set question 10 to state (sorted by group_number):', sortedQuestions);
            console.log('🔍 Backend Question 10 OTA settings:', sortedQuestions.map((q: typeof questions[0]) => ({
              number: q.question_number,
              group_number: q.group_number,
              group: q.group_name,
              ota_me: q.open_to_all_me,
              ota_looking: q.open_to_all_looking_for
            })));
          } else {
            console.error('❌ Failed to fetch question 10 from backend. Status:', response.status);
          }
        } catch (error: unknown) {
          console.error('❌ Error fetching question 10 from backend:', error);
        } finally {
          setLoadingQuestions(false);
        }
      }
    };

    fetchQuestionsIfNeeded();
  }, [userId, questions.length, searchParams]);

  // Fetch faith questions (question 11) in background when userId is available
  useEffect(() => {
    const fetchFaithQuestions = async () => {
      // Fetch faith questions in the background
      if (userId && faithQuestions.length === 0) {
        try {
          const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=11`;
          const response = await fetch(apiUrl);
          
          if (response.ok) {
            const data = await response.json();
            
            // Sort questions by group_number
            const sortedFaithQuestions = (data.results || []).sort((a: typeof faithQuestions[0], b: typeof faithQuestions[0]) => {
              const groupA = a.group_number || 0;
              const groupB = b.group_number || 0;
              return groupA - groupB;
            });
            
            setFaithQuestions(sortedFaithQuestions);
          }
        } catch (error: unknown) {
          // Silently fail - faith page will fetch normally if needed
        }
      }
    };

    fetchFaithQuestions();
  }, [userId]);

  const handleSliderChange = (section: 'myAnswers' | 'lookingForAnswers' | 'importance', questionIndex?: number, value?: number) => {
    if (section === 'myAnswers' && questionIndex !== undefined && value !== undefined) {
      setMyAnswers(prev => ({ ...prev, [`answer${questionIndex + 1}`]: value }));
    } else if (section === 'lookingForAnswers' && questionIndex !== undefined && value !== undefined) {
      setLookingForAnswers(prev => ({ ...prev, [`answer${questionIndex + 1}`]: value }));
    } else if (section === 'importance' && value !== undefined) {
      setImportance(prev => ({ ...prev, me: value }));
    }
  };

  const handleLookingForImportanceChange = (value: number) => {
    setImportance(prev => ({ ...prev, lookingFor: value }));
  };

  const handleOpenToAllToggle = (switchType: string) => {
    setOpenToAll(prev => ({ ...prev, [switchType]: !prev[switchType as keyof typeof prev] }));
  };

  const handleNext = async () => {
    // Ensure we have a userId
    let currentUserId = userId;
    if (!currentUserId) {
      // Try to get from localStorage as final fallback
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
      // Prepare user answers for both questions
      const userAnswers = questions.map((question, index) => ({
        user_id: currentUserId,
        question_id: question.id,
        me_answer: openToAll[`answer${index + 1}MeOpen` as keyof typeof openToAll] ? 6 : myAnswers[`answer${index + 1}` as keyof typeof myAnswers],
        me_open_to_all: openToAll[`answer${index + 1}MeOpen` as keyof typeof openToAll],
        me_importance: importance.me,
        me_share: true,
        looking_for_answer: openToAll[`answer${index + 1}LookingOpen` as keyof typeof openToAll] ? 6 : lookingForAnswers[`answer${index + 1}` as keyof typeof lookingForAnswers],
        looking_for_open_to_all: openToAll[`answer${index + 1}LookingOpen` as keyof typeof openToAll],
        looking_for_importance: importance.lookingFor,
        looking_for_share: true
      }));

      // Save all user answers
      const savePromises = userAnswers.map(userAnswer =>
        fetch(getApiUrl(API_ENDPOINTS.ANSWERS), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userAnswer)
        })
      );

      const responses = await Promise.all(savePromises);
      
      // Check if all responses are ok
      for (const response of responses) {
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to save answer');
        }
      }

      // Ensure user_id is in localStorage before navigating to profile
      if (currentUserId) {
        localStorage.setItem('user_id', currentUserId);
      }
      
      // Navigate to profile page
      router.push(`/profile`);
    } catch (error) {
      console.error('Error saving question 10 answers:', error);
      setError(error instanceof Error ? error.message : 'Failed to save answers');
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

  // Slider component - Modified to support binary YES/NO
  const SliderComponent = ({ 
    value, 
    onChange,
    isOpenToAll = false,
    isBinary = false
  }: { 
    value: number; 
    onChange: (value: number) => void; 
    isOpenToAll?: boolean;
    isBinary?: boolean;
  }) => {
    const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isOpenToAll) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      
      if (isBinary) {
        // For binary sliders, only allow 1 or 5
        const newValue = percentage < 0.5 ? 1 : 5;
        onChange(newValue);
      } else {
        const newValue = Math.round(percentage * 4) + 1; // 1-5 range
        onChange(Math.max(1, Math.min(5, newValue)));
      }
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
      <div className="w-full h-5 relative flex items-center select-none"
        style={{ userSelect: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDragStart={handleDragStart}
      >
          {!isOpenToAll && <span className="absolute left-2 text-xs text-gray-500 pointer-events-none z-10">1</span>}
          
          {/* Custom Slider Track */}
          <div 
            className="w-full h-5 rounded-[20px] relative cursor-pointer transition-all duration-200 border"
            style={{
              width: '100%',
              backgroundColor: isOpenToAll ? '#672DB7' : '#F5F5F5',
              borderColor: isOpenToAll ? '#672DB7' : '#ADADAD'
            }}
            onClick={handleSliderClick}
            onMouseMove={handleSliderDrag}
            onMouseDown={handleSliderDrag}
            onDragStart={handleDragStart}
          />
          
          {/* Slider Thumb - OUTSIDE the track container */}
          {!isOpenToAll && (
            <div 
              className="absolute top-1/2 transform -translate-y-1/2 w-7 h-7 border border-gray-300 rounded-full flex items-center justify-center text-sm font-semibold shadow-sm z-30 cursor-pointer"
              style={{
                backgroundColor: '#672DB7',
                left: isBinary 
                  ? (value === 1 ? '0px' : 'calc(100% - 28px)')  // Binary: only left or right
                  : (value === 1 ? '0px' : value === 5 ? 'calc(100% - 28px)' : `calc(${((value - 1) / 4) * 100}% - 14px)`)
              }}
              onDragStart={handleDragStart}
            >
              <span className="text-white">{value}</span>
            </div>
          )}
          
          {!isOpenToAll && <span className="absolute right-2 text-xs text-gray-500 pointer-events-none z-10">5</span>}
      </div>
    );
  };

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
            <h1 className="text-3xl font-bold text-black mb-2">
              10. Kids
            </h1>
            <p className="text-3xl font-bold text-black mb-12">
              What are your thoughts on kids?
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Looking For Section */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-center mb-1" style={{ color: '#672DB7' }}>Them</h3>
            
            {/* OTA labels below Looking For header */}
            <div className="grid items-center justify-center mx-auto max-w-fit mb-2" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '8px 12px' }}>
              <div></div> {/* Empty placeholder for label column */}
              <div></div> {/* Empty placeholder for slider column */}
              <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
                {questions[0]?.open_to_all_looking_for || questions[1]?.open_to_all_looking_for ? 'OTA' : ''}
              </div>
            </div>
            
            {/* Grid container for perfect alignment */}
            <div className="grid items-center justify-center mx-auto max-w-fit" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '8px 12px' }}>
              
              {/* Less, More labels for first slider (WANT) */}
              <div></div> {/* Empty placeholder for label column */}
              {renderTopLabelsForWant()}
              <div></div> {/* Empty placeholder for switch column */}
              
              
              {/* KIDS QUESTION 1 Slider Row */}
              <div className="text-xs font-semibold text-gray-400">
                {(questions[0]?.question_name || 'KIDS 1').toUpperCase()}
              </div>
              <div className="relative">
                <SliderComponent
                  value={lookingForAnswers.answer1}
                  onChange={(value) => handleSliderChange('lookingForAnswers', 0, value)}
                  isOpenToAll={openToAll.answer1LookingOpen}
                />
              </div>
              <div>
                {/* Only show switch if first kids question has open_to_all_looking_for enabled */}
                {questions[0]?.open_to_all_looking_for ? (
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={openToAll.answer1LookingOpen}
                        onChange={() => handleOpenToAllToggle('answer1LookingOpen')}
                        className="sr-only"
                      />
                      <div className={`block w-11 h-6 rounded-full ${openToAll.answer1LookingOpen ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                      <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll.answer1LookingOpen ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                    </div>
                  </label>
                ) : (
                  <div className="w-11 h-6"></div> // Empty placeholder to maintain grid alignment
                )}
              </div>

              {/* No, Yes labels for second slider (Have) */}
              <div></div> {/* Empty placeholder for label column */}
              {renderTopLabelsForHave()}
              <div></div> {/* Empty placeholder for switch column */}

              {/* KIDS QUESTION 2 Slider Row */}
              <div className="text-xs font-semibold text-gray-400">
                {(questions[1]?.question_name || 'KIDS 2').toUpperCase()}
              </div>
              <div className="relative">
                <SliderComponent
                  value={lookingForAnswers.answer2}
                  onChange={(value) => handleSliderChange('lookingForAnswers', 1, value)}
                  isOpenToAll={openToAll.answer2LookingOpen}
                  isBinary={true}
                />
              </div>
              <div>
                {/* Only show switch if second kids question has open_to_all_looking_for enabled */}
                {questions[1]?.open_to_all_looking_for ? (
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={openToAll.answer2LookingOpen}
                        onChange={() => handleOpenToAllToggle('answer2LookingOpen')}
                        className="sr-only"
                      />
                      <div className={`block w-11 h-6 rounded-full ${openToAll.answer2LookingOpen ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                      <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll.answer2LookingOpen ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                    </div>
                  </label>
                ) : (
                  <div className="w-11 h-6"></div> // Empty placeholder to maintain grid alignment
                )}
              </div>

              {/* IMPORTANCE Slider Row */}
              <div className="text-xs font-semibold text-gray-400">IMPORTANCE</div>
              <div className="relative">
                <SliderComponent
                  value={importance.lookingFor}
                  onChange={handleLookingForImportanceChange}
                  isOpenToAll={false}
                />
              </div>
              <div className="w-11 h-6"></div>
              
            </div>

            {/* Importance labels below Looking For section - centered and dynamic */}
            <div className="grid items-center justify-center mx-auto max-w-fit mt-2" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '8px 12px' }}>
              <div></div> {/* Empty placeholder for label column */}
              <div className="relative text-xs text-gray-500" style={{ width: '500px' }}>
                {/* Only show the label for the current importance value */}
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
              <div></div> {/* Empty placeholder for switch column */}
            </div>
          </div>

          {/* Me Section */}
          <div className="mb-6 pt-8">
            <h3 className="text-2xl font-bold text-center mb-1">Me</h3>
            
            {/* OTA labels below Me header */}
            <div className="grid items-center justify-center mx-auto max-w-fit mb-2" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '8px 12px' }}>
              <div></div> {/* Empty placeholder for label column */}
              <div></div> {/* Empty placeholder for slider column */}
              <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
                {questions[0]?.open_to_all_me || questions[1]?.open_to_all_me ? 'OTA' : ''}
              </div>
            </div>
            
            {/* Grid container for perfect alignment */}
            <div className="grid items-center justify-center mx-auto max-w-fit" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '8px 12px' }}>
              
              {/* Less, More labels for first slider (WANT) */}
              <div></div> {/* Empty placeholder for label column */}
              {renderTopLabelsForWant()}
              <div></div> {/* Empty placeholder for switch column */}
              
              
              {/* KIDS QUESTION 1 Slider Row */}
              <div className="text-xs font-semibold text-gray-400">
                {(questions[0]?.question_name || 'KIDS 1').toUpperCase()}
              </div>
              <div className="relative">
                <SliderComponent
                  value={myAnswers.answer1}
                  onChange={(value) => handleSliderChange('myAnswers', 0, value)}
                  isOpenToAll={openToAll.answer1MeOpen}
                />
              </div>
              <div>
                {/* Only show switch if first kids question has open_to_all_me enabled */}
                {questions[0]?.open_to_all_me ? (
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={openToAll.answer1MeOpen}
                        onChange={() => handleOpenToAllToggle('answer1MeOpen')}
                        className="sr-only"
                      />
                      <div className={`block w-11 h-6 rounded-full ${openToAll.answer1MeOpen ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                      <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll.answer1MeOpen ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                    </div>
                  </label>
                ) : (
                  <div className="w-11 h-6"></div> // Empty placeholder to maintain grid alignment
                )}
              </div>

              {/* No, Yes labels for second slider (Have) */}
              <div></div> {/* Empty placeholder for label column */}
              {renderTopLabelsForHave()}
              <div></div> {/* Empty placeholder for switch column */}
              

              {/* KIDS QUESTION 2 Slider Row */}
              <div className="text-xs font-semibold text-gray-400">
                {(questions[1]?.question_name || 'KIDS 2').toUpperCase()}
              </div>
              <div className="relative">
                <SliderComponent
                  value={myAnswers.answer2}
                  onChange={(value) => handleSliderChange('myAnswers', 1, value)}
                  isOpenToAll={openToAll.answer2MeOpen}
                  isBinary={true}
                />
              </div>
              <div>
                {/* Only show switch if second kids question has open_to_all_me enabled */}
                {questions[1]?.open_to_all_me ? (
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={openToAll.answer2MeOpen}
                        onChange={() => handleOpenToAllToggle('answer2MeOpen')}
                        className="sr-only"
                      />
                      <div className={`block w-11 h-6 rounded-full ${openToAll.answer2MeOpen ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                      <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll.answer2MeOpen ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                    </div>
                  </label>
                ) : (
                  <div className="w-11 h-6"></div> // Empty placeholder to maintain grid alignment
                )}
              </div>
              
            </div>
          </div>
        </div>
      </main>

      {/* Footer with Progress and Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        {/* Progress Bar */}
        <div className="w-full h-1 bg-gray-200">
          <div className="h-full bg-black" style={{ width: '100%' }}></div>
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex justify-between items-center px-6 py-4">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="text-gray-900 font-medium hover:text-gray-700 transition-colors cursor-pointer"
          >
            Back
          </button>
          
          {/* Next Button */}
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
