'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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

  // Carousel state
  const [activeCard, setActiveCard] = useState(0);
  const touchStartX = useRef(0);
  const mouseStartX = useRef(0);
  const isDragging = useRef(false);
  const autoPlayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHovering = useRef(false);
  const totalCards = 6;

  const clearTimer = useCallback(() => {
    if (autoPlayTimer.current) {
      clearInterval(autoPlayTimer.current);
      autoPlayTimer.current = null;
    }
  }, []);

  // Auto-advance every 5 seconds, skip tick if hovering
  const resetAutoPlay = useCallback(() => {
    clearTimer();
    autoPlayTimer.current = setInterval(() => {
      if (!isHovering.current) {
        setActiveCard(prev => (prev + 1) % totalCards);
      }
    }, 5000);
  }, [clearTimer]);

  useEffect(() => {
    resetAutoPlay();
    return clearTimer;
  }, [resetAutoPlay, clearTimer]);

  const pauseAndResumeAutoPlay = useCallback(() => {
    clearTimer();
    // Resume auto-play after 8 seconds of inactivity
    autoPlayTimer.current = setTimeout(() => {
      resetAutoPlay();
    }, 8000) as unknown as ReturnType<typeof setInterval>;
  }, [resetAutoPlay, clearTimer]);

  const goToCard = useCallback((index: number) => {
    setActiveCard(index);
    pauseAndResumeAutoPlay();
  }, [pauseAndResumeAutoPlay]);

  const goNext = useCallback(() => {
    setActiveCard(prev => (prev < totalCards - 1 ? prev + 1 : 0));
    pauseAndResumeAutoPlay();
  }, [pauseAndResumeAutoPlay]);

  const goPrev = useCallback(() => {
    setActiveCard(prev => (prev > 0 ? prev - 1 : totalCards - 1));
    pauseAndResumeAutoPlay();
  }, [pauseAndResumeAutoPlay]);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  // Mouse drag (desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
    isDragging.current = true;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const diff = mouseStartX.current - e.clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  // Keyboard arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

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
        console.log('Starting to fetch relationship questions from backend...');
        setLoadingQuestions(true);
        try {
          const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=1`;

          const response = await fetch(apiUrl);

          if (response.ok) {
            const data = await response.json();

            // Sort questions by group_number
            const sortedQuestions = (data.results || []).sort((a: any, b: any) => {
              const groupA = a.group_number || 0;
              const groupB = b.group_number || 0;
              return groupA - groupB;
            });

            setQuestions(sortedQuestions);
          } else {
            console.error('Failed to fetch relationship questions from backend. Status:', response.status);
          }
        } catch (error: unknown) {
          console.error('Error fetching relationship questions from backend:', error);
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
      </div>

      {/* Main Content — Intro Carousel */}
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] px-4 py-4">
        <div className="w-full max-w-lg flex flex-col items-center">

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded w-full">
              {error}
            </div>
          )}

          {/* Carousel */}
          <div
            className="w-full overflow-hidden rounded-2xl relative group"
            onMouseEnter={() => { isHovering.current = true; }}
            onMouseLeave={() => { isHovering.current = false; }}
          >
            {/* Left arrow */}
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white cursor-pointer"
              aria-label="Previous card"
            >
              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Right arrow */}
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white cursor-pointer"
              aria-label="Next card"
            >
              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div
              className="flex select-none"
              style={{ transform: `translateX(-${activeCard * 100}%)`, transition: 'transform 0.4s ease-in-out' }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { isDragging.current = false; }}
            >

              {/* ─── Card 1: Welcome to Matchmatical ─── */}
              <div className="min-w-full px-1">
                <div className="bg-[#F3F3F3] rounded-2xl p-6 sm:p-8 h-[420px] flex flex-col items-center text-center">
                  {/* Logo */}
                  <div className="mb-2">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                      <Image
                        src="/assets/mmlogox.png"
                        alt="Matchmatical"
                        width={32}
                        height={32}
                      />
                    </div>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Matchmatical</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Answer questions on a 1–5 scale and get matched with people who fit your needs.
                  </p>

                  <div className="flex-1 flex flex-col justify-center space-y-2 w-full">
                    <div className="bg-white rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#672DB7]/10 flex items-center justify-center shrink-0">
                          <svg className="w-3.5 h-3.5 text-[#672DB7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-900 text-left truncate">Answer questions about yourself and what you want.</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#672DB7]/10 flex items-center justify-center shrink-0">
                          <svg className="w-3.5 h-3.5 text-[#672DB7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-900 text-left truncate">Rate importance — your priorities shape your scores.</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#672DB7]/10 flex items-center justify-center shrink-0">
                          <svg className="w-3.5 h-3.5 text-[#672DB7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-900 text-left truncate">Browse matches ranked by compatibility.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Card 2: Rate What Matters ─── */}
              <div className="min-w-full px-1">
                <div className="bg-[#F3F3F3] rounded-2xl p-6 sm:p-8 h-[420px] flex flex-col">
                  <div className="mb-1">
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-[#672DB7]">How It Works</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Rate What Matters</h2>
                  <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                    Each question has three parts: what you want, your answer, and how much it matters.
                  </p>

                  <div className="flex-1 flex flex-col justify-center space-y-5">
                    {/* THEM slider — what you want from a match */}
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-400 w-20 shrink-0 text-right">THEM</span>
                        <div className="flex-1 relative h-7 flex items-center">
                          <div className="w-full h-5 rounded-[20px] bg-[#F5F5F5] border border-[#ADADAD] relative overflow-hidden">
                            <div className="absolute top-0 left-0 h-full bg-[#672DB7] rounded-[20px]" style={{ width: '50%' }} />
                          </div>
                          <div
                            className="absolute w-7 h-7 rounded-full bg-[#672DB7] border border-gray-300 flex items-center justify-center"
                            style={{ left: 'calc(50% - 14px)', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
                          >
                            <span className="text-white text-[10px] font-bold">3</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-900 mt-1 pl-23">What you want from a match</p>
                    </div>

                    {/* ME slider — your answer */}
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-400 w-20 shrink-0 text-right">ME</span>
                        <div className="flex-1 relative h-7 flex items-center">
                          <div className="w-full h-5 rounded-[20px] bg-[#F5F5F5] border border-[#ADADAD] relative overflow-hidden">
                            <div className="absolute top-0 left-0 h-full bg-[#672DB7] rounded-[20px]" style={{ width: '75%' }} />
                          </div>
                          <div
                            className="absolute w-7 h-7 rounded-full bg-[#672DB7] border border-gray-300 flex items-center justify-center"
                            style={{ left: 'calc(75% - 14px)', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
                          >
                            <span className="text-white text-[10px] font-bold">4</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-900 mt-1 pl-23">Your answer to the question</p>
                    </div>

                    {/* IMPORTANCE slider — multiplier (white thumb, purple text) */}
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-400 w-20 shrink-0 text-right">IMPORTANCE</span>
                        <div className="flex-1 relative h-7 flex items-center">
                          <div className="w-full h-5 rounded-[20px] bg-[#F5F5F5] border border-[#ADADAD]" />
                          <div
                            className="absolute w-7 h-7 rounded-full bg-white border border-gray-300 flex items-center justify-center"
                            style={{ left: 'calc(80% - 14px)', boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)' }}
                          >
                            <span className="text-[#672DB7] text-[10px] font-bold">4</span>
                          </div>
                        </div>
                      </div>
                      {/* Importance scale labels */}
                      <div className="flex justify-between mt-2 pl-23 pr-1">
                        {['Trivial', 'Minor', 'Average', 'Significant', 'Essential'].map((label, i) => (
                          <span key={label} className={`text-[7px] sm:text-[9px] font-medium ${i === 3 ? 'text-[#672DB7] font-semibold' : 'text-gray-400'}`}>
                            {label}
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-900 mt-1 pl-23">Acts as a multiplier — adds more weight to this question</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Card 2: Stay Open or Get Specific ─── */}
              <div className="min-w-full px-1">
                <div className="bg-[#F3F3F3] rounded-2xl p-6 sm:p-8 h-[420px] flex flex-col">
                  <div className="mb-1">
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-[#672DB7]">Matching</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Question Toggles</h2>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                    Two settings you can enable on any question.
                  </p>

                  <div className="flex-1 flex flex-col justify-center space-y-3">
                    {/* Open to All */}
                    <div className="bg-white rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-gray-900">Open to All</span>
                        <div className="w-11 h-6 rounded-full bg-[#672DB7] relative shrink-0">
                          <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm" style={{ left: '22px' }} />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Accept any answer for this question — you&apos;re open-minded.
                      </p>
                    </div>

                    {/* Required For Match */}
                    <div className="bg-white rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-gray-900">Required For Match</span>
                        <div className="w-11 h-6 rounded-full bg-black relative shrink-0">
                          <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm" style={{ left: '22px' }} />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Your match must answer this question to be considered.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Card 3: Control Your Visibility ─── */}
              <div className="min-w-full px-1">
                <div className="bg-[#F3F3F3] rounded-2xl p-6 sm:p-8 h-[420px] flex flex-col">
                  <div className="mb-1">
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-[#672DB7]">Privacy</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Control Your Visibility</h2>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                    Choose what matches can see about your answers.
                  </p>

                  <div className="flex-1 flex flex-col justify-center space-y-4">
                    {/* Share ON state */}
                    <div className="bg-white rounded-xl p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-6 rounded-full bg-black relative shrink-0">
                          <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm" style={{ left: '22px' }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span className="text-sm font-semibold text-gray-900">Share Answer</span>
                          </div>
                          <p className="text-xs text-gray-500">Matches can see your answer to this question.</p>
                        </div>
                      </div>
                    </div>

                    {/* Share OFF state */}
                    <div className="bg-white rounded-xl p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-6 rounded-full bg-[#ADADAD] relative shrink-0">
                          <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm" style={{ left: '2px' }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                            </svg>
                            <span className="text-sm font-semibold text-gray-400">Hidden</span>
                          </div>
                          <p className="text-xs text-gray-400">Your answer stays private but still affects compatibility scores.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Card 4: See Your Match Scores ─── */}
              <div className="min-w-full px-1">
                <div className="bg-[#F3F3F3] rounded-2xl p-6 sm:p-8 h-[420px] flex flex-col">
                  <div className="mb-1">
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-[#672DB7]">Compatibility</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">See Your Match Scores</h2>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                    Every match has three scores.
                  </p>

                  <div className="flex-1 flex flex-col justify-center space-y-3">
                    {/* Three scores in one row */}
                    <div className="bg-white rounded-xl p-4">
                      <div className="flex justify-center items-end gap-6">
                        <div className="flex flex-col items-center">
                          <div className="relative w-20 h-20">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="2.5" />
                              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#672DB7" strokeWidth="2.5" strokeDasharray="100" strokeDashoffset="13" strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-sm font-black text-[#672DB7]">87%</span>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-gray-900 mt-1">Overall</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="relative w-20 h-20">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="2.5" />
                              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#672DB7" strokeWidth="2.5" strokeDasharray="100" strokeDashoffset="8" strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-sm font-black text-[#672DB7]">92%</span>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-gray-900 mt-1">Me</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="relative w-20 h-20">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="2.5" />
                              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#672DB7" strokeWidth="2.5" strokeDasharray="100" strokeDashoffset="17" strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-sm font-black text-[#672DB7]">83%</span>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-gray-900 mt-1">Them</span>
                        </div>
                      </div>
                    </div>

                    {/* Descriptions */}
                    <div className="bg-white rounded-xl p-3 space-y-1">
                      <p className="text-xs text-gray-500"><span className="font-semibold text-gray-900">Overall</span> — combines both directions.</p>
                      <p className="text-xs text-gray-500"><span className="font-semibold text-gray-900">Me</span> — how well they match what you want.</p>
                      <p className="text-xs text-gray-500"><span className="font-semibold text-gray-900">Them</span> — how well you match what they want.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Card 6: Required Scores ─── */}
              <div className="min-w-full px-1">
                <div className="bg-[#F3F3F3] rounded-2xl p-6 sm:p-8 h-[420px] flex flex-col">
                  <div className="mb-1">
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-[#672DB7]">Required</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Required Scores</h2>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                    The same three scores, but only using questions marked as required.
                  </p>

                  <div className="flex-1 flex flex-col justify-center space-y-3">
                    <div className="bg-white rounded-xl p-3">
                      <span className="text-sm font-semibold text-gray-900">My Required</span>
                      <p className="text-xs text-gray-500 mt-1">Overall, Me, and Them scores calculated using only the questions <span className="font-semibold text-gray-900">you</span> marked as required.</p>
                    </div>

                    <div className="bg-white rounded-xl p-3">
                      <span className="text-sm font-semibold text-gray-900">Their Required</span>
                      <p className="text-xs text-gray-500 mt-1">Overall, Me, and Them scores calculated using only the questions <span className="font-semibold text-gray-900">they</span> marked as required.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Pagination Dots */}
          <div className="flex gap-2.5 mt-6 justify-center items-center">
            {Array.from({ length: totalCards }).map((_, i) => (
              <button
                key={i}
                onClick={() => goToCard(i)}
                aria-label={`Go to card ${i + 1}`}
                className={`rounded-full transition-all duration-300 ${
                  activeCard === i
                    ? 'bg-[#672DB7] w-2.5 h-2.5'
                    : 'bg-gray-300 w-2 h-2 hover:bg-gray-400'
                }`}
              />
            ))}
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
