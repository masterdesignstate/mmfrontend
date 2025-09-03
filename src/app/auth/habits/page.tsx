'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

export default function HabitsPage() {
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

  // State for 3 habits sliders
  const [myHabits, setMyHabits] = useState({
    habit1: 3,
    habit2: 3,
    habit3: 3
  });

  const [lookingFor, setLookingFor] = useState({
    habit1: 3,
    habit2: 3,
    habit3: 3
  });

  const [openToAll, setOpenToAll] = useState({
    habit1MeOpen: false,
    habit2MeOpen: false,
    habit3MeOpen: false,
    habit1LookingOpen: false,
    habit2LookingOpen: false,
    habit3LookingOpen: false
  });

  const [importance, setImportance] = useState({
    me: 1,
    lookingFor: 3
  });

  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState<string>('');
  
  // For next question page (question 8) - preloaded in background
  const [nextQuestions, setNextQuestions] = useState<Array<{
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
    
    if (questionsParam) {
      try {
        const parsedQuestions = JSON.parse(questionsParam);
        setQuestions(parsedQuestions);
        console.log('📋 Received questions from URL:', parsedQuestions);
        console.log('🔍 Habits Question OTA settings from URL:', parsedQuestions.map((q: typeof questions[0]) => ({
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

  // Fetch habits questions from backend when userId is available (only once)
  useEffect(() => {
    const fetchQuestionsIfNeeded = async () => {
      // Only fetch if we have a userId, questions array is empty, and we don't have questions from URL params
      if (userId && questions.length === 0 && !searchParams.get('questions')) {
        console.log('🚀 Starting to fetch habits questions from backend...');
        setLoadingQuestions(true);
        try {
          const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=7`;
          console.log('🌐 Fetching from URL:', apiUrl);
          
          const response = await fetch(apiUrl);
          console.log('📡 Response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('📋 Raw API response:', data);
            
            // Sort questions by group_number
            const sortedQuestions = (data.results || []).sort((a: typeof questions[0], b: typeof questions[0]) => {
              const groupA = a.group_number || 0;
              const groupB = b.group_number || 0;
              return groupA - groupB;
            });
            
            setQuestions(sortedQuestions);
            console.log('📋 Set habits questions to state (sorted by group_number):', sortedQuestions);
            console.log('🔍 Backend Habits Question OTA settings:', sortedQuestions.map((q: typeof questions[0]) => ({
              number: q.question_number,
              group_number: q.group_number,
              group: q.group_name,
              ota_me: q.open_to_all_me,
              ota_looking: q.open_to_all_looking_for
            })));
          } else {
            console.error('❌ Failed to fetch habits questions from backend. Status:', response.status);
          }
        } catch (error: unknown) {
          console.error('❌ Error fetching habits questions from backend:', error);
        } finally {
          setLoadingQuestions(false);
        }
      }
    };

    fetchQuestionsIfNeeded();
  }, [userId, questions.length, searchParams]);

  // Fetch next questions (question 8) in background when userId is available
  useEffect(() => {
    const fetchNextQuestions = async () => {
      // Fetch next questions in the background
      if (userId && nextQuestions.length === 0) {
        try {
          const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=8`;
          const response = await fetch(apiUrl);
          
          if (response.ok) {
            const data = await response.json();
            
            // Sort questions by group_number
            const sortedNextQuestions = (data.results || []).sort((a: typeof nextQuestions[0], b: typeof nextQuestions[0]) => {
              const groupA = a.group_number || 0;
              const groupB = b.group_number || 0;
              return groupA - groupB;
            });
            
            setNextQuestions(sortedNextQuestions);
          }
        } catch (error: unknown) {
          // Silently fail - next question page will fetch normally if needed
        }
      }
    };

    fetchNextQuestions();
  }, [userId]);

  const handleSliderChange = (section: 'myHabits' | 'lookingFor' | 'importance', habitKey?: string, value?: number) => {
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

  const handleOpenToAllToggle = (switchType: string) => {
    setOpenToAll(prev => ({ ...prev, [switchType]: !prev[switchType as keyof typeof prev] }));
  };

  const handleNext = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Prepare user answers for all 3 habits questions
      const userAnswers = [];
      
      // Habit 1
      userAnswers.push({
        user_id: userId,
        question_id: questions[0]?.id,
        me_answer: openToAll.habit1MeOpen ? 6 : myHabits.habit1,
        me_open_to_all: openToAll.habit1MeOpen,
        me_importance: importance.me,
        me_share: true,
        looking_for_answer: openToAll.habit1LookingOpen ? 6 : lookingFor.habit1,
        looking_for_open_to_all: openToAll.habit1LookingOpen,
        looking_for_importance: importance.lookingFor,
        looking_for_share: true
      });

      // Habit 2
      userAnswers.push({
        user_id: userId,
        question_id: questions[1]?.id,
        me_answer: openToAll.habit2MeOpen ? 6 : myHabits.habit2,
        me_open_to_all: openToAll.habit2MeOpen,
        me_importance: importance.me,
        me_share: true,
        looking_for_answer: openToAll.habit2LookingOpen ? 6 : lookingFor.habit2,
        looking_for_open_to_all: openToAll.habit2LookingOpen,
        looking_for_importance: importance.lookingFor,
        looking_for_share: true
      });

      // Habit 3
      userAnswers.push({
        user_id: userId,
        question_id: questions[2]?.id,
        me_answer: openToAll.habit3MeOpen ? 6 : myHabits.habit3,
        me_open_to_all: openToAll.habit3MeOpen,
        me_importance: importance.me,
        me_share: true,
        looking_for_answer: openToAll.habit3LookingOpen ? 6 : lookingFor.habit3,
        looking_for_open_to_all: openToAll.habit3LookingOpen,
        looking_for_importance: importance.lookingFor,
        looking_for_share: true
      });

      // Save each user answer
      for (const userAnswer of userAnswers) {
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
      }

      // Navigate to next onboarding step (next question page)
      const params = new URLSearchParams({ 
        user_id: userId
      });
      
      // If we have next questions loaded, pass them to avoid re-fetching
      if (nextQuestions.length > 0) {
        params.set('questions', JSON.stringify(nextQuestions));
        console.log('📋 Passing pre-loaded next questions to next question page');
      }
      
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
    router.push(`/auth/question/next-question?${params.toString()}`);
  };

  // Slider component - EXACT COPY from gender page
  const SliderComponent = ({ 
    value, 
    onChange,
    isOpenToAll = false
  }: { 
    value: number; 
    onChange: (value: number) => void; 
    isOpenToAll?: boolean;
  }) => {
    const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isOpenToAll) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newValue = Math.round(percentage * 4) + 1; // 1-5 range
      onChange(Math.max(1, Math.min(5, newValue)));
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
                left: value === 1 ? '0px' : value === 5 ? 'calc(100% - 28px)' : `calc(${((value - 1) / 4) * 100}% - 14px)`
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
            <h1 className="text-3xl font-bold text-black mb-2">7. Habits</h1>
            <p className="text-3xl font-bold text-black mb-12">
              How often do you engage in these habits?
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
            
            {/* NEVER, VERY OFTEN, and OTA labels below Looking For header */}
            <div className="grid items-center justify-center mx-auto max-w-fit mb-2" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
              <div></div> {/* Empty placeholder for label column */}
              <div className="flex justify-between text-xs text-gray-500">
                <span>NEVER</span>
                <span>VERY OFTEN</span>
              </div>
              <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
                {questions[0]?.open_to_all_looking_for ? 'OTA' : ''}
              </div>
            </div>
            
            {/* Grid container for perfect alignment */}
            <div className="grid items-center justify-center mx-auto max-w-fit" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
              
              {/* HABIT 1 Slider Row */}
              <div className="text-xs font-semibold text-gray-400">
                {(questions[0]?.question_name || 'HABIT 1').toUpperCase()}
              </div>
              <div className="relative">
                <SliderComponent
                  value={lookingFor.habit1}
                  onChange={(value) => handleSliderChange('lookingFor', 'habit1', value)}
                  isOpenToAll={openToAll.habit1LookingOpen}
                />
              </div>
              <div>
                {/* Only show switch if Habit 1 question has open_to_all_looking_for enabled */}
                {questions[0]?.open_to_all_looking_for ? (
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={openToAll.habit1LookingOpen}
                        onChange={() => handleOpenToAllToggle('habit1LookingOpen')}
                        className="sr-only"
                      />
                      <div className={`block w-11 h-6 rounded-full ${openToAll.habit1LookingOpen ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                      <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll.habit1LookingOpen ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                    </div>
                  </label>
                ) : (
                  <div className="w-11 h-6"></div> // Empty placeholder to maintain grid alignment
                )}
              </div>
              
              {/* HABIT 2 Slider Row */}
              <div className="text-xs font-semibold text-gray-400">
                {(questions[1]?.question_name || 'HABIT 2').toUpperCase()}
              </div>
              <div className="relative">
                <SliderComponent
                  value={lookingFor.habit2}
                  onChange={(value) => handleSliderChange('lookingFor', 'habit2', value)}
                  isOpenToAll={openToAll.habit2LookingOpen}
                />
              </div>
              <div>
                {/* Only show switch if Habit 2 question has open_to_all_looking_for enabled */}
                {questions[1]?.open_to_all_looking_for ? (
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={openToAll.habit2LookingOpen}
                        onChange={() => handleOpenToAllToggle('habit2LookingOpen')}
                        className="sr-only"
                      />
                      <div className={`block w-11 h-6 rounded-full ${openToAll.habit2LookingOpen ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                      <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll.habit2LookingOpen ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                    </div>
                  </label>
                ) : (
                  <div className="w-11 h-6"></div> // Empty placeholder to maintain grid alignment
                )}
              </div>

              {/* HABIT 3 Slider Row */}
              <div className="text-xs font-semibold text-gray-400">
                {(questions[2]?.question_name || 'HABIT 3').toUpperCase()}
              </div>
              <div className="relative">
                <SliderComponent
                  value={lookingFor.habit3}
                  onChange={(value) => handleSliderChange('lookingFor', 'habit3', value)}
                  isOpenToAll={openToAll.habit3LookingOpen}
                />
              </div>
              <div>
                {/* Only show switch if Habit 3 question has open_to_all_looking_for enabled */}
                {questions[2]?.open_to_all_looking_for ? (
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={openToAll.habit3LookingOpen}
                        onChange={() => handleOpenToAllToggle('habit3LookingOpen')}
                        className="sr-only"
                      />
                      <div className={`block w-11 h-6 rounded-full ${openToAll.habit3LookingOpen ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                      <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll.habit3LookingOpen ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
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
                  onChange={(value) => handleSliderChange('importance', 'lookingFor', value)}
                  isOpenToAll={false}
                />
              </div>
              <div className="w-11 h-6"></div>
              
            </div>

            {/* Importance labels below Looking For section - centered and dynamic */}
            <div className="grid items-center justify-center mx-auto max-w-fit mt-2" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
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
            
            {/* NEVER, VERY OFTEN, and OTA labels below Me header */}
            <div className="grid items-center justify-center mx-auto max-w-fit mb-2" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
              <div></div> {/* Empty placeholder for label column */}
              <div className="flex justify-between text-xs text-gray-500">
                <span>NEVER</span>
                <span>VERY OFTEN</span>
              </div>
              <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
                {questions[0]?.open_to_all_me ? 'OTA' : ''}
              </div>
            </div>
            
            {/* Grid container for perfect alignment */}
            <div className="grid items-center justify-center mx-auto max-w-fit" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
              
              {/* HABIT 1 Slider Row */}
              <div className="text-xs font-semibold text-gray-400">
                {(questions[0]?.question_name || 'HABIT 1').toUpperCase()}
              </div>
              <div className="relative">
                <SliderComponent
                  value={myHabits.habit1}
                  onChange={(value) => handleSliderChange('myHabits', 'habit1', value)}
                  isOpenToAll={openToAll.habit1MeOpen}
                />
              </div>
              <div>
                {/* Only show switch if Habit 1 question has open_to_all_me enabled */}
                {questions[0]?.open_to_all_me ? (
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={openToAll.habit1MeOpen}
                        onChange={() => handleOpenToAllToggle('habit1MeOpen')}
                        className="sr-only"
                      />
                      <div className={`block w-11 h-6 rounded-full ${openToAll.habit1MeOpen ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                      <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll.habit1MeOpen ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                    </div>
                  </label>
                ) : (
                  <div className="w-11 h-6"></div> // Empty placeholder to maintain grid alignment
                )}
              </div>
              
              {/* HABIT 2 Slider Row */}
              <div className="text-xs font-semibold text-gray-400">
                {(questions[1]?.question_name || 'HABIT 2').toUpperCase()}
              </div>
              <div className="relative">
                <SliderComponent
                  value={myHabits.habit2}
                  onChange={(value) => handleSliderChange('myHabits', 'habit2', value)}
                  isOpenToAll={openToAll.habit2MeOpen}
                />
              </div>
              <div>
                {/* Only show switch if Habit 2 question has open_to_all_me enabled */}
                {questions[1]?.open_to_all_me ? (
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={openToAll.habit2MeOpen}
                        onChange={() => handleOpenToAllToggle('habit2MeOpen')}
                        className="sr-only"
                      />
                      <div className={`block w-11 h-6 rounded-full ${openToAll.habit2MeOpen ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                      <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll.habit2MeOpen ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                    </div>
                  </label>
                ) : (
                  <div className="w-11 h-6"></div> // Empty placeholder to maintain grid alignment
                )}
              </div>

              {/* HABIT 3 Slider Row */}
              <div className="text-xs font-semibold text-gray-400">
                {(questions[2]?.question_name || 'HABIT 3').toUpperCase()}
              </div>
              <div className="relative">
                <SliderComponent
                  value={myHabits.habit3}
                  onChange={(value) => handleSliderChange('myHabits', 'habit3', value)}
                  isOpenToAll={openToAll.habit3MeOpen}
                />
              </div>
              <div>
                {/* Only show switch if Habit 3 question has open_to_all_me enabled */}
                {questions[2]?.open_to_all_me ? (
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={openToAll.habit3MeOpen}
                        onChange={() => handleOpenToAllToggle('habit3MeOpen')}
                        className="sr-only"
                      />
                      <div className={`block w-11 h-6 rounded-full ${openToAll.habit3MeOpen ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                      <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll.habit3MeOpen ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
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
