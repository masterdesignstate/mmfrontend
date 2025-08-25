'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

export default function RelationshipPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string>('');
  const [questions, setQuestions] = useState<Array<{
    id: string;
    question_name: string;
    question_number: number;
    group_name: string;
    text: string;
    answers: Array<{ value: string; answer_text: string }>;
    open_to_all_me: boolean;
    open_to_all_looking_for: boolean;
  }>>([]);

  // State for questions 3-6 (Me answers only)
  const [myAnswers, setMyAnswers] = useState({
    q3: 3,
    q4: 3,
    q5: 3,
    q6: 3
  });

  const [openToAll, setOpenToAll] = useState({
    q3: false,
    q4: false,
    q5: false,
    q6: false
  });

  const [importance, setImportance] = useState({
    overall: 3 // Just one importance slider for this section
  });

  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const userIdParam = searchParams.get('user_id');
    const questionsParam = searchParams.get('questions');
    
    console.log('🔍 Relationship Page Load - URL Params:', {
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
        console.log('🔍 Relationship questions:', parsedQuestions.filter((q: typeof questions[0]) => [3, 4, 5, 6].includes(q.question_number)));
      } catch (error) {
        console.error('❌ Error parsing questions from URL:', error);
      }
    } else {
      console.log('❌ No questions parameter found in URL');
    }
  }, [searchParams]);

  // Fetch questions from backend if not loaded from URL params
  useEffect(() => {
    const fetchQuestionsIfNeeded = async () => {
      console.log('🔍 Fetch Check:', { 
        userId: !!userId, 
        questionsLength: questions.length, 
        loadingQuestions,
        shouldFetch: userId && questions.length === 0
      });
      
      // Only fetch if we have a userId but no questions loaded
      if (userId && questions.length === 0) {
        console.log('🚀 Starting to fetch questions from backend...');
        setLoadingQuestions(true);
        try {
          const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=3&question_number=4&question_number=5&question_number=6`;
          console.log('🌐 Fetching from URL:', apiUrl);
          
          const response = await fetch(apiUrl);
          console.log('📡 Response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('📋 Raw API response:', data);
            setQuestions(data.results || []);
            console.log('📋 Set questions to state:', data.results);
          } else {
            console.error('❌ Failed to fetch questions from backend. Status:', response.status);
          }
        } catch (error: unknown) {
          console.error('❌ Error fetching questions from backend:', error);
        } finally {
          setLoadingQuestions(false);
        }
      }
    };

    fetchQuestionsIfNeeded();
  }, [userId, questions.length, loadingQuestions]);

  const handleSliderChange = (section: 'myAnswers' | 'importance', questionKey: string, value: number) => {
    if (section === 'myAnswers') {
      setMyAnswers(prev => ({ ...prev, [questionKey]: value }));
    } else if (section === 'importance') {
      setImportance(prev => ({ ...prev, [questionKey]: value }));
    }
  };

  const handleOpenToAllToggle = (questionKey: 'q3' | 'q4' | 'q5' | 'q6') => {
    setOpenToAll(prev => ({ ...prev, [questionKey]: !prev[questionKey] }));
  };

  const handleNext = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    if (!questions || questions.length < 4) {
      setError('Questions not loaded properly');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Find questions 3, 4, 5, 6
      const relationshipQuestions = questions.filter(q => [3, 4, 5, 6].includes(q.question_number));

      if (relationshipQuestions.length !== 4) {
        setError('Required relationship questions not found');
        return;
      }

      // Prepare user answers for questions 3-6
      const userAnswers = [];

      for (const question of relationshipQuestions) {
        const questionKey = `q${question.question_number}` as keyof typeof myAnswers;
        const openToAllKey = questionKey as keyof typeof openToAll;
        
        userAnswers.push({
          user_id: userId,
          question_id: question.id,
          me_answer: openToAll[openToAllKey] ? 6 : myAnswers[questionKey],
          me_open_to_all: openToAll[openToAllKey],
          me_importance: importance.overall,
          me_share: true,
          looking_for_answer: 1, // Default since these questions don't have "looking for"
          looking_for_open_to_all: false,
          looking_for_importance: 1,
          looking_for_share: true
        });
      }

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

      // Navigate to dashboard or next step
      router.push('/dashboard');
    } catch (error: unknown) {
      console.error('Error saving relationship preferences:', error);
      setError((error as Error).message || 'Failed to save relationship preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const params = new URLSearchParams({ 
      user_id: userId,
      questions: JSON.stringify(questions)
    });
    router.push(`/auth/gender?${params.toString()}`);
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
    const sliderRef = useRef<HTMLDivElement>(null);

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
          ref={sliderRef}
          className="slider-track w-full h-5 rounded-[20px] relative cursor-pointer transition-all duration-200 border"
          style={{
            width: '100%',
            backgroundColor: isOpenToAll ? '#672DB7' : '#F5F5F5',
            borderColor: isOpenToAll ? '#672DB7' : '#ADADAD'
          }}
          onClick={handleSliderClick}
          onMouseMove={handleSliderDrag}
          onMouseDown={handleSliderDrag}
          onDragStart={handleDragStart}
        >
          {/* Filling Animation Layer */}
          <div 
            className="absolute top-0 left-0 h-full bg-[#672DB7] rounded-[20px]"
            style={{
              width: fillWidth,
              transition: 'width 1.2s ease-in-out',
              willChange: 'width'
            }}
          />
        </div>
        
        {/* Slider Thumb */}
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
            <h1 className="text-2xl font-bold text-black mb-2">2. Relationship</h1>
            <p className="text-2xl font-bold text-black mb-12">
              What relationship are you looking for?
              <span 
                className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-[#672DB7] text-xs font-medium cursor-help relative group" 
                style={{ backgroundColor: 'rgba(103, 45, 183, 0.2)' }}
                title="Open to All: When enabled, this question will be marked as 'Open to All' in your profile, indicating you're open to all options for this preference."
              >
                ?
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  Open to All: When enabled, this question will be marked as &apos;Open to All&apos; in your profile, indicating you&apos;re open to all options for this preference.
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                </div>
              </span>
            </p>
          </div>

          {/* Questions Loading Indicator */}
          {loadingQuestions && (
            <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded text-center">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
                Loading questions...
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Me Section */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-center mb-1">Me</h3>
            
            {/* LESS and MORE labels below Me header - using same grid structure */}
            <div className="grid items-center justify-center mx-auto max-w-fit mb-2" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
              <div></div> {/* Empty placeholder for label column */}
              <div className="flex justify-between text-xs text-gray-500">
                <span>LESS</span>
                <span>MORE</span>
              </div>
              <div></div> {/* Empty placeholder for switch column */}
            </div>
            
            {/* Grid container for perfect alignment */}
            <div className="grid items-center justify-center mx-auto max-w-fit" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
              
              {/* Question Rows for Q3-Q6 */}
              {questions.filter(q => [3, 4, 5, 6].includes(q.question_number)).map((question) => {
                const questionKey = `q${question.question_number}` as keyof typeof myAnswers;
                const openToAllKey = questionKey as keyof typeof openToAll;
                
                return (
                  <React.Fragment key={question.id}>
                    <div className="text-xs font-semibold text-gray-400">{question.question_name.toUpperCase()}</div>
                    <div className="relative">
                      <SliderComponent
                        value={myAnswers[questionKey]}
                        onChange={(value) => handleSliderChange('myAnswers', questionKey, value)}
                        isOpenToAll={openToAll[openToAllKey]}
                      />
                    </div>
                    <div>
                      {/* Only show switch if question has open_to_all_me enabled */}
                      {question.open_to_all_me ? (
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={openToAll[openToAllKey]}
                              onChange={() => handleOpenToAllToggle(openToAllKey)}
                              className="sr-only"
                            />
                            <div className={`block w-11 h-6 rounded-full ${openToAll[openToAllKey] ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                            <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll[openToAllKey] ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                          </div>
                        </label>
                      ) : (
                        <div className="w-11 h-6"></div> // Empty placeholder to maintain grid alignment
                      )}
                    </div>
                  </React.Fragment>
                );
              })}

              {/* IMPORTANCE Slider Row */}
              <div className="text-xs font-semibold text-gray-400">IMPORTANCE</div>
              <div className="relative">
                <SliderComponent
                  value={importance.overall}
                  onChange={(value) => handleSliderChange('importance', 'overall', value)}
                  isOpenToAll={false}
                />
              </div>
              <div className="w-11 h-6"></div>
              
            </div>

            {/* Importance labels below Me section - using same grid structure */}
            <div className="grid items-center justify-center mx-auto max-w-fit mt-2" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
              <div></div> {/* Empty placeholder for label column */}
              <div className="relative text-xs text-gray-500" style={{ width: '500px' }}>
                <span className="absolute" style={{ left: '0%', transform: 'translateX(0%)' }}>TRIVIAL</span>
                <span className="absolute" style={{ left: '25%', transform: 'translateX(-50%)' }}>MINOR</span>
                <span className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>AVERAGE</span>
                <span className="absolute" style={{ left: '75%', transform: 'translateX(-50%)' }}>SIGNIFICANT</span>
                <span className="absolute" style={{ left: '100%', transform: 'translateX(-100%)' }}>ESSENTIAL</span>
              </div>
              <div></div> {/* Empty placeholder for switch column */}
            </div>
          </div>
        </div>

      </main>

      {/* Footer with Progress and Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        {/* Progress Bar */}
        <div className="w-full h-1 bg-gray-200">
          <div className="h-full bg-black" style={{ width: '50%' }}></div>
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

      <style jsx>{`
        .slider {
          -webkit-appearance: none;
          appearance: none;
          background: #ddd;
          outline: none;
          border-radius: 15px;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #000;
          cursor: pointer;
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #000;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}