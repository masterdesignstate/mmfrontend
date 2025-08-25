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
    
    console.log('🔍 Ethnicity Page Load - URL Params:', {
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
        console.log('🔍 Ethnicity questions from URL:', parsedQuestions.filter((q: typeof questions[0]) => [7, 8, 9, 10, 11, 12].includes(q.question_number)));
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

    fetchQuestionsIfNeeded();
  }, [userId, questions.length, loadingQuestions]);

  const handleEthnicitySelect = (ethnicity: string) => {
    setSelectedEthnicity(ethnicity);
  };

  const handleNext = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    if (!selectedEthnicity) {
      setError('Please select an ethnicity');
      return;
    }

    if (!questions || questions.length < 6) {
      setError('Questions not loaded properly');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Find questions 7-12 (ethnicity questions)
      const ethnicityQuestions = questions.filter(q => [7, 8, 9, 10, 11, 12].includes(q.question_number));

      if (ethnicityQuestions.length !== 6) {
        setError('Required ethnicity questions not found');
        return;
      }

      // Prepare user answers for questions 7-12
      const userAnswers = [];

      for (const question of ethnicityQuestions) {
        userAnswers.push({
          user_id: userId,
          question_id: question.id,
          me_answer: selectedEthnicity,
          me_open_to_all: false,
          me_importance: 3, // Default importance
          me_share: true,
          looking_for_answer: '', // Not applicable for ethnicity
          looking_for_open_to_all: false,
          looking_for_importance: 3,
          looking_for_share: false
        });
      }

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
          const data = await response.json();
          throw new Error(data.error || 'Failed to save answer');
        }
      }

      // Navigate to dashboard after completing ethnicity selection
      router.push('/dashboard');
    } catch (error) {
      console.error('Error saving ethnicity preferences:', error);
      setError(error instanceof Error ? error.message : 'Failed to save ethnicity preferences');
    } finally {
      setLoading(false);
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

          {/* Ethnicity Options List */}
          <div className="space-y-3">
            {ethnicityOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => handleEthnicitySelect(option.value)}
                className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                  selectedEthnicity === option.value
                    ? 'border-black bg-gray-50'
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
                </div>
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            ))}
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
            disabled={loading || !selectedEthnicity}
            className={`px-8 py-3 rounded-md font-medium transition-colors ${
              !loading && selectedEthnicity
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
