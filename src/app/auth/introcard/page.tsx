'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

export default function IntroCardPage() {
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

  const [answeredNumbers, setAnsweredNumbers] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState<string>('');

  // Question number → route mapping for mandatory questions
  const QUESTION_ROUTES: Record<number, string> = {
    1: '/auth/relationship',
    2: '/auth/gender',
    3: '/auth/ethnicity',
    4: '/auth/education',
    5: '/auth/diet',
    6: '/auth/question/6',
    7: '/auth/habits',
    8: '/auth/question/8',
    9: '/auth/question/9',
    10: '/auth/kids',
  };

  // Helper: localStorage key for tracking answered question numbers during onboarding
  const getLocalKey = (uid: string) => `onboarding_answered_numbers_${uid}`;

  // Read locally-tracked answered numbers
  const getLocalAnswered = (uid: string): number[] => {
    try {
      return JSON.parse(localStorage.getItem(getLocalKey(uid)) || '[]');
    } catch { return []; }
  };

  useEffect(() => {
    const userIdParam = searchParams.get('user_id');
    const answeredParam = searchParams.get('answered');

    // Get userId from URL params first, then try localStorage as fallback
    const resolvedUserId = userIdParam || localStorage.getItem('user_id') || '';
    if (resolvedUserId) {
      setUserId(resolvedUserId);
    }

    // Start with locally-tracked numbers (instant)
    const localNums = resolvedUserId ? getLocalAnswered(resolvedUserId) : [];
    const merged = new Set<number>(localNums);

    // Parse answered mandatory question numbers from URL if available
    if (answeredParam) {
      try {
        const parsed = JSON.parse(answeredParam) as number[];
        parsed.forEach(n => merged.add(n));
      } catch {
        // ignore parse errors
      }
      setAnsweredNumbers(merged);
    } else if (resolvedUserId) {
      // Set what we have locally right away
      setAnsweredNumbers(merged);
      // Also fetch from backend to merge in any server-side answers
      fetch(getApiUrl(`/users/${resolvedUserId}/`))
        .then(res => res.ok ? res.json() : null)
        .then(userData => {
          if (userData?.email) {
            return fetch(getApiUrl(API_ENDPOINTS.ONBOARDING_STATUS), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: userData.email })
            });
          }
          return null;
        })
        .then(res => res?.ok ? res.json() : null)
        .then(data => {
          if (data?.answered_mandatory_numbers) {
            const backendNums = data.answered_mandatory_numbers as number[];
            backendNums.forEach(n => merged.add(n));
          }
          setAnsweredNumbers(new Set(merged));
          // Sync merged set back to localStorage
          localStorage.setItem(getLocalKey(resolvedUserId), JSON.stringify([...merged]));
        })
        .catch(() => {});
    }
  }, [searchParams]);

  // Re-read localStorage when page becomes visible (handles back/forward navigation)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && userId) {
        const freshNums = getLocalAnswered(userId);
        if (freshNums.length > 0) {
          setAnsweredNumbers(prev => {
            const updated = new Set(prev);
            freshNums.forEach(n => updated.add(n));
            return updated;
          });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Also re-read on focus (covers Next.js soft navigation back)
    const handleFocus = () => {
      if (userId) {
        const freshNums = getLocalAnswered(userId);
        if (freshNums.length > 0) {
          setAnsweredNumbers(prev => {
            const updated = new Set(prev);
            freshNums.forEach(n => updated.add(n));
            return updated;
          });
        }
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [userId]);

  // Fetch relationship questions (question_number = 1) from backend
  // Fetch relationship questions from backend when userId is available (only once)
  useEffect(() => {
    const fetchRelationshipQuestions = async () => {
      // Only fetch if we have a userId and haven't fetched questions yet
      if (userId && questions.length === 0 && !loadingQuestions) {
        console.log('🚀 Starting to fetch relationship questions from backend...');
        setLoadingQuestions(true);
        try {
          const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=1`;
          console.log('🌐 Fetching from URL:', apiUrl);
          
          const response = await fetch(apiUrl);
          console.log('📡 Response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('📋 Raw API response:', data);
            
            // Sort questions by group_number
            const sortedQuestions = (data.results || []).sort((a: any, b: any) => {
              const groupA = a.group_number || 0;
              const groupB = b.group_number || 0;
              return groupA - groupB;
            });
            
            setQuestions(sortedQuestions);
            console.log('📋 Set relationship questions to state (sorted by group_number):', sortedQuestions);
            console.log('🔍 Backend Relationship Question OTA settings:', sortedQuestions.map((q: typeof questions[0]) => ({
              number: q.question_number,
              group_number: q.group_number,
              group: q.group_name,
              ota_me: q.open_to_all_me,
              ota_looking: q.open_to_all_looking_for
            })));
          } else {
            console.error('❌ Failed to fetch relationship questions from backend. Status:', response.status);
          }
        } catch (error: unknown) {
          console.error('❌ Error fetching relationship questions from backend:', error);
        } finally {
          setLoadingQuestions(false);
        }
      }
    };

    fetchRelationshipQuestions();
  }, [userId, questions.length, loadingQuestions]);

  const handleNext = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Read localStorage directly at click time to get the freshest data
      // (state may be stale if useEffect didn't re-run)
      const freshLocal = getLocalAnswered(userId);
      const freshSet = new Set<number>([...answeredNumbers, ...freshLocal]);

      // Find the first unanswered mandatory question
      const allMandatoryNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const nextUnanswered = allMandatoryNumbers.find(qn => !freshSet.has(qn));

      const params = new URLSearchParams({ user_id: userId });

      if (!nextUnanswered) {
        // All mandatory questions answered — go to results
        router.push('/results');
      } else if (nextUnanswered === 1) {
        // Relationship page needs questions data
        params.set('questions', JSON.stringify(questions));
        router.push(`/auth/relationship?${params.toString()}`);
      } else {
        const route = QUESTION_ROUTES[nextUnanswered];
        router.push(`${route}?${params.toString()}`);
      }
    } catch (error) {
      console.error('Error navigating to next question:', error);
      setError(error instanceof Error ? error.message : 'Failed to navigate');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const params = new URLSearchParams({ 
      user_id: userId
    });
    router.push(`/auth/personal-details?${params.toString()}`);
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
        <div className="w-full max-w-4xl flex flex-col items-center justify-center">
          


          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Cart Image Centered */}
          <div className="flex items-center justify-center">
            <Image
              src="/assets/cart.jpg"
              alt="Cart"
              width={600}
              height={400}
              className="rounded-lg shadow-lg"
              priority
            />
          </div>
        </div>
      </main>

      {/* Footer with Progress and Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        {/* Progress Bar */}
        <div className="w-full h-1 bg-gray-200">
          <div className="h-full bg-black" style={{ width: '25%' }}></div>
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex justify-between items-center px-6 py-4">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="text-gray-900 font-medium hover:text-gray-500 transition-colors cursor-pointer"
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
                Loading...
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
