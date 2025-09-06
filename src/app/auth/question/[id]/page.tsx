'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

export default function QuestionPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string>('');
  const [question, setQuestion] = useState<{
    id: string;
    question_name: string;
    question_number: number;
    group_name: string;
    text: string;
    answers: Array<{ value: string; answer_text: string }>;
    open_to_all_me: boolean;
    open_to_all_looking_for: boolean;
  } | null>(null);

  // Question answer states
  const [meAnswer, setMeAnswer] = useState(3);
  const [lookingForAnswer, setLookingForAnswer] = useState(3);
  const [importance, setImportance] = useState({
    me: 1,
    lookingFor: 3
  });
  const [openToAll, setOpenToAll] = useState({
    meOpen: false,
    lookingForOpen: false
  });

  const [loading, setLoading] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [error, setError] = useState<string>('');
  
  // For habits page (question 7) - 3 questions + importance
  const [habitsQuestions, setHabitsQuestions] = useState<Array<{
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
    const ethnicityParam = searchParams.get('ethnicity');
    const educationParam = searchParams.get('education');
    const dietParam = searchParams.get('diet');
    const nextQuestionParam = searchParams.get('next_question');
    const questionNumberParam = searchParams.get('question_number');
    const questionDataParam = searchParams.get('question_data');
    const questionId = params.id as string;
    
    console.log('🔍 Question Page Load - URL Params:', {
      userIdParam,
      ethnicityParam,
      educationParam,
      dietParam,
      nextQuestionParam,
      questionNumberParam,
      questionDataParam: questionDataParam ? 'present' : 'missing',
      questionId
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
    
    // Handle special case for ethnicity questions
    if (questionId === 'ethnicity' && ethnicityParam && questionNumberParam) {
      // Use passed question data if available, otherwise fetch
      if (questionDataParam) {
        try {
          const parsedQuestionData = JSON.parse(questionDataParam);
          console.log('📋 Using passed ethnicity question data:', parsedQuestionData);
          setQuestion(parsedQuestionData);
        } catch (error) {
          console.error('❌ Error parsing passed ethnicity question data:', error);
          fetchEthnicityQuestion(ethnicityParam, parseInt(questionNumberParam));
        }
      } else {
        fetchEthnicityQuestion(ethnicityParam, parseInt(questionNumberParam));
      }
    } else if (questionId === 'education' && educationParam && questionNumberParam) {
      // Use passed question data if available, otherwise fetch
      if (questionDataParam) {
        try {
          const parsedQuestionData = JSON.parse(questionDataParam);
          console.log('📋 Using passed question data:', parsedQuestionData);
          setQuestion(parsedQuestionData);
        } catch (error) {
          console.error('❌ Error parsing passed question data:', error);
          fetchEducationQuestion(educationParam, parseInt(questionNumberParam));
        }
      } else {
        fetchEducationQuestion(educationParam, parseInt(questionNumberParam));
      }
    } else if (questionId === 'diet' && dietParam && questionNumberParam) {
      // Use passed question data if available, otherwise fetch
      if (questionDataParam) {
        try {
          const parsedQuestionData = JSON.parse(questionDataParam);
          console.log('📋 Using passed diet question data:', parsedQuestionData);
          setQuestion(parsedQuestionData);
        } catch (error) {
          console.error('❌ Error parsing passed diet question data:', error);
          fetchDietQuestion(dietParam, parseInt(questionNumberParam));
        }
      } else {
        fetchDietQuestion(dietParam, parseInt(questionNumberParam));
      }
    } else if (questionId === 'next-question' && nextQuestionParam && questionNumberParam) {
      // Use passed question data if available, otherwise fetch
      if (questionDataParam) {
        try {
          const parsedQuestionData = JSON.parse(questionDataParam);
          console.log('📋 Using passed next question data:', parsedQuestionData);
          setQuestion(parsedQuestionData);
        } catch (error) {
          console.error('❌ Error parsing passed next question data:', error);
          fetchNextQuestion(nextQuestionParam, parseInt(questionNumberParam));
        }
      } else {
        fetchNextQuestion(nextQuestionParam, parseInt(questionNumberParam));
      }
    } else if (questionId && questionId !== 'ethnicity' && questionId !== 'education' && questionId !== 'diet' && questionId !== 'next-question') {
      // Fetch the specific question by ID
      fetchQuestion(questionId);
    }
  }, [params.id, searchParams]);

  // Fetch habits questions in background when userId is available
  useEffect(() => {
    if (userId) {
      fetchHabitsQuestions();
    }
  }, [userId]);

  const fetchQuestion = async (questionId: string) => {
    console.log('🚀 Fetching question:', questionId);
    setLoadingQuestion(true);
    try {
      const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}${questionId}/`;
      console.log('🌐 Fetching from URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Question data:', data);
        setQuestion(data);
      } else {
        console.error('❌ Failed to fetch question. Status:', response.status);
        setError('Failed to load question');
      }
    } catch (error: unknown) {
      console.error('❌ Error fetching question:', error);
      setError('Failed to load question');
    } finally {
      setLoadingQuestion(false);
    }
  };

  const fetchEthnicityQuestion = async (ethnicity: string, questionNumber: number) => {
    console.log('🚀 Fetching ethnicity question for:', ethnicity, 'question number:', questionNumber);
    setLoadingQuestion(true);
    try {
      // Fetch all ethnicity questions and find the specific one
      const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=${questionNumber}`;
      console.log('🌐 Fetching from URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Ethnicity question data:', data);
        if (data.results && data.results.length > 0) {
          // Find the specific ethnicity question by matching the ethnicity name exactly
          const specificQuestion = data.results.find((q: any) => 
            q.question_name === ethnicity
          );
          
          if (specificQuestion) {
            setQuestion(specificQuestion);
            console.log('✅ Found specific ethnicity question:', specificQuestion.question_name);
          } else {
            console.error('❌ No matching ethnicity question found for:', ethnicity);
            setError(`No ethnicity question found for ${ethnicity}`);
          }
        } else {
          setError(`No ethnicity question ${questionNumber} found`);
        }
      } else {
        console.error('❌ Failed to fetch ethnicity question. Status:', response.status);
        setError('Failed to load ethnicity question');
      }
    } catch (error: unknown) {
      console.error('❌ Error fetching ethnicity question:', error);
      setError('Failed to load ethnicity question');
    } finally {
      setLoadingQuestion(false);
    }
  };

  const fetchEducationQuestion = async (education: string, questionNumber: number) => {
    console.log('🚀 Fetching education question for:', education, 'question number:', questionNumber);
    setLoadingQuestion(true);
    try {
      // Fetch all education questions and find the specific one
      const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=${questionNumber}`;
      console.log('🌐 Fetching from URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Education question data:', data);
        if (data.results && data.results.length > 0) {
          // Find the specific education question by matching the education name exactly
          const specificQuestion = data.results.find((q: any) => 
            q.question_name === education
          );
          
          if (specificQuestion) {
            setQuestion(specificQuestion);
            console.log('✅ Found specific education question:', specificQuestion.question_name);
          } else {
            console.error('❌ No matching education question found for:', education);
            setError(`No education question found for ${education}`);
          }
        } else {
          setError(`No education question ${questionNumber} found`);
        }
      } else {
        console.error('❌ Failed to fetch education question. Status:', response.status);
        setError('Failed to load education question');
      }
    } catch (error: unknown) {
      console.error('❌ Error fetching education question:', error);
      setError('Failed to load education question');
    } finally {
      setLoadingQuestion(false);
    }
  };

  const fetchDietQuestion = async (diet: string, questionNumber: number) => {
    console.log('🚀 Fetching diet question for:', diet, 'question number:', questionNumber);
    setLoadingQuestion(true);
    try {
      // Fetch all diet questions and find the specific one
      const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=${questionNumber}`;
      console.log('🌐 Fetching from URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Diet question data:', data);
        if (data.results && data.results.length > 0) {
          // Find the specific diet question by matching the diet name exactly
          const specificQuestion = data.results.find((q: any) => 
            q.question_name === diet
          );
          
          if (specificQuestion) {
            setQuestion(specificQuestion);
            console.log('✅ Found specific diet question:', specificQuestion.question_name);
          } else {
            console.error('❌ No matching diet question found for:', diet);
            setError(`No diet question found for ${diet}`);
          }
        } else {
          setError(`No diet question ${questionNumber} found`);
        }
      } else {
        console.error('❌ Failed to fetch diet question. Status:', response.status);
        setError('Failed to load diet question');
      }
    } catch (error: unknown) {
      console.error('❌ Error fetching diet question:', error);
      setError('Failed to load diet question');
    } finally {
      setLoadingQuestion(false);
    }
  };

  const fetchNextQuestion = async (nextQuestion: string, questionNumber: number) => {
    console.log('🚀 Fetching next question for:', nextQuestion, 'question number:', questionNumber);
    setLoadingQuestion(true);
    try {
      // Fetch all next questions and find the specific one
      const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=${questionNumber}`;
      console.log('🌐 Fetching from URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Next question data:', data);
        if (data.results && data.results.length > 0) {
          // Find the specific next question by matching the question name exactly
          const specificQuestion = data.results.find((q: any) => 
            q.question_name === nextQuestion
          );
          
          if (specificQuestion) {
            setQuestion(specificQuestion);
            console.log('✅ Found specific next question:', specificQuestion.question_name);
          } else {
            console.error('❌ No matching next question found for:', nextQuestion);
            setError(`No next question found for ${nextQuestion}`);
          }
        } else {
          setError(`No next question ${questionNumber} found`);
        }
      } else {
        console.error('❌ Failed to fetch next question. Status:', response.status);
        setError('Failed to load next question');
      }
    } catch (error: unknown) {
      console.error('❌ Error fetching next question:', error);
      setError('Failed to load next question');
    } finally {
      setLoadingQuestion(false);
    }
  };

  const fetchHabitsQuestions = async () => {
    // Fetch habits questions in the background
    if (userId && habitsQuestions.length === 0) {
      try {
        const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=7`;
        const response = await fetch(apiUrl);
        
        if (response.ok) {
          const data = await response.json();
          
          // Sort questions by group_number
          const sortedHabitsQuestions = (data.results || []).sort((a: typeof habitsQuestions[0], b: typeof habitsQuestions[0]) => {
            const groupA = a.group_number || 0;
            const groupB = b.group_number || 0;
            return groupA - groupB;
          });
          
          setHabitsQuestions(sortedHabitsQuestions);
        }
      } catch (error: unknown) {
        // Silently fail - habits page will fetch normally if needed
      }
    }
  };

  const handleSliderChange = (section: 'meAnswer' | 'lookingForAnswer' | 'importance', value: number) => {
    if (section === 'meAnswer') {
      setMeAnswer(value);
    } else if (section === 'lookingForAnswer') {
      setLookingForAnswer(value);
    } else if (section === 'importance') {
      // For importance, we need to know which section (me or lookingFor)
      // This will be handled by the individual importance sliders
    }
  };

  const handleOpenToAllToggle = (switchType: 'meOpen' | 'lookingForOpen') => {
    setOpenToAll(prev => ({ ...prev, [switchType]: !prev[switchType] }));
  };

  const handleNext = async () => {
    if (!userId || !question) {
      setError('User ID and question are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Prepare user answer
      const userAnswer = {
        user_id: userId,
        question_id: question.id,
        me_answer: openToAll.meOpen ? 6 : meAnswer,
        me_open_to_all: openToAll.meOpen,
        me_importance: importance.me,
        me_share: true,
        looking_for_answer: openToAll.lookingForOpen ? 6 : lookingForAnswer,
        looking_for_open_to_all: openToAll.lookingForOpen,
        looking_for_importance: importance.lookingFor,
        looking_for_share: true
      };

      // Save user answer
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

      // For ethnicity questions, go back to ethnicity page; for education questions, go back to education page; for diet questions, go back to diet page; for next questions, go back to next question page; otherwise go to dashboard
      if (params.id === 'ethnicity') {
        const params = new URLSearchParams({ 
          user_id: userId,
          refresh: 'true' // Add refresh flag
        });
        router.push(`/auth/ethnicity?${params.toString()}`);
      } else if (params.id === 'education') {
        const params = new URLSearchParams({ 
          user_id: userId,
          refresh: 'true' // Add refresh flag
        });
        router.push(`/auth/education?${params.toString()}`);
      } else if (params.id === 'diet') {
        const params = new URLSearchParams({ 
          user_id: userId,
          refresh: 'true' // Add refresh flag
        });
        router.push(`/auth/diet?${params.toString()}`);
      } else if (params.id === 'next-question') {
        const params = new URLSearchParams({ 
          user_id: userId
        });
        
        // If we have habits questions loaded, pass them to avoid re-fetching
        if (habitsQuestions.length > 0) {
          params.set('questions', JSON.stringify(habitsQuestions));
          console.log('📋 Passing pre-loaded habits questions to habits page');
        }
        
        router.push(`/auth/habits?${params.toString()}`);
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error saving question answer:', error);
      setError(error instanceof Error ? error.message : 'Failed to save answer');
    } finally {
      setLoading(false);
    }
  };

  const formatEthnicityLabel = (ethnicity: string | null): string => {
    if (!ethnicity) return 'ANSWER';
    
    const labels: { [key: string]: string } = {
      'white': 'WHITE',
      'black': 'BLACK',
      'pacific_islander': 'PACIFIC ISLANDER',
      'native_american': 'NATIVE AMERICAN',
      'hispanic_latino': 'HISPANIC/LATINO',
      'asian': 'ASIAN'
    };
    
    return labels[ethnicity] || ethnicity.toUpperCase();
  };

  const handleBack = () => {
    const urlParams = new URLSearchParams({ 
      user_id: userId
    });
    
    if (params.id === 'next-question') {
      router.push(`/auth/next-question?${urlParams.toString()}`);
    } else if (params.id === 'diet') {
      router.push(`/auth/diet?${urlParams.toString()}`);
    } else if (params.id === 'education') {
      router.push(`/auth/education?${urlParams.toString()}`);
    } else {
      router.push(`/auth/ethnicity?${urlParams.toString()}`);
    }
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

  if (loadingQuestion) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#672DB7] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading question...</p>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Question not found</p>
        </div>
      </div>
    );
  }

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
              {params.id === 'ethnicity' ? `${question?.question_number || 3}. Ethnicity` : 
               params.id === 'education' ? `${question?.question_number || 4}. Education` :
               params.id === 'diet' ? `${question?.question_number || 5}. Diet` :
               params.id === 'next-question' ? `${question?.question_number || 6}. ${question?.question_name || 'Next Question'}` :
               `${question?.question_number}. ${question?.group_name}`}
            </h1>
            <p className="text-3xl font-bold text-black mb-12">
              {question?.text || 'What ethnicity do you identify with?'}
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
              <div className="flex justify-between text-xs text-gray-500 relative">
                <span>{params.id === 'diet' ? 'NO' : params.id === 'education' ? 'NONE' : 'LESS'}</span>
                {params.id === 'education' && (
                  <span className="absolute left-1/2 transform -translate-x-1/2">SOME</span>
                )}
                <span>{params.id === 'diet' ? 'YES' : params.id === 'education' ? 'COMPLETED' : 'MORE'}</span>
              </div>
              <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
                {question?.open_to_all_looking_for ? 'OTA' : ''}
              </div>
            </div>
            
            {/* Grid container for perfect alignment */}
            <div className="grid items-center justify-center mx-auto max-w-fit" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
              
              {/* Question Slider Row */}
              <div className="text-xs font-semibold text-gray-400">
                {params.id === 'ethnicity' ? formatEthnicityLabel(searchParams.get('ethnicity')) : (question?.question_name || 'ANSWER').toUpperCase()}
              </div>
              <div className="relative">
                <SliderComponent
                  value={lookingForAnswer}
                  onChange={(value) => handleSliderChange('lookingForAnswer', value)}
                  isOpenToAll={openToAll.lookingForOpen}
                />
              </div>
              <div>
                {/* Only show switch if question has open_to_all_looking_for enabled */}
                {question.open_to_all_looking_for ? (
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={openToAll.lookingForOpen}
                        onChange={() => handleOpenToAllToggle('lookingForOpen')}
                        className="sr-only"
                      />
                      <div className={`block w-11 h-6 rounded-full ${openToAll.lookingForOpen ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                      <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll.lookingForOpen ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
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
                  onChange={(value) => setImportance(prev => ({ ...prev, lookingFor: value }))}
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
              <div className="flex justify-between text-xs text-gray-500 relative">
                <span>{params.id === 'diet' ? 'NO' : params.id === 'education' ? 'NONE' : 'LESS'}</span>
                {params.id === 'education' && (
                  <span className="absolute left-1/2 transform -translate-x-1/2">SOME</span>
                )}
                <span>{params.id === 'diet' ? 'YES' : params.id === 'education' ? 'COMPLETED' : 'MORE'}</span>
              </div>
              <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
                {question?.open_to_all_me ? 'OTA' : ''}
              </div>
            </div>
            
            {/* Grid container for perfect alignment */}
            <div className="grid items-center justify-center mx-auto max-w-fit" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
              
              {/* Question Slider Row */}
              <div className="text-xs font-semibold text-gray-400">
                {params.id === 'ethnicity' ? formatEthnicityLabel(searchParams.get('ethnicity')) : (question?.question_name || 'ANSWER').toUpperCase()}
              </div>
              <div className="relative">
                <SliderComponent
                  value={meAnswer}
                  onChange={(value) => handleSliderChange('meAnswer', value)}
                  isOpenToAll={openToAll.meOpen}
                />
              </div>
              <div>
                {/* Only show switch if question has open_to_all_me enabled */}
                {question.open_to_all_me ? (
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={openToAll.meOpen}
                        onChange={() => handleOpenToAllToggle('meOpen')}
                        className="sr-only"
                      />
                      <div className={`block w-11 h-6 rounded-full ${openToAll.meOpen ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                      <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll.meOpen ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
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
