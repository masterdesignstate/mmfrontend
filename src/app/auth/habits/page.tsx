'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

export default function HabitsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string>('');
  // Removed questions state - using hardcoded data only

  // Hardcoded habits question IDs from Django database (question_number=7)
  const habitsQuestionIds = {
    'Alcohol': 'befc610f-6fda-4b0e-9b5a-8100ec0d14e7',        // Group 1: Alcohol
    'Cigarettes': '13d18dd3-00c1-4f86-9337-24fc07e24091',     // Group 2: Cigarettes
    'Vape': '07453d3e-5f22-4b73-9cd5-a09520b412b5'             // Group 3: Vape
  };

  // Hardcoded habits labels
  const habitsLabels = ['ALCOHOL', 'CIGARETTES', 'VAPE'];

  // State for 3 habits sliders
  const habitKeys = ['habit1', 'habit2', 'habit3'] as const;
  const meOpenKeys = ['habit1MeOpen', 'habit2MeOpen', 'habit3MeOpen'] as const;
  const lookingOpenKeys = ['habit1LookingOpen', 'habit2LookingOpen', 'habit3LookingOpen'] as const;
  type HabitKey = (typeof habitKeys)[number];
  type MeOpenKey = (typeof meOpenKeys)[number];
  type LookingOpenKey = (typeof lookingOpenKeys)[number];

  const [myHabits, setMyHabits] = useState<Record<HabitKey, number>>({
    habit1: 3,
    habit2: 3,
    habit3: 3
  });

  const [lookingFor, setLookingFor] = useState<Record<HabitKey, number>>({
    habit1: 3,
    habit2: 3,
    habit3: 3
  });

  const [openToAll, setOpenToAll] = useState<Record<MeOpenKey | LookingOpenKey, boolean>>({
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
  // Removed loadingQuestions state - no longer fetching data
  const [error, setError] = useState<string>('');
  // Removed exerciseQuestion state - not needed for habits page

  // Hardcoded slider labels for habits questions
  const habitsSliderLabels = ['NEVER', 'RARELY', 'SOMETIMES', 'REGULARLY', 'DAILY'];
  
  // Helper function to render all available answer labels at the top
  const renderTopLabels = () => {
    return (
      <div className="relative text-xs text-gray-500 w-full" style={{ height: '14px' }}>
        {habitsSliderLabels.map((label, index) => {
          const value = index + 1;
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
              {label}
            </span>
          );
        })}
      </div>
    );
  };
  
  // Removed nextQuestions state - not needed for habits page

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
    
    // Removed questions parameter parsing - using hardcoded data only
  }, [searchParams]);

  // Removed habits questions fetching - using hardcoded data only

  // Removed next questions fetching - not needed for habits page

  // Removed fetchExerciseQuestion function - not needed for habits page

  const handleSliderChange = (section: 'myHabits' | 'lookingFor' | 'importance', habitKey?: HabitKey, value?: number) => {
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

  const handleOpenToAllToggle = (switchType: MeOpenKey | LookingOpenKey) => {
    setOpenToAll(prev => ({ ...prev, [switchType]: !prev[switchType] }));
  };

  const handleNext = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Prepare user answers for all 3 habits questions using hardcoded question IDs
      const userAnswers: Array<{
        user_id: string;
        question_id: string;
        me_answer: number;
        me_open_to_all: boolean;
        me_importance: number;
        me_share: boolean;
        looking_for_answer: number;
        looking_for_open_to_all: boolean;
        looking_for_importance: number;
        looking_for_share: boolean;
      }> = [];
      
      // Habit 1 (Alcohol)
      userAnswers.push({
        user_id: userId,
        question_id: habitsQuestionIds.Alcohol,
        me_answer: openToAll.habit1MeOpen ? 6 : myHabits.habit1,
        me_open_to_all: openToAll.habit1MeOpen,
        me_importance: importance.me,
        me_share: true,
        looking_for_answer: openToAll.habit1LookingOpen ? 6 : lookingFor.habit1,
        looking_for_open_to_all: openToAll.habit1LookingOpen,
        looking_for_importance: importance.lookingFor,
        looking_for_share: true
      });

      // Habit 2 (Cigarettes)
      userAnswers.push({
        user_id: userId,
        question_id: habitsQuestionIds.Cigarettes,
        me_answer: openToAll.habit2MeOpen ? 6 : myHabits.habit2,
        me_open_to_all: openToAll.habit2MeOpen,
        me_importance: importance.me,
        me_share: true,
        looking_for_answer: openToAll.habit2LookingOpen ? 6 : lookingFor.habit2,
        looking_for_open_to_all: openToAll.habit2LookingOpen,
        looking_for_importance: importance.lookingFor,
        looking_for_share: true
      });

      // Habit 3 (Vape)
      userAnswers.push({
        user_id: userId,
        question_id: habitsQuestionIds.Vape,
        me_answer: openToAll.habit3MeOpen ? 6 : myHabits.habit3,
        me_open_to_all: openToAll.habit3MeOpen,
        me_importance: importance.me,
        me_share: true,
        looking_for_answer: openToAll.habit3LookingOpen ? 6 : lookingFor.habit3,
        looking_for_open_to_all: openToAll.habit3LookingOpen,
        looking_for_importance: importance.lookingFor,
        looking_for_share: true
      });

      // Save answers in background (optimistic approach)
      const saveAnswersInBackground = async () => {
        try {
          console.log('🚀 Starting to save habits answers to backend...');
          console.log('📊 User answers:', userAnswers);

          for (const userAnswer of userAnswers) {
            const response = await fetch(getApiUrl(API_ENDPOINTS.ANSWERS), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(userAnswer)
            });

            console.log('📡 Response status:', response.status);

            if (!response.ok) {
              const errorText = await response.text();
              console.error('❌ API request failed:', response.status, errorText);
            } else {
              const responseData = await response.json();
              console.log('✅ API request successful:', responseData);
            }
          }

          console.log('✅ All habits answers processed');
        } catch (error) {
          console.error('❌ Error saving habits answers to backend:', error);
        }
      };

      // Start background save (don't await)
      console.log('🏃 About to start background save...');
      saveAnswersInBackground();
      console.log('🏃 Background save function called');
      
      // Continue with navigation immediately
      console.log('🏃 Continuing with navigation...');
      
      // Navigate to next onboarding step immediately
      const params = new URLSearchParams({ 
        user_id: userId
      });
      
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
    
    router.push(`/auth/question/6?${params.toString()}`);
  };

  // Slider component - EXACT COPY from gender page
  const SliderComponent = ({ 
    value, 
    onChange,
    isOpenToAll = false,
    isImportance = false
  }: { 
    value: number; 
    onChange: (value: number) => void; 
    isOpenToAll?: boolean;
    isImportance?: boolean;
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
          />
          
          {/* Slider Thumb - OUTSIDE the track container */}
          {!isOpenToAll && (
            <div 
              className="absolute top-1/2 transform -translate-y-1/2 w-7 h-7 border border-gray-300 rounded-full flex items-center justify-center text-sm font-semibold z-30 cursor-pointer"
              style={{
                backgroundColor: isImportance ? 'white' : '#672DB7',
                boxShadow: isImportance ? '0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.12)',
                left: value === 1 ? '0px' : value === 5 ? 'calc(100% - 28px)' : `calc(${((value - 1) / 4) * 100}% - 14px)`
              }}
              onDragStart={handleDragStart}
            >
              <span style={{ color: isImportance ? '#672DB7' : 'white' }}>{value}</span>
            </div>
          )}
          
          {!isOpenToAll && <span className="absolute right-2 text-xs text-gray-500 pointer-events-none z-10">5</span>}
      </div>
    );
  };

  // Hardcoded OTA settings for habits questions
  const anyLookingForOpen = true; // All habits questions have open_to_all_looking_for = true
  const anyMeOpen = false; // All habits questions have open_to_all_me = false

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
          <div className="mb-10">
            <h3 className="text-2xl font-bold text-center mb-1" style={{ color: '#672DB7' }}>Them</h3>

            <div
              className="grid items-center justify-center mx-auto w-full max-w-[640px] mb-2 mobile-grid-labels"
              style={{
                gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                columnGap: 'clamp(12px, 5vw, 24px)'
              }}
            >
              <div></div>
              <div className="w-full">{renderTopLabels()}</div>
              <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
                {anyLookingForOpen ? 'OTA' : ''}
              </div>
            </div>

            <div
              className="grid items-center justify-center mx-auto w-full max-w-[640px] mobile-grid-rows"
              style={{
                gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                columnGap: 'clamp(12px, 5vw, 24px)',
                rowGap: 'clamp(8px, 2vw, 16px)'
              }}
            >
              {habitKeys.map((habitKey, index) => {
                const lookingOpenKey = lookingOpenKeys[index];

                return (
                  <React.Fragment key={`looking-${habitKey}`}>
                    <div className="text-xs font-semibold text-gray-400">
                      {habitsLabels[index]}
                    </div>
                    <div className="relative">
                      <SliderComponent
                        value={lookingFor[habitKey]}
                        onChange={(value) => handleSliderChange('lookingFor', habitKey, value)}
                        isOpenToAll={openToAll[lookingOpenKey]}
                      />
                    </div>
                    <div className="flex justify-center">
                      {true ? (
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
                  </React.Fragment>
                );
              })}

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
              className="grid items-center justify-center mx-auto w-full max-w-[640px] mt-2"
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
          <div className="mb-6 pt-2">
            <h3 className="text-2xl font-bold text-center mb-1">Me</h3>

            <div
              className="grid items-center justify-center mx-auto w-full max-w-[640px] mb-2 mobile-grid-labels"
              style={{
                gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                columnGap: 'clamp(12px, 5vw, 24px)'
              }}
            >
              <div></div>
              <div className="w-full">{renderTopLabels()}</div>
              <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
                {anyMeOpen ? 'OTA' : ''}
              </div>
            </div>

            <div
              className="grid items-center justify-center mx-auto w-full max-w-[640px] mobile-grid-rows"
              style={{
                gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                columnGap: 'clamp(12px, 5vw, 24px)',
                rowGap: 'clamp(8px, 2vw, 16px)'
              }}
            >
              {habitKeys.map((habitKey, index) => {
                const meOpenKey = meOpenKeys[index];

                return (
                  <React.Fragment key={`me-${habitKey}`}>
                    <div className="text-xs font-semibold text-gray-400">
                      {habitsLabels[index]}
                    </div>
                    <div className="relative">
                      <SliderComponent
                        value={myHabits[habitKey]}
                        onChange={(value) => handleSliderChange('myHabits', habitKey, value)}
                        isOpenToAll={openToAll[meOpenKey]}
                      />
                    </div>
                    <div className="flex justify-center">
                      {false ? (
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
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer with Progress and Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        {/* Progress Bar */}
        <div className="w-full h-1 bg-gray-200">
          <div className="h-full bg-black" style={{ width: '70%' }}></div>
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex justify-between items-center px-6 py-4">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="text-gray-900 font-medium hover:text-gray-500 transition-colors cursor-pointer"
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
