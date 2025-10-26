'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

export default function FaithPage() {
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

  const [selectedFaith, setSelectedFaith] = useState<string>('');
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState<string>('');
  const [showAllFaiths, setShowAllFaiths] = useState(false);

  useEffect(() => {
    const userIdParam = searchParams.get('user_id');
    const questionsParam = searchParams.get('questions');
    const refreshParam = searchParams.get('refresh');
    const justAnsweredParam = searchParams.get('just_answered');
    
    console.log('🔍 Faith Page Load - URL Params:', {
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
        console.log('🔍 Faith questions from URL:', parsedQuestions.filter((q: typeof questions[0]) => q.group_name === 'Faith'));
        console.log('🔍 Faith questions group_number details:', parsedQuestions.filter((q: typeof questions[0]) => q.group_name === 'Faith').map((q: typeof questions[0]) => ({
          name: q.question_name,
          group_number: q.group_number,
          group_name: q.group_name
        })));
        console.log('🔍 All questions with group_number 1 (URL):', parsedQuestions.filter((q: typeof questions[0]) => q.group_number === 1));
        console.log('🔍 All questions with "Christian" in name (URL):', parsedQuestions.filter((q: typeof questions[0]) => q.question_name?.toLowerCase().includes('christian')));
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

    // No need to sync with backend - we're using localStorage for immediate UI feedback
    // if (refreshParam === 'true' && userIdParam) {
    //   console.log('🔄 Refresh flag detected, syncing with backend in background...');
    //   checkAnsweredQuestions();
    // }
  }, [searchParams]);

  // Fetch faith questions from backend when userId is available (only once)
  useEffect(() => {
    const fetchQuestionsIfNeeded = async () => {
      // Only fetch if we have a userId, questions array is empty, and we don't have questions from URL params
      if (userId && questions.length === 0 && !searchParams.get('questions')) {
        console.log('🚀 Starting to fetch question 11 from backend...');
        setLoadingQuestions(true);
        try {
          const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=11`;
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
            console.log('📋 Set question 11 to state (sorted by group_number):', sortedQuestions);
            console.log('🔍 Backend Faith questions:', sortedQuestions.filter((q: typeof questions[0]) => q.group_name === 'Faith'));
            console.log('🔍 Backend Faith questions group_number details:', sortedQuestions.filter((q: typeof questions[0]) => q.group_name === 'Faith').map((q: typeof questions[0]) => ({
              name: q.question_name,
              group_number: q.group_number,
              group_name: q.group_name
            })));
            console.log('🔍 All questions with group_number 1:', sortedQuestions.filter((q: typeof questions[0]) => q.group_number === 1));
            console.log('🔍 All questions with "Christian" in name:', sortedQuestions.filter((q: typeof questions[0]) => q.question_name?.toLowerCase().includes('christian')));
          } else {
            console.error('❌ Failed to fetch question 11 from backend. Status:', response.status);
          }
        } catch (error: unknown) {
          console.error('❌ Error fetching question 11 from backend:', error);
        } finally {
          setLoadingQuestions(false);
        }
      }
    };

    fetchQuestionsIfNeeded();
  }, [userId, questions.length, searchParams]);

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

  const handleFaithSelect = (faith: string) => {
    console.log('🔍 Faith selected:', faith);
    setSelectedFaith(faith);
    
    // Find the selected faith question to get the correct question number
    const selectedFaithQuestion = questions.find(question => 
      question.question_name === faith
    );
    
    if (!selectedFaithQuestion) {
      console.error('❌ No faith question found for:', faith);
      return;
    }
    
    const questionNumber = selectedFaithQuestion.question_number;
    
    // Pass the full question data to avoid re-fetching
    const params = new URLSearchParams({ 
      user_id: userId,
      faith: faith,
      question_number: questionNumber.toString(),
      question_data: JSON.stringify(selectedFaithQuestion)
    });
    
    // Navigate to the specific faith question page
    router.push(`/auth/question/faith?${params.toString()}`);
  };

  const handleNext = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    // Allow navigation even if questions aren't loaded - they'll be fetched on the next page
    console.log('📋 Questions loaded:', questions.length);
    console.log('📋 Faith questions found:', questions.filter(q => q.group_name === 'Faith').length);

    setLoading(true);
    setError('');

    try {
      // Check if user has answered any faith questions using the answeredQuestions state
      // which is already populated by checkAnsweredQuestions function
      console.log('🔍 Checking answered questions in handleNext:');
      console.log('📋 Questions loaded:', questions.length);
      console.log('📋 Answered questions set size:', answeredQuestions.size);
      console.log('📋 Answered questions:', Array.from(answeredQuestions));
      
      const answeredFaithQuestions = questions.filter(q => 
        q.group_name === 'Faith' && answeredQuestions.has(q.id)
      );
      
      console.log('📋 Faith questions:', questions.filter(q => q.group_name === 'Faith').map(q => ({ id: q.id, number: q.question_number, group: q.group_number })));
      console.log('📋 Answered faith questions:', answeredFaithQuestions.map(q => ({ id: q.id, number: q.question_number, group: q.group_number })));
      
      // Require at least 1 answered faith question
      if (answeredFaithQuestions.length === 0) {
        setError('Please answer at least one faith question before proceeding.');
        return;
      }
      
      console.log('✅ User has answered', answeredFaithQuestions.length, 'faith question(s), proceeding to next page');

      // Navigate to next onboarding step (dashboard - final step)
      const params = new URLSearchParams({ 
        user_id: userId
      });
      
      router.push(`/dashboard?${params.toString()}`);
    } catch (error) {
      console.error('Error checking faith answers:', error);
      setError('Failed to check faith answers');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const params = new URLSearchParams({ 
      user_id: userId
    });
    router.push(`/auth/question/10?${params.toString()}`);
  };

  const handleLoadMore = () => {
    setShowAllFaiths(true);
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
        <div className="w-full max-w-3xl">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">11. Faith</h1>
            <p className="text-3xl font-bold text-black mb-12">
              What faith do you identify with?
            </p>
          </div>

          {/* Loading Questions */}
          {loadingQuestions && (
            <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded text-center">
              Loading faith questions...
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Faith Options List */}
          <FaithOptionsGrid
            questions={questions}
            answeredQuestions={answeredQuestions}
            selectedFaith={selectedFaith}
            onSelect={handleFaithSelect}
            showAllFaiths={showAllFaiths}
            onShowAll={handleLoadMore}
          />
        </div>
      </main>

      {/* Footer with Progress and Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        {/* Progress Bar - Only show in onboarding, not when from questions page */}
        {searchParams.get('from_questions_page') !== 'true' && (
          <div className="w-full h-1 bg-gray-200">
            <div className="h-full bg-black" style={{ width: '100%' }}></div>
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
                Checking...
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

type FaithOptionsGridProps = {
  questions: Array<{
    id: string;
    question_name: string;
    group_name: string;
    group_number?: number;
  }>;
  answeredQuestions: Set<string>;
  selectedFaith: string;
  onSelect: (faith: string) => void;
  showAllFaiths: boolean;
  onShowAll: () => void;
};

const faithIconMap: Record<string, string> = {
  christian: '/assets/chapel.png',
  catholic: '/assets/chapel.png',
  muslim: '/assets/chapel.png',
  islam: '/assets/chapel.png',
  jewish: '/assets/chapel.png',
  hindu: '/assets/chapel.png',
  buddhist: '/assets/chapel.png',
  atheist: '/assets/leaf.png',
  agnostic: '/assets/leaf.png',
  spiritual: '/assets/leaf.png'
};

function getFaithIcon(faithName: string): string {
  const key = faithName.toLowerCase();
  return faithIconMap[key] || '/assets/chapel.png';
}

function FaithOptionsGrid({
  questions,
  answeredQuestions,
  selectedFaith,
  onSelect,
  showAllFaiths,
  onShowAll
}: FaithOptionsGridProps) {
  const faithQuestions = questions
    .filter(q => q.group_name === 'Faith')
    .sort((a, b) => {
      const groupA = a.group_number || 0;
      const groupB = b.group_number || 0;

      if (groupA !== 0 && groupB !== 0) {
        return groupA - groupB;
      }
      if (groupA !== 0 && groupB === 0) return -1;
      if (groupA === 0 && groupB !== 0) return 1;

      return a.question_name.localeCompare(b.question_name);
    });

  const displayedFaiths = showAllFaiths ? faithQuestions : faithQuestions.slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {displayedFaiths.map(question => {
          const isAnswered = answeredQuestions.has(question.id);
          const isSelected = selectedFaith === question.question_name;

          return (
            <button
              key={question.id}
              type="button"
              onClick={() => onSelect(question.question_name)}
              className={`group flex h-full flex-col justify-between rounded-xl border px-5 py-4 text-left transition-all duration-200 ${
                isSelected
                  ? 'border-black bg-gray-50 shadow-sm'
                  : isAnswered
                  ? 'border-[#672DB7] bg-purple-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-black hover:shadow'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <Image
                    src={getFaithIcon(question.question_name)}
                    alt={`${question.question_name} icon`}
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-semibold text-black leading-snug">
                    {question.question_name}
                  </p>
                  {isAnswered && (
                    <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-[#672DB7]">
                      <span className="block h-2 w-2 rounded-full bg-[#672DB7]" />
                      Answered
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
                <span>{isSelected ? 'Selected' : 'Tap to choose'}</span>
                <svg
                  className={`h-5 w-5 transition-transform duration-200 ${isSelected ? 'translate-x-1 text-black' : 'text-gray-400 group-hover:translate-x-1 group-hover:text-black'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>

      {faithQuestions.length > 6 && !showAllFaiths && (
        <button
          type="button"
          onClick={onShowAll}
          className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-black transition-colors duration-200 hover:border-black hover:bg-gray-100"
        >
          Show all faiths
        </button>
      )}
    </div>
  );
}
