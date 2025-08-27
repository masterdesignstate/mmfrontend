'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

export default function EthnicityPage() {
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

  const [selectedEthnicity, setSelectedEthnicity] = useState<string>('');
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState<string>('');

  // Hardcoded ethnicity options as shown in the image
  const ethnicityOptions = [
    { value: 'white', label: 'White', icon: '/assets/ethn.png' },
    { value: 'black', label: 'Black or African Descent', icon: '/assets/ethn.png' },
    { value: 'pacific_islander', label: 'Native Hawaiian or Other Pacific Islander', icon: '/assets/ethn.png' },
    { value: 'native_american', label: 'Native American', icon: '/assets/ethn.png' },
    { value: 'hispanic_latino', label: 'Hispanic/Latino', icon: '/assets/ethn.png' },
    { value: 'asian', label: 'Asian', icon: '/assets/ethn.png' }
  ];

  useEffect(() => {
    const userIdParam = searchParams.get('user_id');
    const questionsParam = searchParams.get('questions');
    const refreshParam = searchParams.get('refresh');
    
    console.log('🔍 Ethnicity Page Load - URL Params:', {
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
    
    if (questionsParam) {
      try {
        const parsedQuestions = JSON.parse(questionsParam);
        setQuestions(parsedQuestions);
        console.log('📋 Received questions from URL:', parsedQuestions);
        console.log('🔍 Ethnicity questions from URL:', parsedQuestions.filter((q: typeof questions[0]) => [7, 8, 9, 10, 11, 12].includes(q.question_number)));
      } catch (error) {
        console.error('❌ Error parsing questions from URL:', error);
      }
    } else {
      console.log('❌ No questions parameter found in URL');
    }

    // If refresh flag is present, force refresh of answered questions
    if (refreshParam === 'true' && userIdParam) {
      console.log('🔄 Refresh flag detected, forcing refresh of answered questions...');
      setTimeout(() => checkAnsweredQuestions(), 100); // Small delay to ensure userId is set
    }
  }, [searchParams]);

  // Fetch ethnicity questions from backend when userId is available (only once)
  useEffect(() => {
    const fetchEthnicityQuestions = async () => {
      // Only fetch if we have a userId and haven't fetched questions yet
      if (userId && questions.length === 0 && !loadingQuestions) {
        console.log('🚀 Starting to fetch ethnicity questions from backend...');
        setLoadingQuestions(true);
        try {
          const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=7&question_number=8&question_number=9&question_number=10&question_number=11&question_number=12`;
          console.log('🌐 Fetching from URL:', apiUrl);
          
          const response = await fetch(apiUrl);
          console.log('📡 Response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('📋 Raw API response:', data);
            setQuestions(data.results || []);
            console.log('📋 Set ethnicity questions to state:', data.results);
            console.log('🔍 Backend Ethnicity Question OTA settings:', (data.results || []).map((q: typeof questions[0]) => ({
              number: q.question_number,
              group: q.group_name,
              ota_me: q.open_to_all_me,
              ota_looking: q.open_to_all_looking_for
            })));
          } else {
            console.error('❌ Failed to fetch ethnicity questions from backend. Status:', response.status);
          }
        } catch (error: unknown) {
          console.error('❌ Error fetching ethnicity questions from backend:', error);
        } finally {
          setLoadingQuestions(false);
        }
      }
    };

    fetchEthnicityQuestions();
  }, [userId, questions.length, loadingQuestions]);

  // Check answered questions when userId is available
  useEffect(() => {
    if (userId) {
      checkAnsweredQuestions();
    }
  }, [userId]);

  // Check answered questions when page becomes visible (user returns from question page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userId) {
        console.log('🔄 Page became visible, checking answered questions...');
        checkAnsweredQuestions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userId]);

  const handleEthnicitySelect = (ethnicity: string) => {
    setSelectedEthnicity(ethnicity);
    
    // Find the index of the selected ethnicity to determine question number
    const ethnicityIndex = ethnicityOptions.findIndex(option => option.value === ethnicity);
    const questionNumber = 7 + ethnicityIndex; // Questions 7-12
    
    const params = new URLSearchParams({ 
      user_id: userId,
      ethnicity: ethnicity,
      question_number: questionNumber.toString()
    });
    
    // Navigate to the specific ethnicity question page
    router.push(`/auth/question/ethnicity?${params.toString()}`);
  };

  const handleNext = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    if (!questions || questions.length < 6) {
      setError('Questions not loaded properly');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if user has answered any ethnicity questions using the answeredQuestions state
      // which is already populated by checkAnsweredQuestions function
      console.log('🔍 Checking answered questions in handleNext:');
      console.log('📋 Questions loaded:', questions.length);
      console.log('📋 Answered questions set size:', answeredQuestions.size);
      console.log('📋 Answered questions:', Array.from(answeredQuestions));
      
      const answeredEthnicityQuestions = questions.filter(q => 
        [7, 8, 9, 10, 11, 12].includes(q.question_number) && answeredQuestions.has(q.id)
      );
      
      console.log('📋 Ethnicity questions (7-12):', questions.filter(q => [7, 8, 9, 10, 11, 12].includes(q.question_number)).map(q => ({ id: q.id, number: q.question_number })));
      console.log('📋 Answered ethnicity questions:', answeredEthnicityQuestions.map(q => ({ id: q.id, number: q.question_number })));
      
      // Removed strict validation - allow user to proceed regardless of answers
      console.log('✅ Proceeding to next page without strict validation');

      // Navigate to next onboarding step (education page)
      const params = new URLSearchParams({ 
        user_id: userId
      });
      router.push(`/auth/education?${params.toString()}`);
    } catch (error) {
      console.error('Error checking ethnicity answers:', error);
      setError('Failed to check ethnicity answers');
    } finally {
      setLoading(false);
    }
  };

  const checkAnsweredQuestions = async () => {
    if (!userId) return;
    
    console.log('🔍 checkAnsweredQuestions called for userId:', userId);
    
    try {
      const response = await fetch(`${getApiUrl(API_ENDPOINTS.ANSWERS)}?user_id=${userId}`);
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Raw answers data:', data);
        console.log('📋 Results count:', data.results?.length || 0);
        
        const answeredQuestionIds = new Set<string>(data.results?.map((answer: { question_id: string }) => answer.question_id) || []);
        console.log('📋 Answered question IDs:', Array.from(answeredQuestionIds));
        
        setAnsweredQuestions(answeredQuestionIds);
        console.log('📋 Updated answeredQuestions state');
      }
    } catch (error) {
      console.error('Error checking answered questions:', error);
    }
  };

  const handleBack = () => {
    const params = new URLSearchParams({ 
      user_id: userId
    });
    router.push(`/auth/gender?${params.toString()}`);
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
            <h1 className="text-3xl font-bold text-black mb-2">3. Ethnicity</h1>
            <p className="text-3xl font-bold text-black mb-12">
              What ethnicity do you identify with?
            </p>
          </div>



          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Ethnicity Options List */}
          <div className="space-y-3">
            {ethnicityOptions.map((option, index) => {
              const questionNumber = 7 + index; // Questions 7-12
              const question = questions.find(q => q.question_number === questionNumber);
              const isAnswered = question && answeredQuestions.has(question.id);
              
              return (
                <div
                  key={option.value}
                  onClick={() => handleEthnicitySelect(option.value)}
                  className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedEthnicity === option.value
                      ? 'border-black bg-gray-50'
                      : isAnswered
                      ? 'border-green-500 bg-green-50'
                      : 'border-black bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Image
                      src={option.icon}
                      alt="Ethnicity icon"
                      width={24}
                      height={24}
                      className="w-6 h-6"
                    />
                    <span className="text-black font-medium">{option.label}</span>
                    {isAnswered && (
                      <span className="text-green-600 text-sm">✓ Answered</span>
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
        {/* Progress Bar */}
        <div className="w-full h-1 bg-gray-200">
          <div className="h-full bg-black" style={{ width: '75%' }}></div>
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
