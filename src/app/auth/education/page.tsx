'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

export default function EducationPage() {
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

  const [dietQuestions, setDietQuestions] = useState<Array<{
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

  const [selectedEducation, setSelectedEducation] = useState<string>('');
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState<string>('');

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
    
    if (questionsParam) {
      try {
        const parsedQuestions = JSON.parse(questionsParam);
        setQuestions(parsedQuestions);
        console.log('📋 Received questions from URL:', parsedQuestions);
        console.log('🔍 Education questions from URL:', parsedQuestions.filter((q: typeof questions[0]) => q.group_name === 'Education'));
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

  // Fetch education questions from backend when userId is available (only once)
  useEffect(() => {
    const fetchEducationQuestions = async () => {
      // Only fetch if we have a userId, questions array is empty, and we don't have questions from URL params
      if (userId && questions.length === 0 && !searchParams.get('questions')) {
        console.log('🚀 Starting to fetch education questions from backend...');
        setLoadingQuestions(true);
        try {
          const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=4`;
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
            console.log('📋 Set education questions to state (sorted by group_number):', sortedQuestions);
            console.log('🔍 Backend Education Question OTA settings:', sortedQuestions.map((q: typeof questions[0]) => ({
              number: q.question_number,
              group_number: q.group_number,
              group: q.group_name,
              ota_me: q.open_to_all_me,
              ota_looking: q.open_to_all_looking_for
            })));
          } else {
            console.error('❌ Failed to fetch education questions from backend. Status:', response.status);
          }
        } catch (error: unknown) {
          console.error('❌ Error fetching education questions from backend:', error);
        } finally {
          setLoadingQuestions(false);
        }
      }
    };

    fetchEducationQuestions();
  }, [userId, questions.length, searchParams]);

  const fetchDietQuestions = async () => {
    // Fetch diet questions in the background
    if (userId && dietQuestions.length === 0) {
      try {
        const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=5`;
        const response = await fetch(apiUrl);
        
        if (response.ok) {
          const data = await response.json();
          
          // Sort questions by group_number
          const sortedDietQuestions = (data.results || []).sort((a: typeof dietQuestions[0], b: typeof dietQuestions[0]) => {
            const groupA = a.group_number || 0;
            const groupB = b.group_number || 0;
            return groupA - groupB;
          });
          
          setDietQuestions(sortedDietQuestions);
        }
      } catch (error: unknown) {
        // Silently fail - diet page will fetch normally if needed
      }
    }
  };

  // Fetch diet questions in background when userId is available
  useEffect(() => {
    if (userId) {
      fetchDietQuestions();
    }
  }, [userId]);

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

  const handleEducationSelect = (education: string) => {
    setSelectedEducation(education);
    
    // Find the selected education question to get the correct question number
    const selectedEducationQuestion = questions.find(question => 
      question.question_name === education
    );
    
    if (!selectedEducationQuestion) {
      console.error('❌ No education question found for:', education);
      return;
    }
    
    const questionNumber = selectedEducationQuestion.question_number;
    
    // Pass the full question data to avoid re-fetching
    const params = new URLSearchParams({ 
      user_id: userId,
      education: education,
      question_number: questionNumber.toString(),
      question_data: JSON.stringify(selectedEducationQuestion)
    });
    
    // Navigate to the specific education question page
    router.push(`/auth/question/education?${params.toString()}`);
  };

  const handleNext = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    if (!questions || questions.filter(q => q.group_name === 'Education').length < 1) {
      setError('Education questions not loaded properly');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if user has answered any education questions using the answeredQuestions state
      // which is already populated by checkAnsweredQuestions function
      console.log('🔍 Checking answered questions in handleNext:');
      console.log('📋 Questions loaded:', questions.length);
      console.log('📋 Answered questions set size:', answeredQuestions.size);
      console.log('📋 Answered questions:', Array.from(answeredQuestions));
      
      const answeredEducationQuestions = questions.filter(q => 
        q.group_name === 'Education' && answeredQuestions.has(q.id)
      );
      
      console.log('📋 Education questions:', questions.filter(q => q.group_name === 'Education').map(q => ({ id: q.id, number: q.question_number, group: q.group_number })));
      console.log('📋 Answered education questions:', answeredEducationQuestions.map(q => ({ id: q.id, number: q.question_number, group: q.group_number })));
      
      // Require at least 1 answered education question
      if (answeredEducationQuestions.length === 0) {
        setError('Please answer at least one education question before proceeding.');
        return;
      }
      
      console.log('✅ User has answered', answeredEducationQuestions.length, 'education question(s), proceeding to next page');

      // Navigate to next onboarding step (diet page)
      const params = new URLSearchParams({ 
        user_id: userId
      });
      
      // If we have diet questions loaded, pass them to avoid re-fetching
      if (dietQuestions.length > 0) {
        params.set('questions', JSON.stringify(dietQuestions));
        console.log('📋 Passing pre-loaded diet questions to diet page');
      }
      
      router.push(`/auth/diet?${params.toString()}`);
    } catch (error) {
      console.error('Error checking education answers:', error);
      setError('Failed to check education answers');
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

          {/* Loading Indicator */}
          {loadingQuestions && (
            <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded text-center">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
                Loading education questions...
              </div>
            </div>
          )}

          {/* Education Options List */}
          <div className="space-y-3">
            {!loadingQuestions && questions.filter(q => q.group_name === 'Education').length === 0 && (
              <div className="text-center text-gray-500 p-4">
                <p>No education questions found.</p>
                <p className="text-sm mt-2">Please check if education questions exist in the database.</p>
              </div>
            )}
            
            {questions.filter(q => q.group_name === 'Education').reverse().map((question) => {
              const isAnswered = answeredQuestions.has(question.id);
              
              return (
                <div
                  key={question.id}
                  onClick={() => handleEducationSelect(question.question_name)}
                  className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedEducation === question.question_name
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
        {/* Progress Bar */}
        <div className="w-full h-1 bg-gray-200">
          <div className="h-full bg-black" style={{ width: '40%' }}></div>
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
