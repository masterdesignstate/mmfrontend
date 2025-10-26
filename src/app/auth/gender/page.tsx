'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

export default function GenderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string>('');

  // State for MALE/FEMALE sliders
  const [myGender, setMyGender] = useState({
    male: 3,
    female: 3
  });

  const [lookingFor, setLookingFor] = useState({
    male: 3,
    female: 3
  });

  const [openToAll, setOpenToAll] = useState({
    maleMeOpen: false,
    femaleMeOpen: false,
    maleLookingOpen: false,
    femaleLookingOpen: false
  });

  const [importance, setImportance] = useState({
    me: 3,
    lookingFor: 3
  });

  const [error, setError] = useState<string>('');

  // Hardcoded question IDs for gender questions
  const genderQuestionIds = {
    male: 'bfc597fe-fa90-46b3-9ac8-e98968b46efa',    // Group 1
    female: '45e0858e-8870-4378-ac4a-02e1043b5c2e'  // Group 2
  };

  useEffect(() => {
    const userIdParam = searchParams.get('user_id');
    if (userIdParam) {
      setUserId(userIdParam);
      console.log('📋 Set userId from URL param:', userIdParam);
    } else {
      console.log('❌ No user_id parameter found in URL');
    }
  }, [searchParams]);

  const handleSliderChange = (section: 'myGender' | 'lookingFor' | 'importance', gender: string, value: number) => {
    if (section === 'myGender') {
      setMyGender(prev => ({ ...prev, [gender]: value }));
    } else if (section === 'lookingFor') {
      setLookingFor(prev => ({ ...prev, [gender]: value }));
    } else if (section === 'importance') {
      setImportance(prev => ({ ...prev, [gender]: value }));
    }
  };

  const handleOpenToAllToggle = (switchType: 'maleMeOpen' | 'femaleMeOpen' | 'maleLookingOpen' | 'femaleLookingOpen') => {
    setOpenToAll(prev => ({ ...prev, [switchType]: !prev[switchType] }));
  };

  const handleNext = async () => {
    if (!userId) {
      console.error('❌ User ID is required');
      return;
    }

    console.log('🚀 Gender page - Starting optimistic navigation to ethnicity');

    // Navigate immediately to ethnicity page (optimistic)
    const params = new URLSearchParams({ 
      user_id: userId
    });
    router.push(`/auth/ethnicity?${params.toString()}`);

    // Save answers in background
    const saveAnswersInBackground = async () => {
      try {
        console.log('💾 Gender page - Starting background save...');
        
        // Prepare user answers for Male/Female questions
        const userAnswers = [
          {
            user_id: userId,
            question_id: genderQuestionIds.male,
            me_answer: openToAll.maleMeOpen ? 6 : myGender.male,
            me_open_to_all: openToAll.maleMeOpen,
            me_importance: importance.me,
            me_share: true,
            looking_for_answer: openToAll.maleLookingOpen ? 6 : lookingFor.male,
            looking_for_open_to_all: openToAll.maleLookingOpen,
            looking_for_importance: importance.lookingFor,
            looking_for_share: true
          },
          {
            user_id: userId,
            question_id: genderQuestionIds.female,
            me_answer: openToAll.femaleMeOpen ? 6 : myGender.female,
            me_open_to_all: openToAll.femaleMeOpen,
            me_importance: importance.me,
            me_share: true,
            looking_for_answer: openToAll.femaleLookingOpen ? 6 : lookingFor.female,
            looking_for_open_to_all: openToAll.femaleLookingOpen,
            looking_for_importance: importance.lookingFor,
            looking_for_share: true
          }
        ];

        // Save each user answer
        for (const userAnswer of userAnswers) {
          console.log('💾 Saving gender answer:', userAnswer.question_id);
          const response = await fetch(getApiUrl(API_ENDPOINTS.ANSWERS), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userAnswer)
          });

          if (!response.ok) {
            const data = await response.json();
            console.error('❌ Failed to save gender answer:', data);
            throw new Error(data.error || 'Failed to save answer');
          }
          console.log('✅ Gender answer saved successfully');
        }
        
        console.log('✅ All gender answers saved successfully');
      } catch (error) {
        console.error('❌ Error saving gender answers in background:', error);
      }
    };

    // Start background save (don't await)
    saveAnswersInBackground();
  };

  const handleBack = () => {
    const params = new URLSearchParams({ 
      user_id: userId
    });
    router.push(`/auth/relationship?${params.toString()}`);
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

  // Hardcoded OTA settings for gender questions
  const anyLookingForOpen = true; // All gender questions have open_to_all_looking_for = true
  const anyMeOpen = false; // Male question has open_to_all_me = true, Female has false

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
            <h1 className="text-3xl font-bold text-black mb-2">2. Gender</h1>
            <p className="text-3xl font-bold text-black mb-12">
              What gender do you identify with?
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

        {/* Sliders Container */}
        <div className="max-w-2xl mx-auto">
          {/* Them Section */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-center mb-1" style={{ color: '#672DB7' }}>Them</h3>

            {/* LESS, MORE, and OTA labels below Them header - using same grid structure */}
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

            <div
              className="grid items-center justify-center mx-auto w-full max-w-[640px] mobile-grid-rows"
              style={{
                gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                columnGap: 'clamp(12px, 5vw, 24px)',
                rowGap: 'clamp(8px, 2vw, 16px)'
              }}
            >
              {/* Male Slider */}
              <div className="text-xs font-semibold text-gray-400">MALE</div>
              <div className="relative">
                <SliderComponent
                  value={lookingFor.male}
                  onChange={(value) => handleSliderChange('lookingFor', 'male', value)}
                  isOpenToAll={openToAll.maleLookingOpen}
                />
              </div>
              <div className="flex justify-center">
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={openToAll.maleLookingOpen}
                      onChange={() => handleOpenToAllToggle('maleLookingOpen')}
                      className="sr-only"
                    />
                    <div className={`block w-11 h-6 rounded-full ${openToAll.maleLookingOpen ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                    <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll.maleLookingOpen ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                  </div>
                </label>
              </div>

              {/* Female Slider */}
              <div className="text-xs font-semibold text-gray-400">FEMALE</div>
              <div className="relative">
                <SliderComponent
                  value={lookingFor.female}
                  onChange={(value) => handleSliderChange('lookingFor', 'female', value)}
                  isOpenToAll={openToAll.femaleLookingOpen}
                />
              </div>
              <div className="flex justify-center">
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={openToAll.femaleLookingOpen}
                      onChange={() => handleOpenToAllToggle('femaleLookingOpen')}
                      className="sr-only"
                    />
                    <div className={`block w-11 h-6 rounded-full ${openToAll.femaleLookingOpen ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                    <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll.femaleLookingOpen ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                  </div>
                </label>
              </div>

              {/* Importance Slider */}
              <div className="text-xs font-semibold text-gray-400">IMPORTANCE</div>
              <div className="relative">
                <SliderComponent
                  value={importance.lookingFor}
                  onChange={(value) => handleSliderChange('importance', 'lookingFor', value)}
                  isImportance={true}
                />
              </div>
              <div className="w-11 h-6"></div>
            </div>
          </div>

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
              {/* Male Slider */}
              <div className="text-xs font-semibold text-gray-400">MALE</div>
              <div className="relative">
                <SliderComponent
                  value={myGender.male}
                  onChange={(value) => handleSliderChange('myGender', 'male', value)}
                  isOpenToAll={openToAll.maleMeOpen}
                />
              </div>
              <div className="flex justify-center">
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={openToAll.maleMeOpen}
                      onChange={() => handleOpenToAllToggle('maleMeOpen')}
                      className="sr-only"
                    />
                    <div className={`block w-11 h-6 rounded-full ${openToAll.maleMeOpen ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                    <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll.maleMeOpen ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                  </div>
                </label>
              </div>

              {/* Female Slider */}
              <div className="text-xs font-semibold text-gray-400">FEMALE</div>
              <div className="relative">
                <SliderComponent
                  value={myGender.female}
                  onChange={(value) => handleSliderChange('myGender', 'female', value)}
                  isOpenToAll={openToAll.femaleMeOpen}
                />
              </div>
              <div className="flex justify-center">
                <div className="w-11 h-6"></div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>

      {/* Footer with Progress and Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        {/* Progress Bar */}
        <div className="w-full h-1 bg-gray-200">
          <div className="h-full bg-black" style={{ width: '20%' }}></div>
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

          {/* Next/Save Button */}
          <button
            onClick={handleNext}
            className="px-8 py-3 bg-black text-white rounded-md font-medium hover:bg-gray-800 transition-colors"
          >
            Next
          </button>
        </div>
      </footer>
    </div>
  );
}