'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

export default function DietPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string>('');
  const [questions, setQuestions] = useState<Array<{
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

  const [nextQuestions, setNextQuestions] = useState<Array<{
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

  const [selectedDiet, setSelectedDiet] = useState<string>('');
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState<string>('');

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
    
    if (questionsParam) {
      try {
        const parsedQuestions = JSON.parse(questionsParam);
        setQuestions(parsedQuestions);
        console.log('📋 Received questions from URL:', parsedQuestions);
        console.log('🔍 Diet questions from URL:', parsedQuestions.filter((q: typeof questions[0]) => q.group_name === 'Diet'));
      } catch (error) {
        console.error('❌ Error parsing questions from URL:', error);
      }
    } else {
      console.log('❌ No questions parameter found in URL');
    }

    // If a question was just answered, immediately add it to the answered set for instant feedback
    if (justAnsweredParam) {
      console.log('✅ Question just answered:', justAnsweredParam);
      setAnsweredQuestions(prev => new Set([...prev, justAnsweredParam]));
    }

    // If refresh flag is present, sync with backend (but don't wait for UI update)
    if (refreshParam === 'true' && userIdParam) {
      console.log('🔄 Refresh flag detected, syncing with backend in background...');
      // Don't wait for this - UI is already updated optimistically
      checkAnsweredQuestions();
    }
  }, [searchParams]);

  // Fetch diet questions from backend when userId is available (only once)
  useEffect(() => {
    const fetchDietQuestions = async () => {
      // Only fetch if we have a userId, questions array is empty, and we don't have questions from URL params
      if (userId && questions.length === 0 && !searchParams.get('questions')) {
        console.log('🚀 Starting to fetch diet questions from backend...');
        setLoadingQuestions(true);
        try {
          const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=5`;
          console.log('🌐 Fetching from URL:', apiUrl);
          
          const response = await fetch(apiUrl);
          console.log('📡 Response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('📋 Raw API response:', data);
            
            // Sort questions by group_number
            const sortedQuestions = (data.results || []).sort((a: typeof questions[0], b: typeof questions[0]) => {
              const groupA = a.group_number || 0;
              const groupB = b.group_number || 0;
              return groupA - groupB;
            });
            
            setQuestions(sortedQuestions);
            console.log('📋 Set diet questions to state (sorted by group_number):', sortedQuestions);
            console.log('🔍 Backend Diet Question OTA settings:', sortedQuestions.map((q: typeof questions[0]) => ({
              number: q.question_number,
              group_number: q.group_number,
              group: q.group_name,
              ota_me: q.open_to_all_me,
              ota_looking: q.open_to_all_looking_for
            })));
          } else {
            console.error('❌ Failed to fetch diet questions from backend. Status:', response.status);
          }
        } catch (error: unknown) {
          console.error('❌ Error fetching diet questions from backend:', error);
        } finally {
          setLoadingQuestions(false);
        }
      }
    };

    fetchDietQuestions();
  }, [userId, questions.length, searchParams]);

  const fetchNextQuestions = async () => {
    // Fetch next questions in the background
    if (userId && nextQuestions.length === 0) {
      try {
        const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=6`;
        const response = await fetch(apiUrl);
        
        if (response.ok) {
          const data = await response.json();
          
          // Sort questions by group_number
          const sortedNextQuestions = (data.results || []).sort((a: typeof nextQuestions[0], b: typeof nextQuestions[0]) => {
            const groupA = a.group_number || 0;
            const groupB = b.group_number || 0;
            return groupA - groupB;
          });
          
          setNextQuestions(sortedNextQuestions);
        }
      } catch (error: unknown) {
        // Silently fail - next page will fetch normally if needed
      }
    }
  };

  // IMMEDIATELY load answered questions from localStorage for instant UI
  useEffect(() => {
    if (userId) {
      const answeredQuestionsKey = `answered_questions_${userId}`;
      const localAnswered = JSON.parse(localStorage.getItem(answeredQuestionsKey) || '[]');
      if (localAnswered.length > 0) {
        setAnsweredQuestions(new Set(localAnswered));
        console.log('⚡ Loaded answered questions from localStorage:', localAnswered);
      }
      // Also check backend (but don't wait for it)
      checkAnsweredQuestions();
    }
  }, [userId]);

  // Fetch next questions in background when userId is available
  useEffect(() => {
    if (userId) {
      fetchNextQuestions();
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

  const handleDietSelect = (diet: string) => {
    setSelectedDiet(diet);
    
    // Find the selected diet question to get the correct question number
    const selectedDietQuestion = questions.find(question => 
      question.question_name === diet
    );
    
    if (!selectedDietQuestion) {
      console.error('❌ No diet question found for:', diet);
      return;
    }
    
    const questionNumber = selectedDietQuestion.question_number;
    
    // Pass the full question data to avoid re-fetching
    const params = new URLSearchParams({ 
      user_id: userId,
      diet: diet,
      question_number: questionNumber.toString(),
      question_data: JSON.stringify(selectedDietQuestion)
    });
    
    // Navigate to the specific diet question page
    router.push(`/auth/question/diet?${params.toString()}`);
  };

  const handleNext = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    // Allow navigation even if questions aren't loaded - they'll be fetched on the next page
    console.log('📋 Questions loaded:', questions.length);
    console.log('📋 Diet questions found:', questions.filter(q => q.group_name === 'Diet').length);

    setLoading(true);
    setError('');

    try {
      // Check if user has answered any diet questions using the answeredQuestions state
      // which is already populated by checkAnsweredQuestions function
      console.log('🔍 Checking answered questions in handleNext:');
      console.log('📋 Questions loaded:', questions.length);
      console.log('📋 Answered questions set size:', answeredQuestions.size);
      console.log('📋 Answered questions:', Array.from(answeredQuestions));
      
      const answeredDietQuestions = questions.filter(q => 
        q.group_name === 'Diet' && answeredQuestions.has(q.id)
      );
      
      console.log('📋 Diet questions:', questions.filter(q => q.group_name === 'Diet').map(q => ({ id: q.id, number: q.question_number, group: q.group_number })));
      console.log('📋 Answered diet questions:', answeredDietQuestions.map(q => ({ id: q.id, number: q.question_number, group: q.group_number })));
      
      // Require at least 1 answered diet question
      if (answeredDietQuestions.length === 0) {
        setError('Please answer at least one diet question before proceeding.');
        return;
      }
      
      console.log('✅ User has answered', answeredDietQuestions.length, 'diet question(s), proceeding to next page');

      // Navigate to next onboarding step (single next question page)
      const params = new URLSearchParams({ 
        user_id: userId
      });
      
      // If we have next questions loaded, pass the first one to avoid re-fetching
      if (nextQuestions.length > 0) {
        const firstQuestion = nextQuestions[0];
        params.set('next_question', firstQuestion.question_name);
        params.set('question_number', firstQuestion.question_number.toString());
        params.set('question_data', JSON.stringify(firstQuestion));
        console.log('📋 Passing pre-loaded next question to single question page');
      }
      
      router.push(`/auth/question/next-question?${params.toString()}`);
    } catch (error) {
      console.error('Error checking diet answers:', error);
      setError('Failed to check diet answers');
    } finally {
      setLoading(false);
    }
  };

  const checkAnsweredQuestions = async () => {
    if (!userId) return;
    
    console.log('🔍 checkAnsweredQuestions called for userId:', userId);
    
    try {
      // Fetch ALL pages of answers (handle pagination)
      let allAnswers: any[] = [];
      let nextUrl: string | null = `${getApiUrl(API_ENDPOINTS.ANSWERS)}?user_id=${userId}&page_size=100`;
      
      while (nextUrl) {
        const response = await fetch(nextUrl);
        console.log('📡 Fetching answers page:', nextUrl);
        
        if (response.ok) {
          const data = await response.json();
          allAnswers = [...allAnswers, ...(data.results || [])];
          nextUrl = data.next;
        } else {
          nextUrl = null;
        }
      }
      
      console.log('📋 Total answers fetched:', allAnswers.length);
      
      // Extract question IDs - the 'question' field contains an object with an 'id' property
      const answeredQuestionIds = new Set<string>(
        allAnswers.map((answer: any) => {
          if (answer.question_id) {
            return answer.question_id;
          } else if (answer.question && typeof answer.question === 'object' && answer.question.id) {
            return answer.question.id;
          }
          return null;
        }).filter(id => id != null)
      );
      
      console.log('📋 Answered question IDs:', Array.from(answeredQuestionIds));
      
      // Merge with localStorage (localStorage takes precedence for recent answers)
      const answeredQuestionsKey = `answered_questions_${userId}`;
      const localAnswered = JSON.parse(localStorage.getItem(answeredQuestionsKey) || '[]');
      const mergedAnswered = new Set([...answeredQuestionIds, ...localAnswered]);
      
      setAnsweredQuestions(mergedAnswered);
      console.log('📋 Updated answeredQuestions state with', mergedAnswered.size, 'questions (backend:', answeredQuestionIds.size, '+ localStorage:', localAnswered.length, ')');
    } catch (error) {
      console.error('Error checking answered questions:', error);
    }
  };

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

          {/* Diet Options List */}
          <div className="space-y-3">
            {!loadingQuestions && questions.filter(q => q.group_name === 'Diet').length === 0 && (
              <div className="text-center text-gray-500 p-4">
                <p>No diet questions found.</p>
                <p className="text-sm mt-2">Please check if diet questions exist in the database.</p>
              </div>
            )}
            
            {questions.filter(q => q.group_name === 'Diet').reverse().map((question) => {
              const isAnswered = answeredQuestions.has(question.id);
              
              return (
                <div
                  key={question.id}
                  onClick={() => handleDietSelect(question.question_name)}
                  className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedDiet === question.question_name
                      ? 'border-black bg-gray-50'
                      : isAnswered
                      ? 'border-[#672DB7] bg-purple-50'
                      : 'border-black bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Image
                      src="/assets/lf2.png"
                      alt="Diet icon"
                      width={24}
                      height={24}
                      className="w-6 h-6"
                    />
                    <span className="text-black font-medium">{question.question_name}</span>
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
