'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

export default function RelationshipPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string>('');

  // Hardcoded relationship question labels
  const relationshipLabels = ['FRIEND', 'HOOKUP', 'DATE', 'PARTNER'];
  
  // Hardcoded relationship question IDs (question_number == 1)
  const relationshipQuestionIds = {
    friend: '0794e611-1552-4840-a968-a3296263f317',    // Group 1
    hookup: '18b3073e-fad2-45ee-b0b7-dfd99b9d23dd',   // Group 2
    date: '72efdf7a-7db2-472b-84a4-58fa4f7ad8c1',     // Group 3
    partner: '5e8dc25e-a417-421f-ad54-b136b7e54f34'   // Group 4
  };

  // State for relationship questions (4 sliders + importance)
  const [myAnswers, setMyAnswers] = useState({
    friend: 3,
    hookup: 3,
    date: 3,
    partner: 3
  });

  const [openToAll, setOpenToAll] = useState({
    friend: false,
    hookup: false,
    date: false,
    partner: false
  });

  const [importance, setImportance] = useState({
    me: 3
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const userIdParam = searchParams.get('user_id');
    
    // Get userId from URL params first, then try localStorage as fallback
    if (userIdParam) {
      setUserId(userIdParam);
    } else {
      // Try to get user_id from localStorage (set during login)
      const storedUserId = localStorage.getItem('user_id');
      if (storedUserId) {
        setUserId(storedUserId);
      }
    }
  }, [searchParams]);


  const handleSliderChange = (questionKey: keyof typeof myAnswers, value: number) => {
    setMyAnswers(prev => ({ ...prev, [questionKey]: value }));
  };

  const handleOpenToAllToggle = (questionKey: keyof typeof openToAll) => {
    setOpenToAll(prev => ({ ...prev, [questionKey]: !prev[questionKey] }));
  };

  const handleNext = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Navigate to next page immediately (optimistic approach)
      const params = new URLSearchParams({ 
        user_id: userId
      });
      
      router.push(`/auth/gender?${params.toString()}`);

      // Save answers to backend in the background (don't wait for response)
      const saveAnswersInBackground = async () => {
        try {
          console.log('🚀 Starting to save relationship answers to backend...');
          console.log('📊 Current answers:', { myAnswers, openToAll, importance });
          
          // Prepare user answers for each relationship question
          const userAnswers = Object.entries(myAnswers).map(([questionKey, answerValue]) => {
            const openToAllKey = questionKey as keyof typeof openToAll;
            const questionId = relationshipQuestionIds[questionKey as keyof typeof relationshipQuestionIds];
            
            return {
              user_id: userId,
              question_id: questionId,
              me_answer: openToAll[openToAllKey] ? 6 : answerValue,
              me_open_to_all: openToAll[openToAllKey],
              me_importance: importance.me,
              me_share: true,
              looking_for_answer: 1,
              looking_for_open_to_all: false,
              looking_for_importance: 1,
              looking_for_share: true
            };
          });

          console.log('🌐 Making API calls to:', getApiUrl(API_ENDPOINTS.ANSWERS));
          
          // Save each answer to backend
          const savePromises = userAnswers.map(async (userAnswer, index) => {
            console.log(`📤 Sending API request ${index + 1}/4:`, userAnswer);
            
            const response = await fetch(getApiUrl(API_ENDPOINTS.ANSWERS), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(userAnswer)
            });
            
            console.log(`📡 Response ${index + 1} status:`, response.status);
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`❌ API request ${index + 1} failed:`, response.status, errorText);
            } else {
              const responseData = await response.json();
              console.log(`✅ API request ${index + 1} successful:`, responseData);
            }
          });

          await Promise.all(savePromises);
          console.log('✅ All relationship answers processed');
        } catch (error) {
          console.error('❌ Error saving relationship answers to backend:', error);
        }
      };

      // Start background save (don't await)
      console.log('🎯 About to start background save...');
      saveAnswersInBackground();
      console.log('🎯 Background save function called');

    } catch (error: unknown) {
      console.error('❌ Error navigating to next page:', error);
      setError(error instanceof Error ? error.message : 'Failed to proceed');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const params = new URLSearchParams({ 
      user_id: userId
    });
    router.push(`/auth/introcard?${params.toString()}`);
  };

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
            <h1 className="text-3xl font-bold text-black mb-2">1. Relationship</h1>
            <p className="text-3xl font-bold text-black mb-12">
              What relationship are you looking for?
            </p>
          </div>



          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Me Section */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-center mb-1">Me</h3>
            
            {/* LESS, MORE, and OTA labels below Me header - using same grid structure */}
            <div
              className="grid items-center justify-center mx-auto w-full max-w-[640px] mb-2 mobile-grid-labels"
              style={{
                gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                columnGap: 'clamp(12px, 5vw, 24px)'
              }}
            >
              <div></div> {/* Empty placeholder for label column */}
              <div className="flex justify-between text-xs text-gray-500">
                <span>LESS</span>
                <span>MORE</span>
              </div>
              <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
                OTA
              </div>
            
               
            </div>
            
            {/* Grid container for perfect alignment */}
            <div
              className="grid items-center justify-center mx-auto w-full max-w-[640px] mobile-grid-rows"
              style={{
                gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                columnGap: 'clamp(12px, 5vw, 24px)',
                rowGap: 'clamp(16px, 4vw, 28px)'
              }}
            >
              
              {/* Hardcoded Relationship Question Rows */}
              {relationshipLabels.map((label) => {
                const questionKey = label.toLowerCase() as keyof typeof myAnswers;
                const openToAllKey = questionKey as keyof typeof openToAll;
                
                return (
                  <React.Fragment key={label}>
                    <div className="text-xs font-semibold text-gray-400 mobile-label">{label}</div>
                    <div className="relative">
                      <SliderComponent
                        value={myAnswers[questionKey]}
                        onChange={(value) => handleSliderChange(questionKey, value)}
                        isOpenToAll={openToAll[openToAllKey]}
                      />
                    </div>
                    <div>
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
                    </div>
                  </React.Fragment>
                );
              })}

              {/* IMPORTANCE Slider Row */}
              <div className="text-xs font-semibold text-gray-400">IMPORTANCE</div>
              <div className="relative">
                <SliderComponent
                  value={importance.me}
                  onChange={(value) => setImportance(prev => ({ ...prev, me: value }))}
                  isOpenToAll={false}
                  isImportance={true}
                />
              </div>
              <div className="w-11 h-6"></div>

            </div>

            {/* Importance labels below Me section - centered and dynamic */}
            <div
              className="grid items-center justify-center mx-auto w-full max-w-[640px] mt-2"
              style={{
                gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                columnGap: 'clamp(12px, 5vw, 24px)'
              }}
            >
              <div></div> {/* Empty placeholder for label column */}
              <div className="relative text-xs text-gray-500 w-full">
                {/* Only show the label for the current importance value */}
                {importance.me === 1 && (
                  <span className="absolute" style={{ left: '14px', transform: 'translateX(-50%)' }}>TRIVIAL</span>
                )}
                {importance.me === 2 && (
                  <span className="absolute" style={{ left: '25%', transform: 'translateX(-50%)' }}>MINOR</span>
                )}
                {importance.me === 3 && (
                  <span className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>AVERAGE</span>
                )}
                {importance.me === 4 && (
                  <span className="absolute" style={{ left: '75%', transform: 'translateX(-50%)' }}>SIGNIFICANT</span>
                )}
                {importance.me === 5 && (
                  <span className="absolute" style={{ left: 'calc(100% - 14px)', transform: 'translateX(-50%)' }}>ESSENTIAL</span>
                )}
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
          <div className="h-full bg-black" style={{ width: '30%' }}></div>
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
