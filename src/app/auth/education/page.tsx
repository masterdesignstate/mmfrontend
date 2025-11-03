'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

export default function EducationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string>('');
  // Removed questions and dietQuestions state - using hardcoded data only

  const [selectedEducation, setSelectedEducation] = useState<string>('');
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [answeredEducations, setAnsweredEducations] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  // Removed loadingQuestions state - no longer fetching data
  const [error, setError] = useState<string>('');

  // Hardcoded education options matching the database question names exactly
  const educationOptions = [
    { value: 'Doctorate', label: 'Doctorate', icon: '/assets/edu.png' },
    { value: 'Masters', label: 'Masters', icon: '/assets/edu.png' },
    { value: 'Undergraduate', label: 'Undergraduate', icon: '/assets/edu.png' },
    { value: 'Trade', label: 'Trade', icon: '/assets/edu.png' },
    { value: 'High School', label: 'High School', icon: '/assets/edu.png' },
    { value: 'Pre High School', label: 'Pre High School', icon: '/assets/edu.png' }
  ];

  // Hardcoded question IDs from Django database (question_number=4)
  const questionIds = {
    'Pre High School': '345bab19-ed6a-4d25-a871-8e13331afc68',    // Group 1: Pre High School
    'High School': '4f5bbf05-00d1-4b75-b26d-d465ef51ddd6',        // Group 2: High School
    'Trade': '95bffb86-6872-47d0-8a32-418cc5a26e20',              // Group 3: Trade
    'Undergraduate': '60639d56-337e-46a0-83c7-cce8cb1676ef',      // Group 4: Undergraduate
    'Masters': 'cc55db09-a064-4cd3-b919-77bf0c4e53b7',            // Group 5: Masters
    'Doctorate': 'e1961280-0371-4319-81e6-0efc596b8d1d'           // Group 6: Doctorate
  };

  useEffect(() => {
    const userIdParam = searchParams.get('user_id');
    const questionsParam = searchParams.get('questions');
    const refreshParam = searchParams.get('refresh');
    const justAnsweredParam = searchParams.get('just_answered');
    
    console.log('🔍 Education Page Load - URL Params:', {
      userIdParam,
      questionsParam: questionsParam ? 'present' : 'missing',
      questionsParamLength: questionsParam?.length,
      refreshParam
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

    // If a question was just answered, immediately add it to the answered set for instant feedback
    if (justAnsweredParam) {
      console.log('✅ Question just answered:', justAnsweredParam);
      setAnsweredQuestions(prev => new Set([...prev, justAnsweredParam]));
    }

    // No need to sync with backend - we're using localStorage for immediate UI feedback
    // if (refreshParam === 'true' && userIdParam) {
    //   console.log('🔄 Refresh flag detected, syncing with backend in background...');
    //   checkAnsweredQuestions();
    // }
  }, [searchParams]);

  useEffect(() => {
    if (!userId) {
      return;
    }
    const answeredEducationsKey = `answeredEducations_${userId}`;
    const answeredEducationsData = localStorage.getItem(answeredEducationsKey);
    if (answeredEducationsData) {
      try {
        const parsed = JSON.parse(answeredEducationsData);
        setAnsweredEducations(new Set(parsed));
        console.log('📋 Loaded answered educations from localStorage:', parsed);
      } catch (error) {
        console.error('❌ Error parsing answered educations:', error);
      }
    } else {
      setAnsweredEducations(new Set());
    }
  }, [userId]);

  // Removed education questions fetching - using hardcoded data only

  // Removed diet questions fetching - not needed for education page

  // IMMEDIATELY load answered questions from localStorage for instant UI
  useEffect(() => {
    if (userId) {
      const answeredQuestionsKey = `answered_questions_${userId}`;
      const localAnswered = JSON.parse(localStorage.getItem(answeredQuestionsKey) || '[]');
      if (localAnswered.length > 0) {
        setAnsweredQuestions(new Set(localAnswered));
        console.log('⚡ Loaded answered questions from localStorage:', localAnswered);
      }
      // No need to check backend - we're using localStorage for immediate UI feedback
      // checkAnsweredQuestions();
    }
  }, [userId]);

  // Check answered questions when page becomes visible (user returns from question page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userId) {
        console.log('🔄 Page became visible, checking answered questions...');
        // No need to check backend - we're using localStorage for immediate UI feedback
        // checkAnsweredQuestions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userId]);

  const handleEducationSelect = (education: string) => {
    console.log('🎓 Education selected:', education);
    setSelectedEducation(education);
    
    // Navigate to single education question page with hardcoded data
    const params = new URLSearchParams({
      user_id: userId,
      education: education,
      question_number: '4' // Education questions are question_number=4
    });
    
    router.push(`/auth/question/education?${params.toString()}`);
  };

  const handleNext = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    // Removed questions validation - using hardcoded data only

    setLoading(true);
    setError('');

    try {
      // Check if user has answered any education questions using localStorage data
      console.log('🔍 Checking answered educations in handleNext:');
      console.log('📋 Answered educations set size:', answeredEducations.size);
      console.log('📋 Answered educations:', Array.from(answeredEducations));
      
      // Require at least 1 answered education question
      if (answeredEducations.size === 0) {
        console.log('❌ Validation failed: No answered education questions found');
        console.log('📋 Current answeredEducations state:', Array.from(answeredEducations));
        setError('Please answer at least one education question before proceeding.');
        return;
      }
      
      console.log('✅ User has answered', answeredEducations.size, 'education question(s), proceeding to next page');

      // Navigate to next onboarding step (diet page)
      const params = new URLSearchParams({ 
        user_id: userId
      });
      
      // No need to pass diet questions - diet page will handle its own fetching
      
      router.push(`/auth/diet?${params.toString()}`);
    } catch (error) {
      console.error('Error checking education answers:', error);
      setError('Failed to check education answers');
    } finally {
      setLoading(false);
    }
  };

  // No need for checkAnsweredQuestions function - we're using localStorage
  // const checkAnsweredQuestions = async () => {
  //   if (!userId) return;
  //   
  //   console.log('🔍 checkAnsweredQuestions called for userId:', userId);
  //   
  //   try {
  //     // Fetch ALL pages of answers (handle pagination)
  //     let allAnswers: any[] = [];
  //     let nextUrl: string | null = `${getApiUrl(API_ENDPOINTS.ANSWERS)}?user_id=${userId}&page_size=100`;
  //     
  //     while (nextUrl) {
  //       const response = await fetch(nextUrl);
  //       console.log('📡 Fetching answers page:', nextUrl);
  //       
  //       if (response.ok) {
  //         const data = await response.json();
  //         allAnswers = [...allAnswers, ...(data.results || [])];
  //         nextUrl = data.next;
  //       } else {
  //         nextUrl = null;
  //       }
  //     }
  //     
  //     console.log('📋 Total answers fetched:', allAnswers.length);
  //     
  //     // Extract question IDs - the 'question' field contains an object with an 'id' property
  //     const answeredQuestionIds = new Set<string>(
  //       allAnswers.map((answer: any) => {
  //         if (answer.question_id) {
  //           return answer.question_id;
  //         } else if (answer.question && typeof answer.question === 'object' && answer.question.id) {
  //           return answer.question.id;
  //         }
  //         return null;
  //       }).filter(id => id != null)
  //     );
  //     
  //     console.log('📋 Answered question IDs:', Array.from(answeredQuestionIds));
  //     
  //     // Merge with localStorage (localStorage takes precedence for recent answers)
  //     const answeredQuestionsKey = `answered_questions_${userId}`;
  //     const localAnswered = JSON.parse(localStorage.getItem(answeredQuestionsKey) || '[]');
  //     const mergedAnswered = new Set([...answeredQuestionIds, ...localAnswered]);
  //     
  //     setAnsweredQuestions(mergedAnswered);
  //     console.log('📋 Updated answeredQuestions state with', mergedAnswered.size, 'questions (backend:', answeredQuestionIds.size, '+ localStorage:', localAnswered.length, ')');
  //   } catch (error) {
  //     console.error('Error checking answered questions:', error);
  //   }
  // };

  const handleBack = () => {
    const params = new URLSearchParams({ 
      user_id: userId
    });
    router.push(`/auth/ethnicity?${params.toString()}`);
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
        <div className="w-full max-w-2xl">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">4. Education</h1>
            <p className="text-3xl font-bold text-black mb-12">
              What is your highest level of education?
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Removed loading indicator - no longer fetching data */}

          {/* Education Options List */}
          <div className="space-y-3">
            {/* Removed no questions found message - using hardcoded data */}
            
            {educationOptions.map((option) => {
              const isAnswered = answeredEducations.has(option.value);
              
              return (
                <div
                  key={option.value}
                  onClick={() => handleEducationSelect(option.value)}
                  className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedEducation === option.value
                      ? 'border-black bg-gray-50'
                      : isAnswered
                      ? 'border-[#672DB7] bg-purple-50'
                      : 'border-black bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Image
                      src="/assets/cpx.png"
                      alt="Education icon"
                      width={24}
                      height={24}
                      className="w-6 h-6"
                    />
                    <span className="text-black font-medium">{option.label}</span>
                    {isAnswered && (
                      <span className="text-[#672DB7] text-sm">✓ Answered</span>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer with Progress and Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        {/* Progress Bar - Only show in onboarding, not when from questions page */}
        {searchParams.get('from_questions_page') !== 'true' && (
          <div className="w-full h-1 bg-gray-200">
            <div className="h-full bg-black" style={{ width: '40%' }}></div>
          </div>
        )}

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
              searchParams.get('from_questions_page') === 'true' ? 'Save' : 'Next'
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
