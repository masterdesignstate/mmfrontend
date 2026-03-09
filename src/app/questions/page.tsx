'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS, API_BASE_URL } from '@/config/api';
import HamburgerMenu from '@/components/HamburgerMenu';
import ProtectedPageGate from '@/components/ProtectedPageGate';
import { useQuestionMetadata } from '@/hooks/useQuestionMetadata';
import { useUserAnswers } from '@/hooks/useUserAnswers';

interface Question {
  id: string;
  question_name: string;
  question_number: number;
  group_number?: number;
  group_name?: string;
  group_name_text?: string;
  question_type?: 'basic' | 'four' | 'grouped' | 'double' | 'triple';
  text: string;
  open_to_all_me: boolean;
  open_to_all_looking_for: boolean;
  is_mandatory: boolean;  // From backend field
  is_required_for_match: boolean;  // From backend field
  tags: Array<{ id: string; name: string }>;  // Tags are objects from backend
  submitted_by?: { id: string; username: string } | null;  // User who submitted
  is_answered?: boolean;  // Computed by backend
  is_submitted_by_me?: boolean;  // Computed by backend
}

interface UserAnswer {
  id: string;
  question: Question;
  me_answer: number;
  looking_for_answer: number;
}

function QuestionsPageContent() {
  // --- Timing diagnostics ---
  const mountTime = useRef(performance.now());
  const timingLog = useCallback((label: string, extra?: Record<string, unknown>) => {
    const elapsed = (performance.now() - mountTime.current).toFixed(0);
    console.log(`⏱️ [${elapsed}ms] ${label}`, extra ?? '');
  }, []);

  const router = useRouter();
  const searchParams = useSearchParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  // Ref tracks whether the filter-specific fetch has completed at least once.
  // Starts false so we show the loader until filter data is ready.
  // Using a ref (not state) avoids SSR hydration mismatches.
  const filterFetchDone = useRef(false);
  // Tracks whether the main fetch has finished loading userAnswers.
  // Prevents the filter effect from concluding "0 answers" before data loads.
  const answersLoaded = useRef(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [error, setError] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAskQuestionModal, setShowAskQuestionModal] = useState(false);
  const [answerCounts, setAnswerCounts] = useState<Record<number, number>>({});

  // Ask Question Modal state
  const [questionText, setQuestionText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [valueLabel1, setValueLabel1] = useState('');
  const [valueLabel5, setValueLabel5] = useState('');
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
  const [isRequiredForMatch, setIsRequiredForMatch] = useState(false);
  const [shareAnswer, setShareAnswer] = useState(true);
  const [sliderValue, setSliderValue] = useState(3);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Question[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchIndexTimestamp = useRef<number | null>(null);
  const searchIndexBuilding = useRef<boolean>(false);
  const [searchIndex, setSearchIndex] = useState<Question[]>([]);
  
  // Pagination state - default to 1, will be restored from sessionStorage in useLayoutEffect
  const [currentPage, setCurrentPageInternal] = useState(1);
  const pageRestoredRef = useRef(false);
  const restoredPageNumberRef = useRef<number | null>(null); // Track what page we restored to

  const setCurrentPage = React.useCallback((newPage: number | ((prev: number) => number)) => {
    setCurrentPageInternal(newPage);
  }, []);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalQuestionGroups, setTotalQuestionGroups] = useState(0);
  const [paginatedQuestions, setPaginatedQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [allQuestionNumbers, setAllQuestionNumbers] = useState<number[]>([]);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [sortOption, setSortOption] = useState<'randomized' | 'popular' | 'new' | 'number'>('number');
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const filterAppliedFromUrl = useRef<boolean>(false);
  const isFetchingFilteredQuestions = useRef<boolean>(false);
  const lastFilterState = useRef<string>('');
  // metadataRefreshInProgress no longer needed — SWR handles dedup and revalidation
  const lastFetchedQuestionNumbersRef = useRef<string>('');
  const ROWS_PER_PAGE = 10;
  // Filter state - load from sessionStorage on mount
  const [filters, setFilters] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedFilters = sessionStorage.getItem('questions_page_filters');
      if (savedFilters) {
        try {
          return JSON.parse(savedFilters);
        } catch (e) {
          console.error('Error parsing saved filters:', e);
        }
      }
    }
    return {
      questions: {
        mandatory: false,
        answered: false,
        unanswered: false,
        required: false,
        submitted: false
      },
      tags: {
        value: false,
        lifestyle: false,
        look: false,
        trait: false,
        hobby: false,
        interest: false
      }
    };
  });
  const [pendingFilters, setPendingFilters] = useState<typeof filters>(filters);

  // Compute whether filter is active and data isn't ready (checked during render)
  const filterActive = filters.questions.answered || filters.questions.unanswered;
  const filterPending = filterActive && !filterFetchDone.current;

  // Show loader when per-page questions haven't been fetched yet even though
  // SWR metadata has loaded.  This closes the gap where `loading` becomes false
  // (SWR cache hit) but `fetchQuestionsForCurrentPage` hasn't completed yet.
  const awaitingPageFetch = !loading && allQuestionNumbers.length > 0 &&
    questions.length === 0 && !searchTerm.trim() && !filterActive;

  // Cycle loading text while questions are loading
  const isShowingLoader = loading || filterPending || awaitingPageFetch;
  useEffect(() => {
    if (!isShowingLoader) return;
    const interval = setInterval(() => {
      setLoadingTextIndex(prev => (prev + 1) % 3);
    }, 1500);
    return () => clearInterval(interval);
  }, [isShowingLoader]);

  // Save filters to sessionStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('questions_page_filters', JSON.stringify(filters));
    }
  }, [filters]);

  // Restore page from URL or sessionStorage on mount (only once) - runs synchronously before paint
  useLayoutEffect(() => {
    if (pageRestoredRef.current) return;
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const urlPage = urlParams.get('page') || searchParams?.get('page');

    if (urlPage) {
      const pageNum = parseInt(urlPage, 10);
      if (!isNaN(pageNum) && pageNum > 0) {
        pageRestoredRef.current = true;
        restoredPageNumberRef.current = pageNum;
        sessionStorage.setItem('questions_current_page', pageNum.toString());
        setCurrentPage(pageNum);
        return;
      }
    }

    const savedPage = sessionStorage.getItem('questions_current_page');
    if (savedPage) {
      const pageNum = parseInt(savedPage, 10);
      if (!isNaN(pageNum) && pageNum > 0) {
        pageRestoredRef.current = true;
        restoredPageNumberRef.current = pageNum;
        setCurrentPage(pageNum);
        return;
      }
    }

    pageRestoredRef.current = true;
    restoredPageNumberRef.current = 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save current page to sessionStorage whenever it changes (but not on initial restore)
  useEffect(() => {
    if (!pageRestoredRef.current) return;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('questions_current_page', currentPage.toString());
      restoredPageNumberRef.current = currentPage;
    }
  }, [currentPage]);

  // Sync pendingFilters with filters when modal opens or when filters change externally
  useEffect(() => {
    if (showFilterModal) {
      setPendingFilters(filters);
    }
  }, [showFilterModal, filters]);

  // --- SWR-powered data fetching (replaces manual fetch + sessionStorage cache) ---
  // Resolve user ID from localStorage
  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id');
    if (!storedUserId) {
      setError('User ID not found');
      router.push('/auth/login');
      return;
    }
    setUserId(storedUserId);

    // Handle refresh parameter (set when question is approved in dashboard)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.get('refresh') === 'true') {
        url.searchParams.delete('refresh');
        window.history.replaceState({}, '', url.toString());
      }
      // Clear legacy sessionStorage cache keys
      const invalidationFlag = sessionStorage.getItem('questions_metadata_invalidated');
      if (invalidationFlag) {
        sessionStorage.removeItem('questions_metadata_invalidated');
      }
    }
  }, [router]);

  // SWR hooks — fire in parallel, cached across page navigations
  const {
    questionNumbers: swrQuestionNumbers,
    totalQuestionGroups: swrTotalGroups,
    answerCounts: swrAnswerCounts,
    metadataLoading: swrMetadataLoading,
    mutateMetadata,
  } = useQuestionMetadata();
  const { answers: swrAnswers, answersLoading: swrAnswersLoading } = useUserAnswers<UserAnswer>(userId || null);

  // Stable serialized key to prevent infinite re-render loops.
  // SWR may return new object references for the same data; JSON.stringify
  // gives us a value-based comparison so the effect only fires on real changes.
  const metadataKey = JSON.stringify(swrQuestionNumbers);
  const answersKey = swrAnswers.length; // cheap proxy — length change means new data

  // Sync SWR metadata into existing state variables (bridges SWR → existing logic)
  useEffect(() => {
    if (swrQuestionNumbers.length > 0) {
      timingLog('metadata synced', { questionCount: swrQuestionNumbers.length, totalGroups: swrTotalGroups });
      setAllQuestionNumbers(swrQuestionNumbers);
      setTotalQuestionGroups(swrTotalGroups);
      setTotalPages(Math.ceil(swrTotalGroups / ROWS_PER_PAGE));
      setAnswerCounts(swrAnswerCounts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadataKey]);

  // Sync SWR answers into existing state
  const filterAnsweredRef = useRef(false);
  useEffect(() => {
    if (!swrAnswersLoading && swrAnswers !== userAnswers) {
      timingLog('answers synced', { count: swrAnswers.length });
      setUserAnswers(swrAnswers);
      answersLoaded.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answersKey, swrAnswersLoading]);

  // Handle answered/unanswered filter when both metadata and answers are ready
  useEffect(() => {
    if (swrAnswersLoading || swrQuestionNumbers.length === 0) return;
    const willFilterAnswered = filters.questions.answered;
    const willFilterUnanswered = filters.questions.unanswered;
    if (!(willFilterAnswered || willFilterUnanswered) || filterFetchDone.current) return;
    if (filterAnsweredRef.current) return; // prevent duplicate fetches
    filterAnsweredRef.current = true;

    const answeredNumbers = new Set(
      swrAnswers.map((a: UserAnswer) => a.question.question_number)
    );
    const matchingNumbers = willFilterAnswered
      ? swrQuestionNumbers.filter((n: number) => answeredNumbers.has(n))
      : swrQuestionNumbers.filter((n: number) => !answeredNumbers.has(n));

    if (matchingNumbers.length > 0) {
      const params = matchingNumbers.map((n: number) => `question_number=${n}`).join('&');
      fetch(`${getApiUrl(API_ENDPOINTS.QUESTIONS)}?${params}&page_size=500`, {
        headers: { 'Content-Type': 'application/json' },
      })
        .then(resp => resp.json())
        .then(data => {
          const allQuestions = (data.results || []).sort((a: Question, b: Question) => {
            if (a.question_number !== b.question_number) return a.question_number - b.question_number;
            return (a.group_number || 0) - (b.group_number || 0);
          });
          setFilteredQuestions(allQuestions);
          filterFetchDone.current = true;
          lastFilterState.current = `${willFilterAnswered}-${willFilterUnanswered}-${swrQuestionNumbers.length}-${swrAnswers.length}`;
        });
    } else {
      setFilteredQuestions([]);
      filterFetchDone.current = true;
      lastFilterState.current = `${willFilterAnswered}-${willFilterUnanswered}-${swrQuestionNumbers.length}-${swrAnswers.length}`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadataKey, answersKey, swrAnswersLoading, filters.questions.answered, filters.questions.unanswered]);

  // Derive loading from SWR states
  useEffect(() => {
    if (!swrMetadataLoading && !swrAnswersLoading) {
      timingLog('SWR loading complete (metadata + answers ready)');
      setLoading(false);
    }
  }, [swrMetadataLoading, swrAnswersLoading, timingLog]);

  // Click outside detection for sort dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showSortDropdown &&
        sortDropdownRef.current &&
        sortButtonRef.current &&
        !sortDropdownRef.current.contains(event.target as Node) &&
        !sortButtonRef.current.contains(event.target as Node)
      ) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSortDropdown]);

  // Check for filter parameter and apply answered filter (for "My Questions")
  // useLayoutEffect blocks paint — user never sees the stale empty content
  useLayoutEffect(() => {
    const filter = searchParams.get('filter');
    if (filter === 'answered' && !filterAppliedFromUrl.current) {
      filterFetchDone.current = false; // Reset so loader shows until filter data is ready
      setFilters(prev => ({
        ...prev,
        questions: {
          ...prev.questions,
          answered: true
        }
      }));
      filterAppliedFromUrl.current = true;
    } else if (filter !== 'answered') {
      filterAppliedFromUrl.current = false;
    }
  }, [searchParams]);

  // Fetch questions for current page
  const fetchQuestionsForCurrentPage = React.useCallback(async () => {
    if (allQuestionNumbers.length === 0) return;
    const fetchStart = performance.now();

    // Sort question numbers based on sort option
    const questionNumbersWithMetadata = allQuestionNumbers.map(qNum => ({
      questionNumber: qNum,
      answerCount: answerCounts[qNum] || 0
    }));

    let sorted;
    switch (sortOption) {
      case 'randomized':
        sorted = [...questionNumbersWithMetadata].sort(() => Math.random() - 0.5);
        break;
      case 'popular':
        sorted = [...questionNumbersWithMetadata].sort((a, b) => b.answerCount - a.answerCount);
        break;
      case 'new':
        sorted = [...questionNumbersWithMetadata].sort((a, b) => b.questionNumber - a.questionNumber);
        break;
      case 'number':
        sorted = [...questionNumbersWithMetadata].sort((a, b) => a.questionNumber - b.questionNumber);
        break;
      default:
        sorted = [...questionNumbersWithMetadata].sort((a, b) => a.questionNumber - b.questionNumber);
    }

    const sortedQuestionNumbers = sorted.map(item => item.questionNumber);

    try {
      // Calculate which question numbers to show on current page
      const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
      const endIndex = startIndex + ROWS_PER_PAGE;
      const pageQuestionNumbers = sortedQuestionNumbers.slice(startIndex, endIndex);
      const pageKey = pageQuestionNumbers.join(',');

      if (pageKey && pageKey === lastFetchedQuestionNumbersRef.current) {
        return;
      }

      if (pageQuestionNumbers.length === 0) {
        setQuestions([]);
        setFilteredQuestions([]);
        return;
      }

      // Don't touch `loading` here — it's controlled exclusively by the main
      // fetchQuestionsAndAnswers effect.  Setting it to true/false here caused a
      // race: this function's `setLoading(false)` fired before the main fetch
      // finished loading answers, exposing an empty "0 of 0 questions" page.

      // Build single batch API call with multiple question_number params
      const questionNumberParams = pageQuestionNumbers.map(num => `question_number=${num}`).join('&');
      let url = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?${questionNumberParams}&page_size=200`;

      // Fetch all pages if paginated
      let allPageQuestions = [];
      let hasMore = true;
      let pageNum = 1;

      while (hasMore && pageNum <= 5) { // Safety limit of 5 pages
        const response = await fetch(url, {
   
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        const results = data.results || [];
        allPageQuestions = [...allPageQuestions, ...results];

        if (data.next) {
          url = data.next;
          pageNum++;
        } else {
          hasMore = false;
        }
      }

      const pageQuestions = allPageQuestions;

      // Sort by question_number and group_number
      pageQuestions.sort((a, b) => {
        if (a.question_number !== b.question_number) {
          return a.question_number - b.question_number;
        }
        return (a.group_number || 0) - (b.group_number || 0);
      });

      setQuestions(pageQuestions);
      lastFetchedQuestionNumbersRef.current = pageKey;
      // Only set filteredQuestions if no filters are active
      // Otherwise, let the filter effects handle filteredQuestions
      const hasAnyFilters = Object.values(filters.questions).some(filter => filter) ||
                           Object.values(filters.tags).some(filter => filter);
      if (!hasAnyFilters) {
        setFilteredQuestions(pageQuestions);
      }
      timingLog('page questions fetched', {
        page: currentPage,
        questionsCount: pageQuestions.length,
        fetchDuration: `${(performance.now() - fetchStart).toFixed(0)}ms`,
      });
    } catch (error) {
      console.error('Error fetching questions for page:', error);
      setError('Failed to load questions');
    }
  }, [allQuestionNumbers, currentPage, sortOption, answerCounts, timingLog]);

  // Effect to handle page changes (skip if using client-side filters since we do client-side pagination)
  useEffect(() => {
    if (!pageRestoredRef.current) return;
    const hasAnsweredUnansweredFilter = filters.questions.answered || filters.questions.unanswered;
    if (hasAnsweredUnansweredFilter) return;
    if (allQuestionNumbers.length > 0) {
      fetchQuestionsForCurrentPage();
    }
  }, [fetchQuestionsForCurrentPage, filters.questions.answered, filters.questions.unanswered, allQuestionNumbers.length, questions.length, currentPage]);

  // Search questions by text (backend search)
  useEffect(() => {
    const term = searchTerm.trim();

    if (!term) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const debounceId = setTimeout(async () => {
      const activeTerm = term;
      const applyResults = (items: Question[]) => {
        if (cancelled || searchTerm.trim() !== activeTerm) return;
        setSearchResults(items);
        setFilteredQuestions(items);
        if (pageRestoredRef.current && restoredPageNumberRef.current !== null && restoredPageNumberRef.current !== 1) {
          // Don't reset — page was restored
        } else {
          setCurrentPage(1);
        }
      };

      try {
        setIsSearching(true);

        // 1) Server-side search first
        let serverResults: Question[] = [];
        try {
          let nextUrl: string | null = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?search=${encodeURIComponent(activeTerm)}&page_size=500&include_unapproved=true&skip_user_answers=true`;
          let page = 0;
          while (nextUrl && page < 10) { // safety limit
            const response = await fetch(nextUrl, {
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal
            });
            if (!response.ok) {
              throw new Error(`Failed to search questions: ${response.status}`);
            }
            const data = await response.json();
            const pageResults = data.results || [];
            serverResults.push(...pageResults);
            nextUrl = data.next || null;
            page += 1;
          }
        } catch (err) {
          if (controller.signal.aborted || cancelled) return;
          // fall through to client-side search
        }

        if (!cancelled && serverResults.length > 0) {
          serverResults.sort((a, b) => {
            if (a.question_number !== b.question_number) {
              return (a.question_number || 0) - (b.question_number || 0);
            }
            return (a.group_number || 0) - (b.group_number || 0);
          });
          applyResults(serverResults);
          return;
        }

        // 2) Client-side search: reuse cached index (<=5 minutes) or rebuild
        const now = Date.now();
        const indexIsFresh = searchIndex.length > 0 && searchIndexTimestamp.current && (now - searchIndexTimestamp.current) < 5 * 60 * 1000;

        let indexToUse = searchIndex;

        if (!indexIsFresh && !searchIndexBuilding.current) {
          searchIndexBuilding.current = true;
          try {
            let nextUrl: string | null = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?page_size=500&include_unapproved=true&skip_user_answers=true`;
            let page = 0;
            const results: Question[] = [];

            while (nextUrl && page < 25) { // safety limit
              const response = await fetch(nextUrl, {
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
          });

              if (!response.ok) {
                throw new Error(`Failed to build search index: ${response.status}`);
              }

              const data = await response.json();
              const pageResults = data.results || [];
              results.push(...pageResults);
              nextUrl = data.next || null;
              page += 1;
            }

            results.sort((a, b) => {
              if (a.question_number !== b.question_number) {
                return (a.question_number || 0) - (b.question_number || 0);
              }
              return (a.group_number || 0) - (b.group_number || 0);
            });

            if (!cancelled) {
              setSearchIndex(results);
              searchIndexTimestamp.current = now;
              indexToUse = results;
            }
          } finally {
            searchIndexBuilding.current = false;
          }
        }

        // If still no index (e.g., fetch failed), fall back to current questions list
        if (!indexToUse || indexToUse.length === 0) {
          indexToUse = questions;
        }

        const needle = term.toLowerCase();
        const matches = indexToUse.filter(q => {
          const isGrouped = q.is_group || ['grouped', 'four', 'triple', 'double'].includes(q.question_type || '');
          const groupNameText = (q.group_name_text || '').toLowerCase();
          const groupName = (q.group_name || '').toLowerCase();
          const text = (q.text || '').toLowerCase();
          const name = (q.question_name || '').toLowerCase();
          const num = (q.question_number ?? '').toString();
          // Only show approved questions
          if (q.is_approved === false) return false;
          // For grouped questions, match ONLY on group_name_text/group_name/question_name/number (ignore per-question text)
          if (isGrouped) {
            return (
              groupNameText.includes(needle) ||
              groupName.includes(needle) ||
              name.includes(needle) ||
              num.includes(needle)
            );
          }
          // For basic questions, match on text/question_name/number
          return text.includes(needle) || name.includes(needle) || num.includes(needle);
        });

        // Sort matches for stable display
        matches.sort((a, b) => {
          if (a.question_number !== b.question_number) {
            return (a.question_number || 0) - (b.question_number || 0);
          }
          return (a.group_number || 0) - (b.group_number || 0);
        });

        if (!cancelled) {
          applyResults(matches);
        }
      } catch (err: any) {
        if (controller.signal.aborted || cancelled) return;
        console.error('Error searching questions:', err);
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 300); // debounce keystrokes

    return () => {
      cancelled = true;
      clearTimeout(debounceId);
      controller.abort();
      setIsSearching(false);
    };
  }, [searchTerm, searchIndex, questions]);

  // Filtering system functions
  const applyFilters = useCallback(() => {
    // Group all questions for filtering logic
    const allGroupedQuestions = questions.reduce((acc, question) => {
      if (!acc[question.question_number]) {
        acc[question.question_number] = [];
      }
      acc[question.question_number].push(question);
      return acc;
    }, {} as Record<number, Question[]>);

    // For "answered/unanswered" filters, we need to check ALL question numbers, not just current page
    // For other filters (mandatory, required, submitted, tags), we can only check loaded questions
    const questionNumbers = Object.keys(allGroupedQuestions).map(Number);
    
    // Helper functions for filtering
    const isQuestionMandatory = (questionNumber: number): boolean => {
      const questionGroup = allGroupedQuestions[questionNumber];
      if (!questionGroup || questionGroup.length === 0) return false;
      return questionGroup[0].is_mandatory || false;
    };

    const isQuestionAnswered = (questionNumber: number): boolean => {
      // Always use userAnswers check since backend is_answered requires authentication
      // and may not be reliable for unauthenticated requests
      // Check if ANY answer exists for this question number
      // This works for ANY question number, not just loaded ones
      return userAnswers.some(answer => answer.question.question_number === questionNumber);
    };

    const isQuestionUnanswered = (questionNumber: number): boolean => {
      // A question is unanswered if the user has NO answers for that question number
      // This works for ANY question number, not just loaded ones
      return !isQuestionAnswered(questionNumber);
    };

    const isQuestionRequired = (questionNumber: number): boolean => {
      const questionGroup = allGroupedQuestions[questionNumber];
      if (!questionGroup || questionGroup.length === 0) return false;
      return questionGroup[0].is_required_for_match || false;
    };

    const isQuestionSubmitted = (questionNumber: number): boolean => {
      const questionGroup = allGroupedQuestions[questionNumber];
      if (!questionGroup || questionGroup.length === 0) return false;
      // Use the backend-computed field if available
      if (questionGroup[0].is_submitted_by_me !== undefined) {
        return questionGroup[0].is_submitted_by_me;
      }
      // Otherwise check if submitted_by matches current user
      const storedUserId = localStorage.getItem('user_id');
      return questionGroup[0].submitted_by?.id === storedUserId;
    };

    const getQuestionTags = (questionNumber: number): string[] => {
      const questionGroup = allGroupedQuestions[questionNumber];
      if (!questionGroup || questionGroup.length === 0) return [];
      // Tags are now objects, extract the names
      return questionGroup[0].tags?.map(tag => tag.name.toLowerCase()) || [];
    };
    
    // If filtering by answered/unanswered, we should check ALL question numbers, not just loaded ones
    // Otherwise, we can only filter the loaded questions
    const questionNumbersToCheck = (filters.questions.answered || filters.questions.unanswered) 
      ? allQuestionNumbers 
      : questionNumbers;
    
    const filtered = questionNumbersToCheck.filter(questionNumber => {
      // Apply question type filters
      const questionFilters = filters.questions;
      const tagFilters = filters.tags;
      
      // Check if any question filters are active
      const hasQuestionFilters = Object.values(questionFilters).some(filter => filter);
      const hasTagFilters = Object.values(tagFilters).some(filter => filter);
      
      // If no filters are active, show all questions
      if (!hasQuestionFilters && !hasTagFilters) {
        return true;
      }
      
      // Question type filter logic
      let passesQuestionFilters = true;
      if (hasQuestionFilters) {
        passesQuestionFilters = false;
        
        if (questionFilters.mandatory && isQuestionMandatory(questionNumber)) {
          passesQuestionFilters = true;
        }
        if (questionFilters.answered && isQuestionAnswered(questionNumber)) {
          passesQuestionFilters = true;
        }
        if (questionFilters.unanswered && isQuestionUnanswered(questionNumber)) {
          passesQuestionFilters = true;
        }
        if (questionFilters.required && isQuestionRequired(questionNumber)) {
          passesQuestionFilters = true;
        }
        if (questionFilters.submitted && isQuestionSubmitted(questionNumber)) {
          passesQuestionFilters = true;
        }
      }
      
      // Tag filter logic
      let passesTagFilters = true;
      if (hasTagFilters) {
        const questionTags = getQuestionTags(questionNumber);
        passesTagFilters = false;
        
        if (tagFilters.value && questionTags.includes('value')) {
          passesTagFilters = true;
        }
        if (tagFilters.lifestyle && questionTags.includes('lifestyle')) {
          passesTagFilters = true;
        }
        if (tagFilters.look && questionTags.includes('look')) {
          passesTagFilters = true;
        }
        if (tagFilters.trait && questionTags.includes('trait')) {
          passesTagFilters = true;
        }
        if (tagFilters.hobby && questionTags.includes('hobby')) {
          passesTagFilters = true;
        }
        if (tagFilters.interest && questionTags.includes('interest')) {
          passesTagFilters = true;
        }
      }
      
      return passesQuestionFilters && passesTagFilters;
    });
    
    // Update filteredQuestions with the actual question data
    const filteredQuestionData = questions.filter(q => 
      filtered.includes(q.question_number)
    );
    
    setFilteredQuestions(filteredQuestionData);

    if (pageRestoredRef.current && restoredPageNumberRef.current !== null && restoredPageNumberRef.current !== 1) {
      return;
    }
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    // Note: currentPage is intentionally NOT in dependencies to avoid re-filtering on page change
    }, [filters, questions, userAnswers, allQuestionNumbers]);

  // Fetch all questions when filtering by answered/unanswered (since we need ALL questions, not just current page)
  useEffect(() => {
    if (searchTerm.trim()) {
      return;
    }

    const fetchFilteredQuestions = async () => {
      // Only fetch if filtering by answered/unanswered
      if (!filters.questions.answered && !filters.questions.unanswered) {
        // Clear filtered questions if filter is turned off
        if (filteredQuestions.length > 0) {
          setFilteredQuestions([]);
        }
        filterFetchDone.current = true;
        isFetchingFilteredQuestions.current = false;
        return;
      }

      // Wait for the main fetch to finish (loading=false means metadata + answers are loaded).
      // Without this guard, the filter fires after metadata loads but before answers load,
      // causing a flash of "0 answered questions".
      if (loading) {
        return;
      }

      // Wait for metadata to load (need allQuestionNumbers to filter)
      if (allQuestionNumbers.length === 0) {
        filterFetchDone.current = true;
        return;
      }

      // Create a stable key for the current filter state to prevent duplicate fetches
      const filterKey = `${filters.questions.answered}-${filters.questions.unanswered}-${allQuestionNumbers.length}-${userAnswers.length}`;
      
      if (isFetchingFilteredQuestions.current || lastFilterState.current === filterKey) {
        return;
      }

      isFetchingFilteredQuestions.current = true;
      lastFilterState.current = filterKey;

      if (filters.questions.answered && userAnswers.length === 0) {
        setFilteredQuestions([]);
        filterFetchDone.current = true;
        isFetchingFilteredQuestions.current = false;
        return;
      }

      // Determine which question numbers match the filter
      const answeredQuestionNumbers = new Set(
        userAnswers.map(answer => answer.question.question_number)
      );

      let matchingQuestionNumbers: number[];
      if (filters.questions.answered) {
        matchingQuestionNumbers = allQuestionNumbers.filter(qNum =>
          answeredQuestionNumbers.has(qNum)
        );
      } else if (filters.questions.unanswered) {
        matchingQuestionNumbers = allQuestionNumbers.filter(qNum =>
          !answeredQuestionNumbers.has(qNum)
        );
      } else {
        return;
      }

      if (matchingQuestionNumbers.length === 0) {
        setFilteredQuestions([]);
        filterFetchDone.current = true;
        isFetchingFilteredQuestions.current = false;
        return;
      }

      try {
        // filterFetchDone ref is false — filterPending keeps the loader showing

        // Fetch ALL matching questions (not paginated)
        const questionNumberParams = matchingQuestionNumbers.map(num => `question_number=${num}`).join('&');
        let url = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?${questionNumberParams}&page_size=500`;

        // Fetch all pages if paginated
        let allQuestions: Question[] = [];
        let hasMore = true;
        let pageNum = 1;

        while (hasMore && pageNum <= 5) { // Safety limit of 5 pages
          const response = await fetch(url, {
            headers: {
              'Content-Type': 'application/json',
            },
          });

          const data = await response.json();
          const results = data.results || [];
          allQuestions = [...allQuestions, ...results];

          if (data.next) {
            url = data.next;
            pageNum++;
          } else {
            hasMore = false;
          }
        }

        // Sort by question_number and group_number
        allQuestions.sort((a, b) => {
          if (a.question_number !== b.question_number) {
            return a.question_number - b.question_number;
          }
          return (a.group_number || 0) - (b.group_number || 0);
        });

        setFilteredQuestions(allQuestions);
        if (pageRestoredRef.current && restoredPageNumberRef.current !== null && restoredPageNumberRef.current !== 1) {
          // Don't reset — page was restored
        } else {
          setCurrentPage(1);
        }
      } catch (error) {
        console.error('Error fetching filtered questions:', error);
        setError('Failed to load filtered questions');
      } finally {
        filterFetchDone.current = true;
        isFetchingFilteredQuestions.current = false;
      }
    };

    fetchFilteredQuestions();
  }, [filters.questions.answered, filters.questions.unanswered, allQuestionNumbers.length, userAnswers.length, searchTerm, loading]);

  // Apply filters when questions are loaded or filter state changes (for non-answered/unanswered filters)
  useEffect(() => {
    // Skip if filtering by answered/unanswered (handled by separate effect above)
    if (filters.questions.answered || filters.questions.unanswered) {
      return;
    }

    // If search is active, display search results and skip filter recalculation
    if (searchTerm.trim()) {
      setFilteredQuestions(searchResults);
      // When search results change, also keep search index in sync for fast re-search
      if (searchResults.length > 0 && searchIndex.length === 0) {
        setSearchIndex(searchResults);
        searchIndexTimestamp.current = Date.now();
      }
      if (pageRestoredRef.current && restoredPageNumberRef.current !== null && restoredPageNumberRef.current !== 1) {
        // Don't reset — page was restored
      } else if (currentPage !== 1) {
        setCurrentPage(1);
      }
      return;
    }

    // Check if any filters are active
    const hasQuestionFilters = Object.values(filters.questions).some(filter => filter);
    const hasTagFilters = Object.values(filters.tags).some(filter => filter);

    // If filters are active but questions haven't been loaded yet, trigger fetch
    // But only if page restoration is complete
    if ((hasQuestionFilters || hasTagFilters) && questions.length === 0 && allQuestionNumbers.length > 0 && pageRestoredRef.current) {
      fetchQuestionsForCurrentPage();
      return; // Will re-run when questions are loaded
    }

    if (questions.length > 0) {
      if (!hasQuestionFilters && !hasTagFilters) {
        // No filters active, show all questions
        setFilteredQuestions(questions);
      } else {
        // Apply filters
        applyFilters();
      }
    }
  }, [questions, filters, applyFilters, allQuestionNumbers.length, searchTerm, searchResults, currentPage]);

  // Sort handler
  const handleSortOptionSelect = (option: typeof sortOption) => {
    setSortOption(option);
    setShowSortDropdown(false);
  };

  // Question display names for the list (matching the actual onboarding page titles)
  const questionDisplayNames = React.useMemo((): Record<number, string> => ({
    1: 'What relationship are you looking for?',
    2: 'What gender do you identify with?',
    3: 'What ethnicity do you identify with?',
    4: 'What is your highest level of education?',
    5: 'Which diet best describes you?',
    6: 'How often do you exercise?',
    7: 'How often do you engage in these habits?',
    8: 'How important is religion in your life?',
    9: 'How important is politics in your life?',
    10: 'What are your thoughts on kids?'
  }), []);

  // Group questions intelligently based on question_type
  const groupedQuestions = React.useMemo(() => {
    const searchActive = searchTerm.trim().length > 0;

    const grouped: Record<string, { questions: Question[], displayName: string, questionNumber: number, answerCount: number, totalAnswerCount?: number }> = {};

    filteredQuestions.forEach(question => {
      const questionType = question.question_type || 'basic';

      if (questionType === 'basic') {
        // Basic questions - group by question_number to handle duplicates
        // If multiple basic questions have same question_number, show only the first one
        const key = `basic_${question.question_number}`;
        if (!grouped[key]) {
          grouped[key] = {
            questions: [question],
            displayName: question.text,
            questionNumber: question.question_number,
            answerCount: answerCounts[question.question_number] || 0
          };
        }
        // If duplicate, just add to questions array but don't change display
        else {
          grouped[key].questions.push(question);
        }
      } else if (['four', 'grouped', 'double', 'triple'].includes(questionType)) {
        // Grouped questions - combine by question_number
        const key = `group_${question.question_number}`;
        if (!grouped[key]) {
          // Use group_name_text if available, otherwise use the first question's text
          const displayText = question.group_name_text ||
                              (searchActive ? '' : questionDisplayNames[question.question_number]) ||
                              question.text;
          grouped[key] = {
            questions: [],
            displayName: displayText,
            questionNumber: question.question_number,
            answerCount: answerCounts[question.question_number] || 0
          };
        }
        grouped[key].questions.push(question);
      }
    });

    return grouped;
  }, [filteredQuestions, questionDisplayNames, answerCounts, allQuestionNumbers, searchTerm]);

  // Sort the grouped questions based on selected sort option
  // Simple approach: just use question_number from database, no complex calculations
  const sortedGroupedQuestions = React.useMemo(() => {
    const entries = Object.entries(groupedQuestions);

    let sorted;
    switch (sortOption) {
      case 'randomized':
        // Randomize order
        sorted = entries.sort(() => Math.random() - 0.5);
        break;
      case 'popular':
        // Sort by answer count (most answers first)
        sorted = entries.sort((a, b) => b[1].answerCount - a[1].answerCount);
        break;
      case 'new':
        // Sort by question number descending (recently asked)
        sorted = entries.sort((a, b) => b[1].questionNumber - a[1].questionNumber);
        break;
      case 'number':
        // Sort by question number ascending (numerical order)
        // But prioritize mandatory questions (1-10) to appear first
        sorted = entries.sort((a, b) => {
          const aIsMandatory = a[1].questions[0]?.is_mandatory && a[1].questionNumber <= 10;
          const bIsMandatory = b[1].questions[0]?.is_mandatory && b[1].questionNumber <= 10;
          
          // Mandatory questions come first
          if (aIsMandatory && !bIsMandatory) return -1;
          if (!aIsMandatory && bIsMandatory) return 1;
          
          // Within same category, sort by question_number
          return a[1].questionNumber - b[1].questionNumber;
        });
        break;
      default:
        sorted = entries.sort((a, b) => {
          const aIsMandatory = a[1].questions[0]?.is_mandatory && a[1].questionNumber <= 10;
          const bIsMandatory = b[1].questions[0]?.is_mandatory && b[1].questionNumber <= 10;
          
          if (aIsMandatory && !bIsMandatory) return -1;
          if (!aIsMandatory && bIsMandatory) return 1;
          
          return a[1].questionNumber - b[1].questionNumber;
        });
    }

    return sorted;
  }, [groupedQuestions, sortOption]);

  // Calculate pagination for filtered results (when using client-side filters)
  const isClientSideFiltered = searchTerm.trim().length > 0 ||
                               filters.questions.answered || filters.questions.unanswered ||
                                filters.questions.required || filters.questions.mandatory ||
                                filters.questions.submitted || Object.values(filters.tags).some(Boolean);
  const filteredTotalPages = isClientSideFiltered
    ? Math.ceil(sortedGroupedQuestions.length / ROWS_PER_PAGE)
    : totalPages;

  // Paginate sortedGroupedQuestions for display (when using client-side filters)
  const paginatedGroupedQuestions = React.useMemo(() => {
    if (!isClientSideFiltered) {
      // No client-side filters, show all grouped questions
      return sortedGroupedQuestions;
    }

    // Client-side pagination for filtered results
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    const endIndex = startIndex + ROWS_PER_PAGE;
    return sortedGroupedQuestions.slice(startIndex, endIndex);
  }, [sortedGroupedQuestions, currentPage, isClientSideFiltered]);


  // Get answer count for a question number from fetched data
  const getAnswerCount = (questionNumber: number): number => {
    return answerCounts[questionNumber] || 0;
  };

  const handleQuestionClick = (questionNumber: number) => {
    sessionStorage.setItem('questionsData', JSON.stringify(questions));
    sessionStorage.setItem('userAnswersData', JSON.stringify(userAnswers));
    sessionStorage.setItem('questionsDataTimestamp', Date.now().toString());
    sessionStorage.setItem('questions_current_page', currentPage.toString());
    router.push(`/questions/${questionNumber}`);
  };

  const handleFilterToggle = (category: 'questions' | 'tags', filter: string) => {
    if (category === 'questions') {
      updatePendingQuestionFilter(filter as keyof typeof pendingFilters.questions, !pendingFilters.questions[filter as keyof typeof pendingFilters.questions]);
    } else {
      updatePendingTagFilter(filter as keyof typeof pendingFilters.tags, !pendingFilters.tags[filter as keyof typeof pendingFilters.tags]);
    }
  };

  const updatePendingQuestionFilter = (filterType: keyof typeof pendingFilters.questions, value: boolean) => {
    setPendingFilters(prev => ({
      ...prev,
      questions: {
        ...prev.questions,
        [filterType]: value
      }
    }));
  };

  const updatePendingTagFilter = (filterType: keyof typeof pendingFilters.tags, value: boolean) => {
    setPendingFilters(prev => ({
      ...prev,
      tags: {
        ...prev.tags,
        [filterType]: value
      }
    }));
  };

  const updateQuestionFilter = (filterType: keyof typeof filters.questions, value: boolean) => {
    setFilters(prev => ({
      ...prev,
      questions: {
        ...prev.questions,
        [filterType]: value
      }
    }));
    
    // If toggling off the "answered" filter and URL has filter=answered, remove it from URL
    if (filterType === 'answered' && !value && searchParams.get('filter') === 'answered') {
      const url = new URL(window.location.href);
      url.searchParams.delete('filter');
      window.history.replaceState({}, '', url.toString());
      // Reset the flag so URL changes don't re-apply the filter
      filterAppliedFromUrl.current = false;
    }
  };

  const updateTagFilter = (filterType: keyof typeof filters.tags, value: boolean) => {
    setFilters(prev => ({
      ...prev,
      tags: {
        ...prev.tags,
        [filterType]: value
      }
    }));
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      questions: {
        mandatory: false,
        answered: false,
        unanswered: false,
        required: false,
        submitted: false
      },
      tags: {
        value: false,
        lifestyle: false,
        look: false,
        trait: false,
        hobby: false,
        interest: false
      }
    };
    
    setPendingFilters(clearedFilters);
  };

  const applyFiltersAndClose = async () => {
    // Check if the new filters require fetching data (answered/unanswered filters)
    const requiresFetching = 
      (pendingFilters.questions.answered && !filters.questions.answered) ||
      (pendingFilters.questions.unanswered && !filters.questions.unanswered) ||
      (filters.questions.answered && !pendingFilters.questions.answered) ||
      (filters.questions.unanswered && !pendingFilters.questions.unanswered);
    
    // Update filters state first
    setFilters(pendingFilters);
    
    // Close modal immediately if no fetching needed
    if (!requiresFetching) {
      setShowFilterModal(false);
      // Filters will be applied via useEffect that watches filters
      return;
    }
    
    // Reset ref so loader shows until filter fetch completes
    filterFetchDone.current = false;
    setShowFilterModal(false);
    // The fetchFilteredQuestions useEffect will handle the actual fetching
    // and will set filterFetchDone.current = true when done
  };


  if (loading || filterPending) {
    const loadingTexts = ['Loading questions...', 'Gathering your answers...', 'Almost ready...'];
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          {/* Heart with math operators */}
          <div className="relative w-40 h-40 flex items-center justify-center">
            {['×', '÷', '+', '−', '=', '%', '√'].map((op, i) => (
              <span
                key={op}
                className="questions-math-operator absolute text-xl font-bold"
                style={{
                  color: '#672DB7',
                  opacity: 0.6,
                  animationDelay: `${i * 0.3}s`,
                  top: '50%',
                  left: '50%',
                }}
              >
                {op}
              </span>
            ))}
            <svg
              className="questions-heart-pulse relative z-10"
              width="72"
              height="72"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="questionsHeartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#A855F7" />
                  <stop offset="50%" stopColor="#7C3AED" />
                  <stop offset="100%" stopColor="#672DB7" />
                </linearGradient>
              </defs>
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill="url(#questionsHeartGradient)"
              />
            </svg>
          </div>
          <p className="mt-6 text-lg font-semibold text-gray-700 questions-loading-text">
            {loadingTexts[loadingTextIndex]}
          </p>
        </div>

        <style jsx>{`
          @keyframes questionsHeartPulse {
            0%, 100% { transform: scale(1); }
            15% { transform: scale(1.18); }
            30% { transform: scale(1); }
            45% { transform: scale(1.12); }
            60% { transform: scale(1); }
          }

          @keyframes questionsOrbit0 { 0% { transform: translate(-50%, -50%) rotate(0deg) translateX(60px) rotate(0deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(360deg) translateX(60px) rotate(-360deg); opacity: 0.5; } }
          @keyframes questionsOrbit1 { 0% { transform: translate(-50%, -50%) rotate(51deg) translateX(64px) rotate(-51deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(411deg) translateX(64px) rotate(-411deg); opacity: 0.5; } }
          @keyframes questionsOrbit2 { 0% { transform: translate(-50%, -50%) rotate(103deg) translateX(58px) rotate(-103deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(463deg) translateX(58px) rotate(-463deg); opacity: 0.5; } }
          @keyframes questionsOrbit3 { 0% { transform: translate(-50%, -50%) rotate(154deg) translateX(66px) rotate(-154deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(514deg) translateX(66px) rotate(-514deg); opacity: 0.5; } }
          @keyframes questionsOrbit4 { 0% { transform: translate(-50%, -50%) rotate(206deg) translateX(60px) rotate(-206deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(566deg) translateX(60px) rotate(-566deg); opacity: 0.5; } }
          @keyframes questionsOrbit5 { 0% { transform: translate(-50%, -50%) rotate(257deg) translateX(62px) rotate(-257deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(617deg) translateX(62px) rotate(-617deg); opacity: 0.5; } }
          @keyframes questionsOrbit6 { 0% { transform: translate(-50%, -50%) rotate(309deg) translateX(58px) rotate(-309deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(669deg) translateX(58px) rotate(-669deg); opacity: 0.5; } }

          @keyframes questionsTextFade {
            0%, 100% { opacity: 0; transform: translateY(4px); }
            15%, 85% { opacity: 1; transform: translateY(0); }
          }

          .questions-heart-pulse {
            animation: questionsHeartPulse 1.6s ease-in-out infinite;
          }

          .questions-math-operator:nth-child(1) { animation: questionsOrbit0 3.5s linear infinite both; }
          .questions-math-operator:nth-child(2) { animation: questionsOrbit1 4.0s linear infinite both; }
          .questions-math-operator:nth-child(3) { animation: questionsOrbit2 3.2s linear infinite both; }
          .questions-math-operator:nth-child(4) { animation: questionsOrbit3 3.8s linear infinite both; }
          .questions-math-operator:nth-child(5) { animation: questionsOrbit4 4.2s linear infinite both; }
          .questions-math-operator:nth-child(6) { animation: questionsOrbit5 3.6s linear infinite both; }
          .questions-math-operator:nth-child(7) { animation: questionsOrbit6 3.4s linear infinite both; }

          .questions-loading-text {
            animation: questionsTextFade 1.5s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-[#672DB7] text-white rounded-md hover:bg-purple-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header — padding so search bar never overlaps logo or hamburger */}
      <div className="flex items-center border-b border-gray-200 py-2 sm:py-3 pl-[52px] pr-[52px] sm:pl-14 sm:pr-14 relative">
        <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2">
          <Image
            src="/assets/mmlogox.png"
            alt="Logo"
            width={32}
            height={32}
          />
        </div>
        {/* Search + Filter + Sort — search bar WIDTH limited on small/medium screens */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full max-w-2xl mx-auto min-w-0">
          <div className="relative w-[240px] min-[400px]:w-[300px] sm:w-[360px] md:w-[440px] lg:flex-1 lg:min-w-0 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full min-w-0 pl-7 pr-7 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-full bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <div className="absolute inset-y-0 right-0 pr-2.5 sm:pr-3 flex items-center">
              {isSearching && (
                <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"></path>
                </svg>
              )}
              {!isSearching && searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-gray-500 hover:text-black text-sm focus:outline-none"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          
          <button
            onClick={() => setShowFilterModal(true)}
            className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 md:w-10 md:h-10 lg:w-auto lg:h-auto px-0 py-0 sm:px-4 sm:py-3 md:px-0 md:py-0 lg:px-4 lg:py-3 border border-gray-300 rounded-full text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none cursor-pointer"
          >
            <svg className="w-4 h-4 text-black sm:mr-1 md:mr-0 lg:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
            </svg>
            <span className="hidden sm:inline md:hidden lg:inline">Filter</span>
          </button>
          
          <div className="relative flex-shrink-0">
            <button
              ref={sortButtonRef}
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 md:w-10 md:h-10 lg:w-auto lg:h-auto px-0 py-0 sm:px-4 sm:py-3 md:px-0 md:py-0 lg:px-4 lg:py-3 border border-gray-300 rounded-full text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              <svg className="w-4 h-4 inline text-black sm:mr-1 md:mr-0 lg:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <span className="hidden sm:inline md:hidden lg:inline">Sort</span>
            </button>

            {/* Sort Dropdown */}
            {showSortDropdown && (
              <div
                ref={sortDropdownRef}
                className="absolute top-full mt-2 right-0 w-64 bg-white rounded-2xl shadow-lg border border-gray-200 py-2 z-50"
              >
                <button
                  onClick={() => handleSortOptionSelect('randomized')}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="font-semibold text-black">Explore (default)</div>
                  <div className="text-sm text-gray-500">Randomized</div>
                </button>

                <button
                  onClick={() => handleSortOptionSelect('popular')}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="font-semibold text-black">Popular</div>
                  <div className="text-sm text-gray-500">Questions with the most answers</div>
                </button>

                <button
                  onClick={() => handleSortOptionSelect('new')}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="font-semibold text-black">New</div>
                  <div className="text-sm text-gray-500">Recently asked</div>
                </button>

                <button
                  onClick={() => handleSortOptionSelect('number')}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="font-semibold text-black">Number</div>
                  <div className="text-sm text-gray-500">Questions in numerical order</div>
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2">
          <HamburgerMenu />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-6 max-w-6xl mx-auto">
        {/* Title and Ask Button */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Questions</h1>
            <p className="text-gray-600">
              Showing {paginatedGroupedQuestions.length} of {isClientSideFiltered ? sortedGroupedQuestions.length : totalQuestionGroups} questions
            </p>
          </div>
          <button 
            onClick={() => setShowAskQuestionModal(true)}
            className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium cursor-pointer hover:bg-gray-800"
          >
            Ask a Question
          </button>
        </div>

        {/* Questions List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Question Type Filters */}
              {filters.questions.mandatory && (
                <span className="relative inline-flex items-center justify-center px-2 py-1 rounded-full text-sm font-medium border-2 border-red-500 bg-red-50 text-gray-900">
                  <Image src="/assets/asterisk.png" alt="Mandatory" width={24} height={24} />
                </span>
              )}
              {filters.questions.answered && (
                <span className="relative inline-flex items-center justify-center px-2 py-1 rounded-full text-sm font-medium border-2 border-green-500 bg-green-50 text-gray-900">
                  <Image src="/assets/answered.png" alt="Answered" width={24} height={24} />
                </span>
              )}
              {filters.questions.unanswered && (
                <span className="relative inline-flex items-center justify-center px-2 py-1 rounded-full text-sm font-medium border-2 border-blue-500 bg-blue-50 text-gray-900">
                  <Image src="/assets/un.png" alt="Unanswered" width={24} height={24} />
                </span>
              )}
              {filters.questions.required && (
                <span className="relative inline-flex items-center justify-center px-2 py-1 rounded-full text-sm font-medium border-2 border-gray-800 bg-gray-50 text-gray-900">
                  <Image src="/assets/req.png" alt="Required" width={24} height={24} />
                </span>
              )}
              {filters.questions.submitted && (
                <span className="relative inline-flex items-center justify-center px-2 py-1 rounded-full text-sm font-medium border-2 border-orange-500 bg-orange-50 text-gray-900">
                  <Image src="/assets/submitted.png" alt="Submitted" width={24} height={24} />
                </span>
              )}

              {/* Tag Filters */}
              {Object.entries(filters.tags).map(([tagKey, isActive]) => {
                if (!isActive) return null;
                const tagName = tagKey.charAt(0).toUpperCase() + tagKey.slice(1);
                return (
                  <span
                    key={tagKey}
                    className="relative px-4 py-2 rounded-full border-2 border-black text-gray-700 text-sm font-medium cursor-pointer hover:border-gray-600"
                  >
                    <div className="absolute inset-0 bg-black opacity-3" style={{ borderRadius: '24px' }}></div>
                    <span className="relative z-10">{tagName}</span>
                  </span>
                );
              })}
            </div>
            <span className="text-sm font-medium text-black pr-4">Times Answered</span>
          </div>
          {paginatedGroupedQuestions
            .map(([key, group]) => {
              const answerCount = getAnswerCount(group.questionNumber);
              return (
                <div
                  key={String(key)}
                  onClick={() => handleQuestionClick(group.questionNumber)}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-start">
                      <span className="text-sm text-gray-500 mr-3">{group.questionNumber}.</span>
                      <span className="text-gray-900 flex-1">{group.displayName}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-[#ECECEC] flex items-center justify-center">
                      <span className="text-sm text-gray-700 font-medium">{answerCount}</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Pagination Controls */}
        {paginatedGroupedQuestions.length > 0 && (isClientSideFiltered ? filteredTotalPages : totalPages) > 1 && (
          <div className="flex justify-center items-center space-x-4 mt-8">
            {/* Previous Button */}
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`text-gray-600 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Page Numbers */}
            {Array.from({ length: Math.min(isClientSideFiltered ? filteredTotalPages : totalPages, 7) }, (_, i) => {
              const displayTotalPages = isClientSideFiltered ? filteredTotalPages : totalPages;
              let pageNum;
              if (displayTotalPages <= 7) {
                pageNum = i + 1;
              } else {
                if (currentPage <= 4) {
                  pageNum = i + 1;
                } else if (currentPage >= displayTotalPages - 3) {
                  pageNum = displayTotalPages - 6 + i;
                } else {
                  pageNum = currentPage - 3 + i;
                }
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 flex items-center justify-center text-sm rounded-full ${
                    pageNum === currentPage
                      ? 'bg-black text-white font-medium'
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Show ellipsis and last page if needed */}
            {(isClientSideFiltered ? filteredTotalPages : totalPages) > 7 && currentPage < (isClientSideFiltered ? filteredTotalPages : totalPages) - 3 && (
              <>
                <span className="text-gray-400">...</span>
                <button
                  onClick={() => setCurrentPage(isClientSideFiltered ? filteredTotalPages : totalPages)}
                  className="w-8 h-8 text-gray-600 flex items-center justify-center text-sm hover:text-black"
                >
                  {isClientSideFiltered ? filteredTotalPages : totalPages}
                </button>
              </>
            )}

            {/* Next Button */}
            <button
              onClick={() => setCurrentPage(Math.min(isClientSideFiltered ? filteredTotalPages : totalPages, currentPage + 1))}
              disabled={currentPage === (isClientSideFiltered ? filteredTotalPages : totalPages)}
              className={`text-gray-600 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50" 
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
          onClick={() => setShowFilterModal(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-lg w-full max-w-2xl mx-4 h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button 
                onClick={() => setShowFilterModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-8 flex-1 overflow-y-auto">
              {/* Questions Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Questions</h3>
                <div className="grid grid-cols-5 gap-3 max-w-xl">
                  {/* Mandatory */}
                  <button
                    onClick={() => handleFilterToggle('questions', 'mandatory')}
                    className={`relative p-1 rounded-3xl border-2 transition-colors aspect-square cursor-pointer ${
                      pendingFilters.questions.mandatory 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Image src="/assets/asterisk.png" alt="Mandatory" width={40} height={40} />
                      <span className="text-xs font-medium text-gray-900 text-center leading-none">Mandatory</span>
                    </div>
                  </button>

                  {/* Answered */}
                  <button
                    onClick={() => handleFilterToggle('questions', 'answered')}
                    className={`flex flex-col items-center justify-center p- rounded-3xl border-2 transition-colors aspect-square gap-0 cursor-pointer ${
                      pendingFilters.questions.answered 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <Image src="/assets/answered.png" alt="Answered" width={40} height={40} />
                    </div>
                    <span className="text-xs font-medium text-gray-900 text-center leading-none">Answered</span>
                  </button>

                  {/* Unanswered */}
                  <button
                    onClick={() => handleFilterToggle('questions', 'unanswered')}
                    className={`flex flex-col items-center justify-center p-0 rounded-3xl border-2 transition-colors aspect-square gap-0 !cursor-pointer ${
                      pendingFilters.questions.unanswered 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <Image src="/assets/un.png" alt="Unanswered" width={40} height={40} />
                    </div>
                    <span className="text-xs font-medium text-gray-900 text-center leading-none">Unanswered</span>
                  </button>

                  {/* Required */}
                  <button
                    onClick={() => handleFilterToggle('questions', 'required')}
                    className={`flex flex-col items-center justify-center p-0 rounded-3xl border-2 transition-colors aspect-square gap-0 cursor-pointer ${
                      pendingFilters.questions.required 
                        ? 'border-gray-800 bg-gray-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <Image src="/assets/req.png" alt="Required" width={40} height={40} />
                    </div>
                    <span className="text-xs font-medium text-gray-900 text-center leading-none">Required</span>
                  </button>

                  {/* Submitted */}
                  <button
                    onClick={() => handleFilterToggle('questions', 'submitted')}
                    className={`flex flex-col items-center justify-center p-0 rounded-3xl border-2 transition-colors aspect-square gap-0 cursor-pointer ${
                      pendingFilters.questions.submitted 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <Image src="/assets/submitted.png" alt="Submitted" width={40} height={40} />
                    </div>
                    <span className="text-xs font-medium text-gray-900 text-center leading-none">Submitted</span>
                  </button>
                </div>
              </div>

              {/* Tags Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Tags</h3>
                <div className="flex flex-wrap gap-3">
                  {['Value', 'Lifestyle', 'Look', 'Trait', 'Hobby', 'Interest'].map((tag) => {
                    const tagKey = tag.toLowerCase() as keyof typeof pendingFilters.tags;
                    const isSelected = pendingFilters.tags[tagKey];
                    
                    return (
                      <button
                        key={tag}
                        onClick={() => handleFilterToggle('tags', tagKey)}
                        className={`relative px-4 py-2 rounded-full border text-sm font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-black text-gray-700 border-2'
                            : 'border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 bg-black opacity-3" style={{ borderRadius: '24px' }}></div>
                        )}
                        <span className="relative z-10">{tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200">
              <button
                onClick={clearAllFilters}
                className="text-gray-600 hover:text-gray-800 font-medium cursor-pointer"
              >
                Clear all
              </button>
              <button
                onClick={applyFiltersAndClose}
                className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 font-medium cursor-pointer"
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ask a Question Modal */}
      {showAskQuestionModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50" 
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
          onClick={() => setShowAskQuestionModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-lg p-0 w-full max-w-xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Ask a Question</h2>
              <button
                onClick={() => setShowAskQuestionModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="flex items-center justify-center">
                <div style={{ width: '500px' }}>
                  <p className="text-gray-600 text-sm mb-6">
                    Submit a question that reflects what you care about — serious or silly, it&apos;s up to you.
                  </p>

              {/* Switches - Commented out for now */}
              {/*
              <div className="flex items-center justify-between mb-6">
                {/* Required For Match Switch */}
                {/*
                <div className="flex items-center space-x-3">
                  <label className="text-sm font-medium text-gray-700">Required For Match</label>
                  <button
                    onClick={() => setIsRequiredForMatch(!isRequiredForMatch)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      isRequiredForMatch ? 'bg-black' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isRequiredForMatch ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Share Answer Switch */}
                {/*
                <div className="flex items-center space-x-3">
                  <label className="text-sm font-medium text-gray-700">Share Answer</label>
                  <button
                    onClick={() => setShareAnswer(!shareAnswer)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      shareAnswer ? 'bg-black' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        shareAnswer ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
              */}

              {/* Question Text Input */}
              <div className="mb-6">
                <div className="relative">
                  <textarea
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value.slice(0, 100))}
                    placeholder="Write your question here..."
                    className="w-full p-4 border border-gray-300 resize-none focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                    style={{ borderRadius: '24px' }}
                    rows={2}
                  />
                  <div className="absolute bottom-2 right-3 text-xs text-gray-400">
                    {questionText.length}/100
                  </div>
                </div>
              </div>

              {/* Value Labels */}
              <div className="mb-3">
                <div className="flex items-center justify-center">
                  <div className="flex gap-8" style={{ width: '500px' }}>
                    <div className="w-32">
                      <input
                        type="text"
                        value={valueLabel1}
                        onChange={(e) => setValueLabel1(e.target.value)}
                        placeholder="Label 1"
                        className="w-full py-1.5 px-3 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-sm"
                        style={{ borderRadius: '24px' }}
                      />
                    </div>
                    <div className="flex-1"></div>
                    <div className="w-32">
                      <input
                        type="text"
                        value={valueLabel5}
                        onChange={(e) => setValueLabel5(e.target.value)}
                        placeholder="Label 5"
                        className="w-full py-1.5 px-3 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-sm text-right"
                        style={{ borderRadius: '24px' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Slider */}
              <div className="mb-6">
                <div className="flex items-center justify-center">
                  <div
                    className="w-full h-6 relative flex items-center select-none"
                    style={{ width: '500px', userSelect: 'none' }}
                    onMouseDown={() => {
                      document.body.style.userSelect = 'none';
                      window.getSelection()?.removeAllRanges();
                    }}
                    onMouseUp={() => {
                      document.body.style.userSelect = '';
                    }}
                    onMouseLeave={() => {
                      document.body.style.userSelect = '';
                    }}
                    onDragStart={(e) => e.preventDefault()}
                  >
                    {/* Left number inside track */}
                    <span className="absolute left-2 text-xs text-gray-500 pointer-events-none z-10">1</span>
                    
                    {/* Slider Track */}
                    <div 
                      className="w-full h-6 rounded-[20px] relative cursor-pointer transition-all duration-200 border"
                      style={{
                        backgroundColor: '#F5F5F5',
                        borderColor: '#ADADAD'
                      }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const percentage = clickX / rect.width;
                        const newValue = Math.round(percentage * 4) + 1; // 1-5 range
                        setSliderValue(Math.max(1, Math.min(5, newValue)));
                      }}
                      onMouseMove={(e) => {
                        if (e.buttons === 1) { // Left mouse button
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const percentage = clickX / rect.width;
                          const newValue = Math.round(percentage * 4) + 1; // 1-5 range
                          setSliderValue(Math.max(1, Math.min(5, newValue)));
                        }
                      }}
                      onMouseDown={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const percentage = clickX / rect.width;
                        const newValue = Math.round(percentage * 4) + 1; // 1-5 range
                        setSliderValue(Math.max(1, Math.min(5, newValue)));
                      }}
                      onDragStart={(e) => e.preventDefault()}
                    />

                    {/* Right number inside track */}
                    <span className="absolute right-2 text-xs text-gray-500 pointer-events-none z-10">5</span>
                  </div>
                </div>
              </div>

              {/* Tags Section — max 1 tag */}
              <div className="mb-6">
                <h3 className="text-base font-semibold mb-3">Select Tag</h3>
                <div className="flex flex-wrap gap-2">
                  {['Value', 'Lifestyle', 'Look', 'Trait', 'Hobby', 'Interest'].map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTags([]);
                          } else {
                            setSelectedTags([tag]);
                          }
                        }}
                        className={`relative px-4 py-2 border text-sm font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-black text-gray-700 border-2'
                            : 'border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                        style={{ borderRadius: '24px' }}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 bg-black opacity-3" style={{ borderRadius: '24px' }}></div>
                        )}
                        <span className="relative z-10">{tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-8 border-t border-gray-200">
              <button
                onClick={async () => {
                  if (!questionText.trim() || !valueLabel1.trim() || !valueLabel5.trim() || selectedTags.length === 0) {
                    return;
                  }

                  setIsSubmittingQuestion(true);
                  
                  try {
                    // Get user ID from localStorage
                    const storedUserId = localStorage.getItem('user_id');
                    
                    // Create the question - question_number is NOT sent, assigned only on approval
                    const questionData = {
                        text: questionText.trim(),
                        question_name: questionText.trim().substring(0, 50),  // Auto-generate name from text
                        // question_number is NOT included - assigned only when approved by admin
                        question_type: 'basic',  // Default to basic type
                        tags: selectedTags.map(tag => tag.toLowerCase()),
                        is_approved: false,  // User-submitted questions need approval
                        is_mandatory: false,
                        is_required_for_match: isRequiredForMatch,
                        skip_me: false,
                        skip_looking_for: false,
                        open_to_all_me: shareAnswer,
                        open_to_all_looking_for: shareAnswer,
                        is_group: false,
                        value_label_1: valueLabel1.trim(),
                        value_label_5: valueLabel5.trim(),
                        user_id: storedUserId  // Include user_id so backend can identify the submitter
                      };
                    
                    console.log('📤 Submitting question with data:', questionData);
                    const response = await fetch(getApiUrl(API_ENDPOINTS.QUESTIONS), {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(questionData),
                    });

                    console.log('📡 Response status:', response.status);
                    const responseData = await response.json();
                    console.log('📡 Response data:', responseData);
                    console.log('📝 Created question id:', responseData.id);
                    console.log('📝 Question number (will be assigned on approval):', responseData.question_number || 'NULL (pending approval)');

                    if (response.ok) {
                      // Reset form and close modal
                      setQuestionText('');
                      setSelectedTags([]);
                      setValueLabel1('');
                      setValueLabel5('');
                      setIsRequiredForMatch(false);
                      setShareAnswer(true);
                      setSliderValue(3);
                      setShowAskQuestionModal(false);
                      
                      // Show success message
                      setShowSuccessMessage(true);
                      setTimeout(() => setShowSuccessMessage(false), 3000);
                    } else {
                      alert(responseData.error || 'Failed to submit question. Please try again.');
                    }
                  } catch (error) {
                    console.error('Error submitting question:', error);
                    alert('Failed to submit question. Please check your connection and try again.');
                  } finally {
                    setIsSubmittingQuestion(false);
                  }
                }}
                disabled={!questionText.trim() || !valueLabel1.trim() || !valueLabel5.trim() || selectedTags.length === 0 || isSubmittingQuestion}
                className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 font-medium cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isSubmittingQuestion ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 px-6 py-4 flex items-center space-x-3">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-gray-900 font-medium">Question successfully submitted for approval</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuestionsPage() {
  return (
    <ProtectedPageGate>
      <QuestionsPageContent />
    </ProtectedPageGate>
  );
}
