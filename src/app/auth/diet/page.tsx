'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

export default function DietPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string>('');
  // Removed questions and nextQuestions state - using hardcoded data only

  const [selectedDiet, setSelectedDiet] = useState<string>('');
  const [answeredDiets, setAnsweredDiets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  // Removed loadingQuestions state - no longer fetching data
  const [error, setError] = useState<string>('');
  // Hardcoded diet options matching the database question names exactly
  const dietOptions = [
    { value: 'Vegan', label: 'Vegan', icon: '/assets/diet.png' },
    { value: 'Vegetarian', label: 'Vegetarian', icon: '/assets/diet.png' },
    { value: 'Pescatarian', label: 'Pescatarian', icon: '/assets/diet.png' },
    { value: 'Omnivore', label: 'Omnivore', icon: '/assets/diet.png' }
  ];

  // Hardcoded question IDs from Django database (question_number=5)
  const questionIds = {
    'Omnivore': '88c5d527-5b04-4227-8b94-e2e8537c5ad1',        // Group 1: Omnivore
    'Pescatarian': 'f0634c01-0941-4ae6-bfa8-24268b40d7f0',     // Group 2: Pescatarian
    'Vegetarian': 'cbb8c995-a0f2-4311-af82-daff06435e84',       // Group 3: Vegetarian
    'Vegan': '5dde9565-3ee5-4910-837c-ee92212db90a'             // Group 4: Vegan
  };

  useEffect(() => {
    const userIdParam = searchParams.get('user_id');
    const questionsParam = searchParams.get('questions');
    const refreshParam = searchParams.get('refresh');
    const justAnsweredParam = searchParams.get('just_answered');
    
    console.log('🔍 Diet Page Load - URL Params:', {
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

    // Check for answered diets in localStorage for immediate UI feedback
    const answeredDietsData = localStorage.getItem('answeredDiets');
    if (answeredDietsData) {
      try {
        const parsed = JSON.parse(answeredDietsData);
        setAnsweredDiets(new Set(parsed));
        console.log('📋 Loaded answered diets from localStorage:', parsed);
      } catch (error) {
        console.error('❌ Error parsing answered diets:', error);
      }
    }

    // No need to sync with backend - we're using localStorage for immediate UI feedback
    // if (refreshParam === 'true' && userIdParam) {
    //   console.log('🔄 Refresh flag detected, syncing with backend in background...');
    //   checkAnsweredQuestions();
    // }
  }, [searchParams]);

  // Removed diet questions fetching - using hardcoded data only

  // Removed next questions fetching - not needed for diet page

  // IMMEDIATELY load answered diets from localStorage for instant UI
  useEffect(() => {
    if (userId) {
      const answeredDietsData = localStorage.getItem('answeredDiets');
      if (answeredDietsData) {
        try {
          const parsed = JSON.parse(answeredDietsData);
          setAnsweredDiets(new Set(parsed));
          console.log('⚡ Loaded answered diets from localStorage:', parsed);
        } catch (error) {
          console.error('❌ Error parsing answered diets:', error);
        }
      }
      // No need to check backend - we're using localStorage for immediate UI feedback
    }
  }, [userId]);

  // Removed next questions useEffect - not needed for diet page

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

  const handleDietSelect = (diet: string) => {
    console.log('🥗 Diet selected:', diet);
    setSelectedDiet(diet);
    
    // Navigate to single diet question page with hardcoded data
    const params = new URLSearchParams({
      user_id: userId,
      diet: diet,
      question_number: '5' // Diet questions are question_number=5
    });
    
    router.push(`/auth/question/diet?${params.toString()}`);
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
      // Check if user has answered any diet questions using localStorage data
      console.log('🔍 Checking answered diet questions in handleNext:');
      console.log('📋 Answered diet questions set size:', answeredDiets.size);
      console.log('📋 Answered diet questions:', Array.from(answeredDiets));
      
      // Require at least 1 answered diet question
      if (answeredDiets.size === 0) {
        setError('Please answer at least one diet question before proceeding.');
        return;
      }
      
      console.log('✅ User has answered', answeredDiets.size, 'diet question(s), proceeding to next page');

      // Navigate to next onboarding step (exercise question page)
      const params = new URLSearchParams({ 
        user_id: userId
      });
      
      router.push(`/auth/question/6?${params.toString()}`);
    } catch (error) {
      console.error('Error checking diet answers:', error);
      setError('Failed to check diet answers');
    } finally {
      setLoading(false);
    }
  };

  // Removed checkAnsweredQuestions function - using localStorage only

  const handleBack = () => {
    const params = new URLSearchParams({ 
      user_id: userId
    });
    router.push(`/auth/education?${params.toString()}`);
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
            <h1 className="text-3xl font-bold text-black mb-2">5. Diet</h1>
            <p className="text-3xl font-bold text-black mb-12">
              Which diet best describes you?
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Removed loading indicator - no longer fetching data */}

          {/* Diet Options List */}
          <div className="space-y-3">
            {/* Removed no questions found message - using hardcoded data */}
            
            {dietOptions.map((option) => {
              const isAnswered = answeredDiets.has(option.value);
              
              return (
                <div
                  key={option.value}
                  onClick={() => handleDietSelect(option.value)}
                  className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedDiet === option.value
                      ? 'border-black bg-gray-50'
                      : isAnswered
                      ? 'border-[#672DB7] bg-purple-50'
                      : 'border-black bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Image
                      src="/assets/cpx.png"
                      alt="Diet icon"
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
            <div className="h-full bg-black" style={{ width: '50%' }}></div>
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
