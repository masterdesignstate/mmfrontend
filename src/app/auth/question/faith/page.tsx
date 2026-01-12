'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

export default function FaithQuestionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string>('');
  const [question, setQuestion] = useState<{
    id: string;
    question_name: string;
    question_number: number;
    group_number?: number;
    group_name: string;
    text: string;
    answers: Array<{ value: string; answer_text: string }>;
    open_to_all_me: boolean;
    open_to_all_looking_for: boolean;
  } | null>(null);

  // State for single question slider
  const [myAnswer, setMyAnswer] = useState(3);
  const [lookingForAnswer, setLookingForAnswer] = useState(3);
  const [openToAll, setOpenToAll] = useState({
    answer1MeOpen: false,
    answer1LookingOpen: false
  });
  const [importance, setImportance] = useState({
    me: 3,
    lookingFor: 3
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const userIdParam = searchParams.get('user_id');
    const faithParam = searchParams.get('faith');
    const questionDataParam = searchParams.get('question_data');
    
    console.log('🔍 Faith Question Page Load - URL Params:', {
      userIdParam,
      faithParam,
      questionDataParam: questionDataParam ? 'present' : 'missing'
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
    
    if (questionDataParam) {
      try {
        const parsedQuestion = JSON.parse(questionDataParam);
        setQuestion(parsedQuestion);
        console.log('📋 Received question from URL:', parsedQuestion);
        console.log('🔍 Faith question OTA settings from URL:', {
          number: parsedQuestion.question_number,
          group: parsedQuestion.group_name,
          ota_me: parsedQuestion.open_to_all_me,
          ota_looking: parsedQuestion.open_to_all_looking_for
        });
      } catch (error) {
        console.error('❌ Error parsing question from URL:', error);
      }
    } else {
      console.log('❌ No question_data parameter found in URL');
    }
  }, [searchParams]);

  const handleSliderChange = (section: 'myAnswer' | 'lookingForAnswer' | 'importance', value?: number) => {
    if (section === 'myAnswer' && value !== undefined) {
      setMyAnswer(value);
    } else if (section === 'lookingForAnswer' && value !== undefined) {
      setLookingForAnswer(value);
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
    if (!userId || !question) {
      setError('User ID and question are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Prepare user answer for the single question
      const userAnswer = {
        user_id: userId,
        question_id: question.id,
        me_answer: openToAll.answer1MeOpen ? 6 : myAnswer,
        me_open_to_all: openToAll.answer1MeOpen,
        me_importance: importance.me,
        me_share: true,
        looking_for_answer: openToAll.answer1LookingOpen ? 6 : lookingForAnswer,
        looking_for_open_to_all: openToAll.answer1LookingOpen,
        looking_for_importance: importance.lookingFor,
        looking_for_share: true
      };

      // Save the user answer
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

      // Navigate back to faith list page with refresh flag
      const params = new URLSearchParams({ 
        user_id: userId,
        refresh: 'true'
      });
      router.push(`/auth/faith?${params.toString()}`);
    } catch (error) {
      console.error('Error saving faith answer:', error);
      setError(error instanceof Error ? error.message : 'Failed to save answer');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const params = new URLSearchParams({ 
      user_id: userId
    });
    router.push(`/auth/faith?${params.toString()}`);
  };

  // Slider component - EXACT COPY from politics/religion page
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
            <h1 className="text-3xl font-bold text-black mb-2">
              11. {question?.question_name || 'Faith'}
            </h1>
            <p className="text-3xl font-bold text-black mb-12">
              {question?.text || 'Select a faith to answer'}
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
            
            {/* NEVER, VERY OFTEN, and OTA labels below Me header */}
            <div className="onboarding-label-row items-center mx-auto w-full mb-2">
              <div></div> {/* Empty placeholder for label column */}
              <div className="onboarding-track flex justify-between text-xs text-gray-500">
                <span>Less</span>
                <span>More</span>
              </div>
              <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
                {question?.open_to_all_me ? 'OTA' : ''}
              </div>
            </div>
            
            {/* Grid container for perfect alignment */}
            <div className="onboarding-grid items-center mx-auto w-full">
              
              {/* FAITH Slider Row */}
              <div className="text-xs font-semibold text-gray-400">
                {(question?.question_name || 'FAITH').toUpperCase()}
              </div>
              <div className="relative onboarding-track">
                <SliderComponent
                  value={myAnswer}
                  onChange={(value) => handleSliderChange('myAnswer', value)}
                  isOpenToAll={openToAll.answer1MeOpen}
                />
              </div>
              <div>
                {/* Only show switch if Faith question has open_to_all_me enabled */}
                {question?.open_to_all_me ? (
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

              {/* IMPORTANCE Slider Row */}
              <div className="text-xs font-semibold text-gray-400">IMPORTANCE</div>
              <div className="relative onboarding-track">
                <SliderComponent
                  value={importance.me}
                  onChange={(value) => handleSliderChange('importance', value)}
                  isOpenToAll={false}
                />
              </div>
              <div className="w-11 h-6"></div>
              
            </div>

            {/* Importance labels below Me section - centered and dynamic */}
            <div className="onboarding-grid items-center mx-auto w-full mt-2">
              <div></div> {/* Empty placeholder for label column */}
              <div className="relative text-xs text-gray-500 onboarding-track text-xs text-gray-500">
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

          {/* Looking For Section */}
          <div className="mb-6 pt-8">
            <h3 className="text-2xl font-bold text-center mb-1" style={{ color: '#672DB7' }}>Them</h3>
            
            {/* NEVER, VERY OFTEN, and OTA labels below Looking For header */}
            <div className="onboarding-label-row items-center mx-auto w-full mb-2">
              <div></div> {/* Empty placeholder for label column */}
              <div className="onboarding-track flex justify-between text-xs text-gray-500">
                <span>Less</span>
                <span>More</span>
              </div>
              <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
                {question?.open_to_all_looking_for ? 'OTA' : ''}
              </div>
            </div>
            
            {/* Grid container for perfect alignment */}
            <div className="onboarding-grid items-center mx-auto w-full">
              
              {/* FAITH Slider Row */}
              <div className="text-xs font-semibold text-gray-400">
                {(question?.question_name || 'FAITH').toUpperCase()}
              </div>
              <div className="relative onboarding-track">
                <SliderComponent
                  value={lookingForAnswer}
                  onChange={(value) => handleSliderChange('lookingForAnswer', value)}
                  isOpenToAll={openToAll.answer1LookingOpen}
                />
              </div>
              <div>
                {/* Only show switch if Faith question has open_to_all_looking_for enabled */}
                {question?.open_to_all_looking_for ? (
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

              {/* IMPORTANCE Slider Row */}
              <div className="text-xs font-semibold text-gray-400">IMPORTANCE</div>
              <div className="relative onboarding-track">
                <SliderComponent
                  value={importance.lookingFor}
                  onChange={handleLookingForImportanceChange}
                  isOpenToAll={false}
                />
              </div>
              <div className="w-11 h-6"></div>
              
            </div>

            {/* Importance labels below Looking For section - centered and dynamic */}
            <div className="onboarding-grid items-center mx-auto w-full mt-2">
              <div></div> {/* Empty placeholder for label column */}
              <div className="relative text-xs text-gray-500 onboarding-track text-xs text-gray-500">
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
