'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

export default function GenderPage() {
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
  }>>([]);

  // Gender preference states
  const [myGender, setMyGender] = useState({
    male: 3,
    female: 3
  });

  const [lookingFor, setLookingFor] = useState({
    male: 3,
    female: 3
  });

  const [importance, setImportance] = useState({
    me: 3,
    lookingFor: 3
  });

  const [openToAll, setOpenToAll] = useState({
    me: false,
    lookingFor: false
  });

  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const userIdParam = searchParams.get('user_id');
    const questionsParam = searchParams.get('questions');
    
    if (userIdParam) {
      setUserId(userIdParam);
    }
    
    if (questionsParam) {
      try {
        const parsedQuestions = JSON.parse(questionsParam);
        setQuestions(parsedQuestions);
        console.log('📋 Received questions:', parsedQuestions);
      } catch (error) {
        console.error('Error parsing questions:', error);
      }
    }
  }, [searchParams]);

  // Fetch questions from backend if not loaded from URL params
  useEffect(() => {
    const fetchQuestionsIfNeeded = async () => {
      // Only fetch if we have a userId but no questions loaded
      if (userId && questions.length === 0) {
        console.log('📋 No questions loaded, fetching from backend...');
        setLoadingQuestions(true);
        try {
          // Fetch questions with question_number 1 and 2
          const response = await fetch(`${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=1&question_number=2`);
          if (response.ok) {
            const data = await response.json();
            setQuestions(data.results || []);
            console.log('📋 Fetched questions from backend:', data.results);
          } else {
            console.error('Failed to fetch questions from backend');
          }
        } catch (error) {
          console.error('Error fetching questions from backend:', error);
        } finally {
          setLoadingQuestions(false);
        }
      }
    };

    fetchQuestionsIfNeeded();
  }, [userId, questions.length]);

  const handleSliderChange = (section: 'myGender' | 'lookingFor' | 'importance', gender: string, value: number) => {
    if (section === 'myGender') {
      setMyGender(prev => ({ ...prev, [gender]: value }));
    } else if (section === 'lookingFor') {
      setLookingFor(prev => ({ ...prev, [gender]: value }));
    } else if (section === 'importance') {
      setImportance(prev => ({ ...prev, [gender]: value }));
    }
  };

  const handleOpenToAllToggle = (section: 'me' | 'lookingFor') => {
    if (section === 'me') {
      setOpenToAll(prev => ({ ...prev, me: !prev.me }));
    } else {
      setOpenToAll(prev => ({ ...prev, lookingFor: !prev.lookingFor }));
    }
  };



  const handleNext = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/gender-preferences/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          my_gender: myGender,
          looking_for: lookingFor,
          importance: importance,
          open_to_all: openToAll
        })
      });

      if (response.ok) {
        // Navigate to next step in onboarding
        router.push('/dashboard');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save gender preferences');
      }
    } catch (error) {
      console.error('Error saving gender preferences:', error);
      setError('Failed to save gender preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const params = new URLSearchParams({ 
      user_id: userId,
      questions: JSON.stringify(questions)
    });
    router.push(`/auth/add-photo?${params.toString()}`);
  };

  const SliderComponent = ({ 
    value, 
    onChange, 
    label,
    isOpenToAll = false
  }: { 
    value: number; 
    onChange: (value: number) => void; 
    label: string;
    isOpenToAll?: boolean;
  }) => {
    const [fillWidth, setFillWidth] = useState('0%');
    const hasAnimatedRef = useRef(false);
    const raf1Ref = useRef<number | null>(null);
    const raf2Ref = useRef<number | null>(null);

    useLayoutEffect(() => {
      if (isOpenToAll && !hasAnimatedRef.current) {
        // Ensure the element paints at 0% before transitioning to 100%
        setFillWidth('0%');
        raf1Ref.current = requestAnimationFrame(() => {
          raf2Ref.current = requestAnimationFrame(() => {
            setFillWidth('100%');
            hasAnimatedRef.current = true; // mark as animated after scheduling
          });
        });
        return () => {
          if (raf1Ref.current) cancelAnimationFrame(raf1Ref.current);
          if (raf2Ref.current) cancelAnimationFrame(raf2Ref.current);
        };
      }
      if (!isOpenToAll) {
        hasAnimatedRef.current = false; // reset guard when turned off
        setFillWidth('0%');
      }
    }, [isOpenToAll]);
    const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newValue = Math.round(percentage * 4) + 1; // 1-5 range
      onChange(Math.max(1, Math.min(5, newValue)));
    };

    const handleSliderDrag = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.buttons === 1) { // Left mouse button
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
            className="w-full h-5 rounded-[20px] relative cursor-pointer transition-all duration-200 border border-[#ADADAD]"
            style={{
              width: '100%',
              backgroundColor: '#F5F5F5',
              boxShadow: isOpenToAll ? '0 0 15px rgba(103, 45, 183, 0.5)' : 'none'
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
          
          {/* Slider Thumb - OUTSIDE the track container */}
          {!isOpenToAll && (
            <div 
              className="absolute top-1/2 transform -translate-y-1/2 w-6 h-6 border border-gray-300 rounded-full flex items-center justify-center text-sm font-semibold shadow-sm z-30 cursor-pointer"
              style={{
                backgroundColor: '#672DB7',
                // left: `calc(${((value - 1) / 4) * 100}% - 16px)`
                left: value === 1 ? '0px' : value === 5 ? 'calc(100% - 30px)' : `calc(${((value - 1) / 4) * 100}% - 16px)`
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
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-black mb-2">1. Gender</h1>
            <p className="text-2xl font-bold text-black mb-12">
              What gender do you identify with?
              <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full text-[#672DB7] text-sm font-medium" style={{ backgroundColor: 'rgba(103, 45, 183, 0.2)' }}>?</span>
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
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-center mb-2">Me</h3>
            
            {/* LESS and MORE labels below Me header - aligned with slider start/end */}
            <div className="flex justify-between text-xs text-gray-500 mb-4" style={{ paddingLeft: '144px', paddingRight: '112px' }}>
              <span>LESS</span>
              <span>MORE</span>
            </div>
            
            {/* Grid container for perfect alignment */}
            <div className="grid grid-cols-[112px_500px_56px] gap-8 items-center">
              
              {/* MALE Slider Row */}
              <div className="text-xs font-semibold text-gray-400">MALE</div>
              <div className="relative">
                <SliderComponent
                  value={myGender.male}
                  onChange={(value) => handleSliderChange('myGender', 'male', value)}
                  label=""
                  isOpenToAll={openToAll.me}
                />
              </div>
              <div>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={openToAll.me}
                      onChange={() => handleOpenToAllToggle('me')}
                      className="sr-only"
                    />
                    <div className={`block w-10 h-5 rounded-full ${openToAll.me ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                    <div className={`dot absolute left-1 top-1 w-3 h-3 rounded-full transition ${openToAll.me ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                  </div>
                </label>
              </div>
              
              {/* FEMALE Slider Row */}
              <div className="text-xs font-semibold text-gray-400">FEMALE</div>
              <div className="relative">
                <SliderComponent
                  value={myGender.female}
                  onChange={(value) => handleSliderChange('myGender', 'female', value)}
                  label=""
                  isOpenToAll={openToAll.me}
                />
              </div>
              <div>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={openToAll.me}
                      onChange={() => handleOpenToAllToggle('me')}
                      className="sr-only"
                    />
                    <div className={`block w-10 h-5 rounded-full ${openToAll.me ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                    <div className={`dot absolute left-1 top-1 w-3 h-3 rounded-full transition ${openToAll.me ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                  </div>
                </label>
              </div>

              {/* IMPORTANCE Slider Row */}
              <div className="text-xs font-semibold text-gray-400">IMPORTANCE</div>
              <div className="relative">
                <SliderComponent
                  value={importance.me}
                  onChange={(value) => handleSliderChange('importance', 'me', value)}
                  label=""
                  isOpenToAll={false}
                />
              </div>
              <div className="w-10 h-5"></div>
              
            </div>
          </div>

          {/* Looking For Section */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-center mb-2" style={{ color: '#672DB7' }}>Looking For</h3>
            
            {/* LESS and MORE labels below Looking For header - aligned with slider start/end */}
            <div className="flex justify-between text-xs text-gray-500 mb-4" style={{ paddingLeft: '144px', paddingRight: '112px' }}>
              <span>LESS</span>
              <span>MORE</span>
            </div>
            
            {/* Grid container for perfect alignment */}
            <div className="grid grid-cols-[112px_500px_56px] gap-8 items-center">
              
              {/* MALE Slider Row */}
              <div className="text-xs font-semibold text-gray-400">MALE</div>
              <div className="relative">
                <SliderComponent
                  value={lookingFor.male}
                  onChange={(value) => handleSliderChange('lookingFor', 'male', value)}
                  label=""
                  isOpenToAll={openToAll.lookingFor}
                />
              </div>
              <div>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={openToAll.lookingFor}
                      onChange={() => handleOpenToAllToggle('lookingFor')}
                      className="sr-only"
                    />
                    <div className={`block w-10 h-5 rounded-full ${openToAll.lookingFor ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                    <div className={`dot absolute left-1 top-1 w-3 h-3 rounded-full transition ${openToAll.lookingFor ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                  </div>
                </label>
              </div>
              
              {/* FEMALE Slider Row */}
              <div className="text-xs font-semibold text-gray-400">FEMALE</div>
              <div className="relative">
                <SliderComponent
                  value={lookingFor.female}
                  onChange={(value) => handleSliderChange('lookingFor', 'female', value)}
                  label=""
                  isOpenToAll={openToAll.lookingFor}
                />
              </div>
              <div>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={openToAll.lookingFor}
                      onChange={() => handleOpenToAllToggle('lookingFor')}
                      className="sr-only"
                    />
                    <div className={`block w-10 h-5 rounded-full ${openToAll.lookingFor ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                    <div className={`dot absolute left-1 top-1 w-3 h-3 rounded-full transition ${openToAll.lookingFor ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                  </div>
                </label>
              </div>

              {/* IMPORTANCE Slider Row */}
              <div className="text-xs font-semibold text-gray-400">IMPORTANCE</div>
              <div className="relative">
                <SliderComponent
                  value={importance.lookingFor}
                  onChange={(value) => handleSliderChange('importance', 'lookingFor', value)}
                  label=""
                  isOpenToAll={false}
                />
              </div>
              <div className="w-10 h-5"></div>
              
            </div>
          </div>
        </div>

      </main>

      {/* Footer with Progress and Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        {/* Progress Bar */}
        <div className="w-full h-1 bg-gray-200">
          <div className="h-full bg-black" style={{ width: '25%' }}></div>
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
