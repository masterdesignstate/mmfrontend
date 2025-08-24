'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getApiUrl, API_ENDPOINTS } from '../../../config/api';

// Define the Question type to match what we expect from the API
type Question = {
  id: string;
  question_number: number;
  group_name: string;
  text: string;
  open_to_all_me: boolean;
  open_to_all_looking_for: boolean;
};

// Custom Slider Component
const SliderComponent = ({ value, onChange, label, isOpenToAll }: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  isOpenToAll: boolean;
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isOpenToAll) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newValue = Math.round(percentage * 4) + 1;
    onChange(Math.max(1, Math.min(5, newValue)));
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="relative w-full">
      {/* Slider Track */}
      <div 
        className={`relative h-5 rounded-full cursor-pointer ${
          isOpenToAll ? 'bg-purple-200' : 'bg-gray-200'
        }`}
        style={{ width: '500px' }}
        onClick={handleSliderClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {/* Filled Track */}
        <div 
          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-200 ${
            isOpenToAll ? 'bg-purple-400' : 'bg-gray-400'
          }`}
          style={{ 
            width: isOpenToAll ? '100%' : `${((value - 1) / 4) * 100}%`
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
    </div>
  );
};

export default function RelationshipPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [userId, setUserId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // State for relationship answers (questions 3,4,5,6 - only "me" answers)
  const [relationshipAnswers, setRelationshipAnswers] = useState({
    3: 3, // Question 3 default value
    4: 3, // Question 4 default value  
    5: 3, // Question 5 default value
    6: 3  // Question 6 default value
  });
  
  // State for importance
  const [importance, setImportance] = useState({
    me: 3
  });

  // State for open to all switches (only for questions that have it enabled)
  const [openToAll, setOpenToAll] = useState({
    q3Open: false,
    q4Open: false,
    q5Open: false,
    q6Open: false
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
        console.log('🔍 Relationship Questions (3-6):', parsedQuestions.filter(q => [3,4,5,6].includes(q.question_number)));
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
        } catch (error) {
          console.error('❌ Error fetching questions from backend:', error);
        } finally {
          setLoadingQuestions(false);
        }
      }
    };

    fetchQuestionsIfNeeded();
  }, [userId, questions.length]);

  const handleSliderChange = (questionNumber: number, value: number) => {
    if (questionNumber === 'importance') {
      setImportance(prev => ({ ...prev, me: value }));
    } else {
      setRelationshipAnswers(prev => ({ ...prev, [questionNumber]: value }));
    }
  };

  const handleOpenToAllToggle = (switchType: 'q3Open' | 'q4Open' | 'q5Open' | 'q6Open') => {
    setOpenToAll(prev => ({ ...prev, [switchType]: !prev[switchType] }));
  };

  const handleNext = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    if (!questions || questions.length === 0) {
      setError('Questions not loaded properly');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Find questions 3,4,5,6
      const relationshipQuestions = questions.filter(q => [3,4,5,6].includes(q.question_number));

      if (relationshipQuestions.length === 0) {
        setError('Relationship questions not found');
        return;
      }

      // Prepare user answers for relationship questions
      const userAnswers = [];

      for (const question of relationshipQuestions) {
        const questionNum = question.question_number;
        const openToAllKey = `q${questionNum}Open` as keyof typeof openToAll;
        
        userAnswers.push({
          user_id: userId,
          question_id: question.id,
          me_answer: openToAll[openToAllKey] ? 6 : relationshipAnswers[questionNum],
          me_open_to_all: openToAll[openToAllKey],
          me_importance: importance.me,
          me_share: true,
          looking_for_answer: 3, // Default since these don't have looking_for
          looking_for_open_to_all: false,
          looking_for_importance: 1,
          looking_for_share: false
        });
      }

      // Save each user answer
      for (const userAnswer of userAnswers) {
        const response = await fetch('/api/answers/', {
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

      // Navigate to next step in onboarding
      router.push('/dashboard');
    } catch (error) {
      console.error('Error saving relationship preferences:', error);
      setError(error.message || 'Failed to save relationship preferences');
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

  // Filter relationship questions (3,4,5,6)
  const relationshipQuestions = questions.filter(q => [3,4,5,6].includes(q.question_number));

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="text-center py-8">
        <h1 className="text-4xl font-bold text-black mb-2">2. Relationship</h1>
        <div className="w-16 h-1 bg-black mx-auto mb-4"></div>
        <div className="max-w-md mx-auto">
          <p className="text-lg text-gray-700 leading-relaxed">
            What relationship are you looking for?
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 pb-24">
        <div className="max-w-4xl mx-auto">

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

          {/* Me Section - Only section for relationship questions */}
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
              
              {/* Render relationship questions (3,4,5,6) */}
              {relationshipQuestions.map((question) => (
                <div key={question.id} className="contents">
                  {/* Question Label */}
                  <div className="text-xs font-semibold text-gray-400">{question.group_name?.toUpperCase()}</div>
                  <div className="relative">
                    <SliderComponent
                      value={relationshipAnswers[question.question_number]}
                      onChange={(value) => handleSliderChange(question.question_number, value)}
                      label=""
                      isOpenToAll={openToAll[`q${question.question_number}Open` as keyof typeof openToAll]}
                    />
                  </div>
                  <div>
                    {/* Only show switch if question has open_to_all_me enabled */}
                    {question.open_to_all_me ? (
                      <label className="flex items-center cursor-pointer">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={openToAll[`q${question.question_number}Open` as keyof typeof openToAll]}
                            onChange={() => handleOpenToAllToggle(`q${question.question_number}Open` as 'q3Open' | 'q4Open' | 'q5Open' | 'q6Open')}
                            className="sr-only"
                          />
                          <div className={`block w-11 h-6 rounded-full ${openToAll[`q${question.question_number}Open` as keyof typeof openToAll] ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                          <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll[`q${question.question_number}Open` as keyof typeof openToAll] ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                        </div>
                      </label>
                    ) : (
                      <div className="w-11 h-6"></div> // Empty placeholder to maintain grid alignment
                    )}
                  </div>
                </div>
              ))}

              {/* IMPORTANCE Slider Row */}
              <div className="text-xs font-semibold text-gray-400">IMPORTANCE</div>
              <div className="relative">
                <SliderComponent
                  value={importance.me}
                  onChange={(value) => handleSliderChange('importance', value)}
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
        <div className="max-w-md mx-auto px-6 py-4">
          {/* Progress Bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <div className="w-3 h-3 rounded-full bg-gray-300"></div>
              <div className="w-3 h-3 rounded-full bg-gray-300"></div>
            </div>
            <span className="text-sm text-gray-500">2 of 4</span>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between space-x-4">
            <button
              onClick={handleBack}
              className="flex-1 py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={loading}
              className="flex-1 py-3 px-6 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Next'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
