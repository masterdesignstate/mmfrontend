'use client';

import { useState, useEffect } from 'react';
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

    // If refresh flag is present, force refresh of answered questions
    if (refreshParam === 'true' && userIdParam) {
      console.log('🔄 Refresh flag detected, forcing refresh of answered questions...');
      setTimeout(() => checkAnsweredQuestions(), 100); // Small delay to ensure userId is set
    }
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

  // Check answered questions when userId is available
  useEffect(() => {
    if (userId) {
      checkAnsweredQuestions();
    }
  }, [userId]);

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
      
      // Removed strict validation - allow user to proceed regardless of answers
      console.log('✅ Proceeding to next page without strict validation');

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
        <div className="w-full max-w-2xl">
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
          <div className="space-y-3">
            {questions
              .filter(q => q.group_name === 'Faith')
              .sort((a, b) => {
                // Handle null group_number by using question_name as fallback
                const groupA = a.group_number || 0;
                const groupB = b.group_number || 0;
                
                // If both have group_number, sort by that
                if (groupA !== 0 && groupB !== 0) {
                  return groupA - groupB;
                }
                
                // If one has group_number and other doesn't, prioritize the one with group_number
                if (groupA !== 0 && groupB === 0) return -1;
                if (groupA === 0 && groupB !== 0) return 1;
                
                // If neither has group_number, sort alphabetically by question_name
                return a.question_name.localeCompare(b.question_name);
              })
              .slice(0, showAllFaiths ? undefined : 6)
              .map((question, index) => {
                const isAnswered = answeredQuestions.has(question.id);
                
                return (
                  <div
                    key={question.id}
                    onClick={() => handleFaithSelect(question.question_name)}
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedFaith === question.question_name
                        ? 'border-black bg-gray-50'
                        : isAnswered
                        ? 'border-green-500 bg-green-50'
                        : 'border-black bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 flex-shrink-0 overflow-hidden">
                        <Image
                          src="/assets/handss.png"
                          alt="Faith icon"
                          width={45}
                          height={45}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-black font-medium">{question.question_name}</span>
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
            
            {/* Load More Button - only show if there are more than 6 faiths and not all are shown */}
            {questions.filter(q => q.group_name === 'Faith').length > 6 && !showAllFaiths && (
              <button
                onClick={handleLoadMore}
                className="w-full px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-200 text-black font-medium cursor-pointer"
              >
                Load More
              </button>
            )}
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
                Checking...
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
