'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '../../../config/api';

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
  }>>([]);

  // Relationship preference states
  const [myAnswers, setMyAnswers] = useState({
    q3: 3,
    q4: 3,
    q5: 3,
    q6: 3
  });

  const [importance, setImportance] = useState({
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

  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const userIdParam = searchParams.get('user_id');
    const questionsParam = searchParams.get('questions');
    
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
    
    if (questionsParam) {
      try {
        const parsedQuestions = JSON.parse(questionsParam);
        setQuestions(parsedQuestions);
      } catch (error) {
        console.error('Error parsing questions from URL:', error);
      }
    }
  }, [searchParams]);

  // Fetch questions from backend if not loaded from URL params
  useEffect(() => {
    const fetchQuestionsIfNeeded = async () => {
      if (userId && questions.length === 0 && !loadingQuestions) {
        setLoadingQuestions(true);
        try {
          const response = await fetch(getApiUrl(API_ENDPOINTS.QUESTIONS) + '?question_number=3&question_number=4&question_number=5&question_number=6');
          if (response.ok) {
            const data = await response.json();
            setQuestions(data.results || data);
          } else {
            setError('Failed to fetch questions');
          }
        } catch (error) {
          setError('Error fetching questions');
        } finally {
          setLoadingQuestions(false);
        }
      }
    };

    fetchQuestionsIfNeeded();
  }, [userId, questions.length, loadingQuestions]);

  const handleSliderChange = (type: string, key: string, value: number) => {
    if (type === 'myAnswers') {
      setMyAnswers(prev => ({ ...prev, [key]: value }));
    } else if (type === 'importance') {
      setImportance(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleOpenToAllToggle = (key: string) => {
    setOpenToAll(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBack = () => {
    // Pass questions back to gender page
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    if (questions.length > 0) params.append('questions', JSON.stringify(questions));
    router.push(`/auth/gender?${params.toString()}`);
  };

  const handleNext = async () => {
    if (!userId) {
      setError('User ID not found');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create user answers for questions 3-6
      const userAnswers = questions.map(question => ({
        user_id: userId,
        question_id: question.id,
        me_answer: openToAll[`q${question.question_number}` as keyof typeof openToAll] ? 6 : myAnswers[`q${question.question_number}` as keyof typeof myAnswers],
        me_open_to_all: openToAll[`q${question.question_number}` as keyof typeof openToAll],
        me_importance: importance[`q${question.question_number}` as keyof typeof importance],
        me_share: true,
        looking_for_answer: 1, // Not applicable for relationship questions
        looking_for_open_to_all: false, // Not applicable for relationship questions
        looking_for_importance: 1, // Not applicable for relationship questions
        looking_for_share: true
      }));

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
          throw new Error(`Failed to save answer for question ${userAnswer.question_id}`);
        }
      }

      // Navigate to dashboard
      router.push('/dashboard');
    } catch (error) {
      setError(`Error saving relationship preferences: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Slider Component (same as gender page)
  const SliderComponent = ({ 
    value, 
    onChange, 
    label, 
    isOpenToAll 
  }: { 
    value: number; 
    onChange: (value: number) => void; 
    label: string; 
    isOpenToAll: boolean; 
  }) => {
    const fillWidth = isOpenToAll ? '100%' : `${((value - 1) / 4) * 100}%`;

    const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isOpenToAll) return;
      
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newValue = Math.round(percentage * 4) + 1;
      const clampedValue = Math.max(1, Math.min(5, newValue));
      onChange(clampedValue);
    };

    const handleSliderDrag = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isOpenToAll) return;
      
      const rect = e.currentTarget.getBoundingClientRect();
      const dragX = e.clientX - rect.left;
      const percentage = dragX / rect.width;
      const newValue = Math.round(percentage * 4) + 1;
      const clampedValue = Math.max(1, Math.min(5, newValue));
      onChange(clampedValue);
    };

    const handleMouseDown = () => {
      document.body.style.userSelect = 'none';
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
              
              {/* Question 3 Slider Row */}
              <div className="text-xs font-semibold text-gray-400">{questions.find(q => q.question_number === 3)?.question_name?.toUpperCase() || 'Q3'}</div>
              <div className="relative">
                <SliderComponent
                  value={myAnswers.q3}
                  onChange={(value) => handleSliderChange('myAnswers', 'q3', value)}
                  label=""
                  isOpenToAll={openToAll.q3}
                />
              </div>
              <div>
                {/* Only show switch if question 3 has open_to_all_me enabled */}
                {questions.find(q => q.question_number === 3)?.open_to_all_me ? (
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={openToAll.q3}
                        onChange={() => handleOpenToAllToggle('q3')}
                        className="sr-only"
                      />
                      <div className={`block w-11 h-6 rounded-full ${openToAll.q3 ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                      <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll.q3 ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                    </div>
                  </label>
                ) : (
                  <div className="w-11 h-6"></div> // Empty placeholder to maintain grid alignment
                )}
              </div>
              
              {/* Question 4 Slider Row */}
              <div className="text-xs font-semibold text-gray-400">{questions.find(q => q.question_number === 4)?.question_name?.toUpperCase() || 'Q4'}</div>
              <div className="relative">
                <SliderComponent
                  value={myAnswers.q4}
                  onChange={(value) => handleSliderChange('myAnswers', 'q4', value)}
                  label=""
                  isOpenToAll={openToAll.q4}
                />
              </div>
              <div>
                {/* Only show switch if question 4 has open_to_all_me enabled */}
                {questions.find(q => q.question_number === 4)?.open_to_all_me ? (
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={openToAll.q4}
                        onChange={() => handleOpenToAllToggle('q4')}
                        className="sr-only"
                      />
                      <div className={`block w-11 h-6 rounded-full ${openToAll.q4 ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                      <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll.q4 ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                    </div>
                  </label>
                ) : (
                  <div className="w-11 h-6"></div> // Empty placeholder to maintain grid alignment
                )}
              </div>

              {/* Question 5 Slider Row */}
              <div className="text-xs font-semibold text-gray-400">{questions.find(q => q.question_number === 5)?.question_name?.toUpperCase() || 'Q5'}</div>
              <div className="relative">
                <SliderComponent
                  value={myAnswers.q5}
                  onChange={(value) => handleSliderChange('myAnswers', 'q5', value)}
                  label=""
                  isOpenToAll={openToAll.q5}
                />
              </div>
              <div>
                {/* Only show switch if question 5 has open_to_all_me enabled */}
                {questions.find(q => q.question_number === 5)?.open_to_all_me ? (
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={openToAll.q5}
                        onChange={() => handleOpenToAllToggle('q5')}
                        className="sr-only"
                      />
                      <div className={`block w-11 h-6 rounded-full ${openToAll.q5 ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                      <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll.q5 ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                    </div>
                  </label>
                ) : (
                  <div className="w-11 h-6"></div> // Empty placeholder to maintain grid alignment
                )}
              </div>

              {/* Question 6 Slider Row */}
              <div className="text-xs font-semibold text-gray-400">{questions.find(q => q.question_number === 6)?.question_name?.toUpperCase() || 'Q6'}</div>
              <div className="relative">
                <SliderComponent
                  value={myAnswers.q6}
                  onChange={(value) => handleSliderChange('myAnswers', 'q6', value)}
                  label=""
                  isOpenToAll={openToAll.q6}
                />
              </div>
              <div>
                {/* Only show switch if question 6 has open_to_all_me enabled */}
                {questions.find(q => q.question_number === 6)?.open_to_all_me ? (
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={openToAll.q6}
                        onChange={() => handleOpenToAllToggle('q6')}
                        className="sr-only"
                      />
                      <div className={`block w-11 h-6 rounded-full ${openToAll.q6 ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                      <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll.q6 ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
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
                  value={importance.q3}
                  onChange={(value) => handleSliderChange('importance', 'q3', value)}
                  label=""
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
