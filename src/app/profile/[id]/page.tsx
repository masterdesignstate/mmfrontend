'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import Image from 'next/image';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
import { apiService } from '@/services/api';
import HamburgerMenu from '@/components/HamburgerMenu';
import MatchCelebration from '@/components/MatchCelebration';
import ActivityStatus from '@/components/ActivityStatus';

// Types for user profile and answers
interface UserProfile {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  age?: number;
  profile_photo?: string;
  bio?: string;
  height?: number;
  live?: string;
  from_location?: string;
  tagline?: string;
  is_online?: boolean;
  last_active?: string | null;
  questions_answered_count?: number;
}

interface UserAnswer {
  id: string;
  question: {
    id: string;
    question_name: string;
    question_number: number;
    group_number?: number;
    group_name?: string;
    group_name_text?: string;
    question_type?: 'basic' | 'four' | 'grouped' | 'double' | 'triple';
    text: string;
  };
  me_answer: number;
  looking_for_answer: number;
}

interface ProfileIcon {
  image: string;
  label: string;
  show: boolean;
}

// Interactive editable slider component (for answering pending questions inline)
const EditableSlider = ({ value, onChange, isOpenToAll = false, isImportance = false, labels = [] }: {
  value: number;
  onChange: (value: number) => void;
  isOpenToAll?: boolean;
  isImportance?: boolean;
  labels?: Array<{ value: string; answer_text: string }>;
}) => {
  const [fillWidth, setFillWidth] = React.useState('0%');
  const hasAnimatedRef = React.useRef(false);
  const raf1Ref = React.useRef<number | null>(null);
  const raf2Ref = React.useRef<number | null>(null);

  React.useLayoutEffect(() => {
    if (isOpenToAll && !hasAnimatedRef.current) {
      setFillWidth('0%');
      raf1Ref.current = requestAnimationFrame(() => {
        raf2Ref.current = requestAnimationFrame(() => {
          setFillWidth('100%');
          hasAnimatedRef.current = true;
        });
      });
      return () => {
        if (raf1Ref.current) cancelAnimationFrame(raf1Ref.current);
        if (raf2Ref.current) cancelAnimationFrame(raf2Ref.current);
      };
    }
    if (!isOpenToAll) {
      hasAnimatedRef.current = false;
      setFillWidth('0%');
    }
  }, [isOpenToAll]);

  const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isOpenToAll) return;
    const sortedLabels = [...labels].sort((a, b) => parseInt(a.value) - parseInt(b.value));
    const minVal = sortedLabels.length > 0 ? parseInt(sortedLabels[0].value) : 1;
    const maxVal = sortedLabels.length > 0 ? parseInt(sortedLabels[sortedLabels.length - 1].value) : 5;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newValue = Math.round(percentage * (maxVal - minVal)) + minVal;
    onChange(Math.max(minVal, Math.min(maxVal, newValue)));
  };

  const handleSliderDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons === 1 && !isOpenToAll) handleSliderClick(e);
  };

  const sortedLabels = [...labels].sort((a, b) => parseInt(a.value) - parseInt(b.value));
  const minValue = sortedLabels.length > 0 ? parseInt(sortedLabels[0].value) : 1;
  const maxValue = sortedLabels.length > 0 ? parseInt(sortedLabels[sortedLabels.length - 1].value) : 5;

  return (
    <div className="w-full h-6 min-h-6 sm:h-5 relative flex items-center select-none"
      style={{ userSelect: 'none' }}
      onMouseDown={() => { document.body.style.userSelect = 'none'; window.getSelection()?.removeAllRanges(); }}
      onMouseUp={() => { document.body.style.userSelect = ''; }}
      onMouseLeave={() => { document.body.style.userSelect = ''; }}
      onDragStart={(e) => e.preventDefault()}
    >
      <span className={`absolute left-2 text-xs pointer-events-none z-10 ${isOpenToAll ? 'text-white font-medium' : 'text-gray-500'}`}>{minValue}</span>
      <div
        className="w-full h-full min-h-5 rounded-[20px] relative cursor-pointer transition-all duration-200 border"
        style={{
          backgroundColor: isOpenToAll ? '#672DB7' : '#F5F5F5',
          borderColor: isOpenToAll ? '#672DB7' : '#ADADAD'
        }}
        onClick={handleSliderClick}
        onMouseMove={handleSliderDrag}
        onMouseDown={handleSliderDrag}
        onDragStart={(e) => e.preventDefault()}
      >
        {isOpenToAll && (
          <div
            className="absolute top-0 left-0 h-full bg-[#672DB7] rounded-[20px]"
            style={{ width: fillWidth, transition: 'width 1.2s ease-in-out' }}
          />
        )}
      </div>
      {!isOpenToAll && (
        <div
          className="absolute top-1/2 transform -translate-y-1/2 w-7 h-7 border border-gray-300 rounded-full flex items-center justify-center text-sm font-semibold z-30 cursor-pointer"
          style={{
            backgroundColor: isImportance ? 'white' : '#672DB7',
            boxShadow: isImportance ? '0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.12)',
            left: value === minValue ? '0px' : value === maxValue ? 'calc(100% - 28px)' : `calc(${((value - minValue) / (maxValue - minValue)) * 100}% - 14px)`
          }}
        >
          <span style={{ color: isImportance ? '#672DB7' : 'white' }}>{value}</span>
        </div>
      )}
      <span className={`absolute right-2 text-xs pointer-events-none z-10 ${isOpenToAll ? 'text-white font-medium' : 'text-gray-500'}`}>{maxValue}</span>
    </div>
  );
};

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = params.id as string;
  // Border color from results page: ?border=pending (orange) or ?border=default (purple)
  const borderParam = searchParams?.get('border');
  const useOrangeStyle = borderParam === 'pending' ? true : (borderParam === 'default' ? false : undefined);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [profileUserRequiredQuestionIds, setProfileUserRequiredQuestionIds] = useState<Set<string>>(new Set());
  const [currentUserRequiredQuestionIds, setCurrentUserRequiredQuestionIds] = useState<Set<string>>(new Set());
  const [currentUserAnsweredQuestionIds, setCurrentUserAnsweredQuestionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [error, setError] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [hasMatch, setHasMatch] = useState(false); // Track if both users liked each other
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [questionsModalPage, setQuestionsModalPage] = useState(1);
  const QUESTIONS_PER_PAGE = 8;
  const [selectedQuestionNumber, setSelectedQuestionNumber] = useState<number | null>(null);
  const [selectedQuestionData, setSelectedQuestionData] = useState<any[]>([]);
  const [selectedGroupedQuestionId, setSelectedGroupedQuestionId] = useState<string | null>(null);
  const [showApprovalPopup, setShowApprovalPopup] = useState(false);
  const [showMatchCelebration, setShowMatchCelebration] = useState(false);
  const [celebratedMatch, setCelebratedMatch] = useState(false);
  const [compatibility, setCompatibility] = useState<{
    overall_compatibility: number;
    compatible_with_me: number;
    im_compatible_with: number;
    mutual_questions_count: number;
    required_overall_compatibility?: number;
    required_compatible_with_me?: number;
    required_im_compatible_with?: number;
    required_mutual_questions_count?: number;
    my_required_mutual_count?: number;
    my_required_total_count?: number;
    their_required_mutual_count?: number;
    their_required_total_count?: number;
    user1_required_completeness?: number;
    user2_required_completeness?: number;
    required_completeness_ratio?: number; // Deprecated
  } | null>(null);
  const [showRequiredCompatibility, setShowRequiredCompatibility] = useState(false);
  const [requiredScope, setRequiredScope] = useState<'my' | 'their'>('my');
  // Show orange based on the active required scope's completeness
  const isRequiredIncomplete = compatibility != null && (
    requiredScope === 'their'
      ? (compatibility.user2_required_completeness !== undefined && compatibility.user2_required_completeness < 1)
      : (compatibility.user1_required_completeness !== undefined && compatibility.user1_required_completeness < 1)
  );
  const effectiveShowOrange = useOrangeStyle ?? isRequiredIncomplete;
  const [showLikePopup, setShowLikePopup] = useState(false);
  const [showNotePopup, setShowNotePopup] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showReportPopup, setShowReportPopup] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showPrivateAnswerPopup, setShowPrivateAnswerPopup] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [sortOption, setSortOption] = useState<'number' | 'popular' | 'new'>('number');
  const [filters, setFilters] = useState({
    questions: {
      mandatory: false,
      unanswered: false,
      required: false,
      submitted: false,
      myPending: false,
      theirPending: false
    },
    tags: {
      value: false,
      lifestyle: false,
      look: false,
      trait: false,
      hobby: false,
      interest: false
    }
  });
  const [pendingFilters, setPendingFilters] = useState<typeof filters>(filters);

  // Inline answer editing state (for "My Pending" questions)
  const [editSliderAnswers, setEditSliderAnswers] = useState<Record<string, number>>({});
  const [editOpenToAllStates, setEditOpenToAllStates] = useState<Record<string, boolean>>({});
  const [editImportanceValues, setEditImportanceValues] = useState({ me: 3, lookingFor: 3 });
  const [editSaving, setEditSaving] = useState(false);
  const [editMeShare, setEditMeShare] = useState(true);
  const [editMeRequired, setEditMeRequired] = useState(false);
  const [editError, setEditError] = useState('');
  const [isAnsweringPending, setIsAnsweringPending] = useState(false);

  // Check if required filter was enabled from results page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFilters = sessionStorage.getItem('results_page_filters');
      if (savedFilters) {
        try {
          const filters = JSON.parse(savedFilters);
          console.log('🔍 Results page filters:', filters);
          if (filters.requiredOnly) {
            console.log('✅ Setting showRequiredCompatibility to true');
            setShowRequiredCompatibility(true);
          }
          if (filters.requiredScope === 'their') {
            setRequiredScope('their');
          }
        } catch (e) {
          console.error('Error parsing saved filters:', e);
        }
      }
    }
  }, []);

  // Cycle loading text while profile is loading
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingTextIndex(prev => (prev + 1) % 3);
    }, 1500);
    return () => clearInterval(interval);
  }, [loading]);

  // Fetch user profile and answers
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setError('User ID not found');
        return;
      }

      try {
        // Check sessionStorage cache first (2 min TTL)
        const cacheKey = `profile_${userId}`;
        const cachedData = sessionStorage.getItem(cacheKey);
        const cacheTimestamp = sessionStorage.getItem(`${cacheKey}_timestamp`);
        const now = Date.now();

        let useCache = false;
        if (cachedData && cacheTimestamp && (now - parseInt(cacheTimestamp)) < 120000) { // 2 min cache
          console.log('Using cached profile data');
          const { user: cachedUser, answers: cachedAnswers } = JSON.parse(cachedData);
          setUser(cachedUser);
          setUserAnswers(cachedAnswers);
          // Still fetch required question IDs (not cached) + questions + current user's data for pending filters
          const currentUserId = localStorage.getItem('user_id');
          const isOtherProfile = currentUserId && currentUserId !== userId;
          try {
            const parallelFetches: Promise<Response>[] = [
              fetch(
                `${getApiUrl(API_ENDPOINTS.USER_REQUIRED_QUESTIONS)}?user=${encodeURIComponent(userId)}`,
                { headers: { 'Content-Type': 'application/json' } }
              ),
              // Also fetch allQuestions (needed for pending question groups display)
              fetch(
                `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?page_size=1000`,
                { headers: { 'Content-Type': 'application/json' } }
              ),
            ];
            if (isOtherProfile) {
              // Current user's required questions
              parallelFetches.push(
                fetch(
                  `${getApiUrl(API_ENDPOINTS.USER_REQUIRED_QUESTIONS)}?user=${encodeURIComponent(currentUserId)}`,
                  { headers: { 'Content-Type': 'application/json' } }
                )
              );
              // Current user's answers (to determine which questions they've answered)
              parallelFetches.push(
                fetch(
                  `${getApiUrl(API_ENDPOINTS.ANSWERS)}?user=${currentUserId}&page=1&page_size=100`,
                  { headers: { 'Content-Type': 'application/json' } }
                )
              );
            }
            const responses = await Promise.all(parallelFetches);

            // Profile user's required questions
            if (responses[0].ok) {
              const reqData = await responses[0].json();
              const results = reqData.results ?? [];
              setProfileUserRequiredQuestionIds(new Set(results.map((r: { question_id: string }) => String(r.question_id).toLowerCase())));
            }

            // All questions (for pending question display names)
            if (responses[1]?.ok) {
              const questionsData = await responses[1].json();
              setAllQuestions(questionsData.results || []);
            }

            if (isOtherProfile) {
              // Current user's required questions
              if (responses[2]?.ok) {
                const curReqData = await responses[2].json();
                const curResults = curReqData.results ?? [];
                setCurrentUserRequiredQuestionIds(new Set(curResults.map((r: { question_id: string }) => String(r.question_id).toLowerCase())));
              }
              // Current user's answered question IDs
              if (responses[3]?.ok) {
                const curAnswersData = await responses[3].json();
                let allCurAnswers: any[] = curAnswersData.results || [];
                // Paginate if needed
                if (curAnswersData.next && allCurAnswers.length > 0) {
                  const totalCount = curAnswersData.count || 0;
                  const actualPageSize = allCurAnswers.length; // Use actual returned count, not requested
                  const totalPages = Math.min(Math.ceil(totalCount / actualPageSize), 20);
                  if (totalPages > 1) {
                    const remainingPromises = [];
                    for (let p = 2; p <= totalPages; p++) {
                      remainingPromises.push(
                        fetch(`${getApiUrl(API_ENDPOINTS.ANSWERS)}?user=${currentUserId}&page=${p}&page_size=100`, { headers: { 'Content-Type': 'application/json' } })
                          .then(r => r.ok ? r.json() : null)
                          .then(data => data?.results || [])
                      );
                    }
                    const remaining = await Promise.all(remainingPromises);
                    for (const pageAnswers of remaining) {
                      allCurAnswers = allCurAnswers.concat(pageAnswers);
                    }
                  }
                }
                setCurrentUserAnsweredQuestionIds(new Set(allCurAnswers.map((a: any) => String(a.question?.id || a.question_id || '').toLowerCase()).filter(Boolean)));
              }
            }
          } catch (_) {
            setProfileUserRequiredQuestionIds(new Set());
          }
          setLoading(false);
          useCache = true;
        }

        if (!useCache) {
          const currentUserId = localStorage.getItem('user_id');
          const headers = { 'Content-Type': 'application/json' };
          const pageSize = 100;

          // ── Wave 1: Fire ALL independent requests in parallel ──
          // User profile, questions, first answers page, required questions, compatibility, current user data
          const wave1Promises: Promise<Response>[] = [
            fetch(`${getApiUrl(API_ENDPOINTS.USERS)}${userId}/`, { headers }),                               // [0] user
            fetch(`${getApiUrl(API_ENDPOINTS.QUESTIONS)}?page_size=1000`, { headers }),                       // [1] questions
            fetch(`${getApiUrl(API_ENDPOINTS.ANSWERS)}?user=${userId}&page=1&page_size=${pageSize}`, { headers }), // [2] answers p1
            fetch(`${getApiUrl(API_ENDPOINTS.USER_REQUIRED_QUESTIONS)}?user=${encodeURIComponent(userId)}`, { headers }), // [3] profile user's required
          ];
          // Add compatibility request if applicable
          const fetchCompat = currentUserId && currentUserId !== userId;
          if (fetchCompat) {
            wave1Promises.push(
              fetch(`${getApiUrl(API_ENDPOINTS.USERS)}compatibility_with/?user_id=${currentUserId}&other_user_id=${userId}`, { headers }) // [4] compat
            );
            // Current user's required questions and answers (for pending filters)
            wave1Promises.push(
              fetch(`${getApiUrl(API_ENDPOINTS.USER_REQUIRED_QUESTIONS)}?user=${encodeURIComponent(currentUserId)}`, { headers }) // [5] current user's required
            );
            wave1Promises.push(
              fetch(`${getApiUrl(API_ENDPOINTS.ANSWERS)}?user=${currentUserId}&page=1&page_size=${pageSize}`, { headers }) // [6] current user's answers p1
            );
          }

          const wave1 = await Promise.all(wave1Promises);
          const [userResponse, questionsResponse, answersP1Response] = wave1;

          if (!userResponse.ok) throw new Error('User not found');
          if (!questionsResponse.ok) throw new Error('Failed to fetch questions');
          if (!answersP1Response.ok) throw new Error('Failed to fetch user answers');

          // Parse wave 1 responses in parallel
          const parsePromises: Promise<any>[] = [
            userResponse.json(),                                                    // [0]
            questionsResponse.json(),                                               // [1]
            answersP1Response.json(),                                               // [2]
            wave1[3].ok ? wave1[3].json() : Promise.resolve({ results: [] }),       // [3] profile required
          ];
          if (fetchCompat && wave1[4]) {
            parsePromises.push(wave1[4].ok ? wave1[4].json() : Promise.resolve(null));  // [4] compat
            parsePromises.push(wave1[5]?.ok ? wave1[5].json() : Promise.resolve({ results: [] })); // [5] current user's required
            parsePromises.push(wave1[6]?.ok ? wave1[6].json() : Promise.resolve({ results: [] })); // [6] current user's answers p1
          }
          const parsedResults = await Promise.all(parsePromises);

          const userData = parsedResults[0];
          const questionsData = parsedResults[1];
          const answersP1Data = parsedResults[2];
          const reqData = parsedResults[3];
          const compatData = fetchCompat ? parsedResults[4] : null;
          const curUserReqData = fetchCompat ? parsedResults[5] : null;
          const curUserAnswersP1Data = fetchCompat ? parsedResults[6] : null;

          const questions = questionsData.results || [];
          let allAnswers: any[] = answersP1Data.results || [];

          // ── Wave 2: Fetch remaining answer pages in parallel ──
          if (answersP1Data.next && allAnswers.length > 0) {
            const totalCount = answersP1Data.count || 0;
            const actualPageSize = allAnswers.length; // Use actual returned count, not requested
            const totalPages = Math.min(Math.ceil(totalCount / actualPageSize), 20);

            if (totalPages > 1) {
              const remainingPagePromises = [];
              for (let p = 2; p <= totalPages; p++) {
                remainingPagePromises.push(
                  fetch(`${getApiUrl(API_ENDPOINTS.ANSWERS)}?user=${userId}&page=${p}&page_size=${pageSize}`, { headers })
                    .then(r => r.ok ? r.json() : null)
                    .then(data => data?.results || [])
                );
              }
              const remainingPages = await Promise.all(remainingPagePromises);
              for (const pageAnswers of remainingPages) {
                allAnswers = allAnswers.concat(pageAnswers);
              }
            }
          }

          const answers = allAnswers;

          // Process required question IDs
          let requiredIds = new Set<string>();
          const reqResults = reqData?.results ?? [];
          requiredIds = new Set(reqResults.map((r: { question_id: string }) => String(r.question_id).toLowerCase()));

          // Process current user's required questions and answered question IDs (for pending filters)
          if (fetchCompat && curUserReqData) {
            const curReqResults = curUserReqData.results ?? [];
            setCurrentUserRequiredQuestionIds(new Set(curReqResults.map((r: { question_id: string }) => String(r.question_id).toLowerCase())));
          }
          if (fetchCompat && curUserAnswersP1Data) {
            let allCurAnswers: any[] = curUserAnswersP1Data.results || [];
            // Paginate current user's answers if needed
            if (curUserAnswersP1Data.next && allCurAnswers.length > 0) {
              const totalCount = curUserAnswersP1Data.count || 0;
              const actualPageSize = allCurAnswers.length; // Use actual returned count, not requested
              const totalPages = Math.min(Math.ceil(totalCount / actualPageSize), 20);
              if (totalPages > 1) {
                const curAnswerPromises = [];
                for (let p = 2; p <= totalPages; p++) {
                  curAnswerPromises.push(
                    fetch(`${getApiUrl(API_ENDPOINTS.ANSWERS)}?user=${currentUserId}&page=${p}&page_size=${pageSize}`, { headers })
                      .then(r => r.ok ? r.json() : null)
                      .then(data => data?.results || [])
                  );
                }
                const curRemainingPages = await Promise.all(curAnswerPromises);
                for (const pageAnswers of curRemainingPages) {
                  allCurAnswers = allCurAnswers.concat(pageAnswers);
                }
              }
            }
            setCurrentUserAnsweredQuestionIds(new Set(allCurAnswers.map((a: any) => String(a.question?.id || a.question_id || '').toLowerCase()).filter(Boolean)));
          }

          // Process compatibility data
          if (compatData) {
            console.log('✅ Compatibility data received:', compatData);
            setCompatibility({
              overall_compatibility: compatData.overall_compatibility,
              im_compatible_with: compatData.im_compatible_with,
              compatible_with_me: compatData.compatible_with_me,
              mutual_questions_count: compatData.mutual_questions_count || 0,
              required_overall_compatibility: compatData.required_overall_compatibility,
              required_compatible_with_me: compatData.required_compatible_with_me,
              required_im_compatible_with: compatData.required_im_compatible_with,
              required_mutual_questions_count: compatData.required_mutual_questions_count,
              my_required_mutual_count: compatData.my_required_mutual_count,
              my_required_total_count: compatData.my_required_total_count,
              their_required_mutual_count: compatData.their_required_mutual_count,
              their_required_total_count: compatData.their_required_total_count,
              user1_required_completeness: compatData.user1_required_completeness,
              user2_required_completeness: compatData.user2_required_completeness,
            });
          }

          // Cache the data
          sessionStorage.setItem(cacheKey, JSON.stringify({ user: userData, answers }));
          sessionStorage.setItem(`${cacheKey}_timestamp`, now.toString());

          setUser(userData);
          setUserAnswers(answers);
          setProfileUserRequiredQuestionIds(requiredIds);
          setAllQuestions(questions);
        } else {
          // Cache was used for user+answers, still fetch compatibility in parallel
          const currentUserId = localStorage.getItem('user_id');
          if (currentUserId && currentUserId !== userId) {
            try {
              const compatibilityResponse = await fetch(
                `${getApiUrl(API_ENDPOINTS.USERS)}compatibility_with/?user_id=${currentUserId}&other_user_id=${userId}`,
                { headers: { 'Content-Type': 'application/json' } }
              );
              if (compatibilityResponse.ok) {
                const compatData = await compatibilityResponse.json();
                setCompatibility({
                  overall_compatibility: compatData.overall_compatibility,
                  im_compatible_with: compatData.im_compatible_with,
                  compatible_with_me: compatData.compatible_with_me,
                  mutual_questions_count: compatData.mutual_questions_count || 0,
                  required_overall_compatibility: compatData.required_overall_compatibility,
                  required_compatible_with_me: compatData.required_compatible_with_me,
                  required_im_compatible_with: compatData.required_im_compatible_with,
                  required_mutual_questions_count: compatData.required_mutual_questions_count,
                  my_required_mutual_count: compatData.my_required_mutual_count,
                  my_required_total_count: compatData.my_required_total_count,
                  their_required_mutual_count: compatData.their_required_mutual_count,
                  their_required_total_count: compatData.their_required_total_count,
                  user1_required_completeness: compatData.user1_required_completeness,
                  user2_required_completeness: compatData.user2_required_completeness,
                });
              }
            } catch (error) {
              console.error('Error fetching compatibility:', error);
            }
          }
        }

      } catch (error) {
        console.error('Error fetching profile:', error);
        setError(error instanceof Error ? error.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  // Check for matches on page load and show celebrations for uncelebrated matches
  // Helper function to create a consistent match key from two user IDs
  const getMatchKey = (userId1: string, userId2: string): string => {
    // Sort IDs to ensure consistent key regardless of order
    const sorted = [userId1, userId2].sort();
    return `${sorted[0]}_${sorted[1]}`;
  };

  const checkForMatchesOnLoad = async () => {
    const currentUserId = localStorage.getItem('user_id');
    if (!currentUserId || !userId) return;

    try {
      // Check if I've liked this user
      const myTagsResponse = await fetch(
        `${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/user_tags/?user_id=${currentUserId}&result_user_id=${userId}`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!myTagsResponse.ok) return;

      const myTagsData = await myTagsResponse.json();
      const myNormalizedTags = (myTagsData.tags || []).map((tag: string) => tag.toLowerCase());
      const iLikedThem = myNormalizedTags.includes('like');

      if (!iLikedThem) return;

      // Get celebrated matches from localStorage (stored as match pairs)
      const celebratedMatchesKey = `celebrated_matches_${currentUserId}`;
      const celebratedMatchesStr = localStorage.getItem(celebratedMatchesKey);
      const celebratedMatches = celebratedMatchesStr ? new Set(JSON.parse(celebratedMatchesStr)) : new Set();

      // Create match key for this pair
      const matchKey = getMatchKey(currentUserId, userId);

      // Skip if already celebrated, but verify match still exists
      if (celebratedMatches.has(matchKey)) {
        // Verify the match still exists - if not, remove from celebrated list
        const theirTagsResponse = await fetch(
          `${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/user_tags/?user_id=${userId}&result_user_id=${currentUserId}`,
          { headers: { 'Content-Type': 'application/json' } }
        );

        if (theirTagsResponse.ok) {
          const theirData = await theirTagsResponse.json();
          const theirNormalizedTags = (theirData.tags || []).map((tag: string) => tag.toLowerCase());
          
          // If match no longer exists, remove from celebrated list
          if (!theirNormalizedTags.includes('like')) {
            celebratedMatches.delete(matchKey);
            localStorage.setItem(celebratedMatchesKey, JSON.stringify(Array.from(celebratedMatches)));
          }
        }
        return;
      }

      // Check if they've liked me back
      const theirTagsResponse = await fetch(
        `${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/user_tags/?user_id=${userId}&result_user_id=${currentUserId}`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (theirTagsResponse.ok) {
        const theirData = await theirTagsResponse.json();
        const theirNormalizedTags = (theirData.tags || []).map((tag: string) => tag.toLowerCase());
        
        if (theirNormalizedTags.includes('like')) {
          // It's a match! Show celebration
          setShowMatchCelebration(true);
          setCelebratedMatch(true);
          
          // Mark as celebrated using match key
          celebratedMatches.add(matchKey);
          localStorage.setItem(celebratedMatchesKey, JSON.stringify(Array.from(celebratedMatches)));
        }
      }
    } catch (error) {
      console.error('Error checking for matches on load:', error);
    }
  };

  // Fetch tags for this user and check for match
  useEffect(() => {
    const fetchTags = async () => {
      const currentUserId = localStorage.getItem('user_id');
      if (!currentUserId || !userId) return;

      try {
        // Fetch tags I've assigned to this user
        const myTagsResponse = await fetch(
          `${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/user_tags/?user_id=${currentUserId}&result_user_id=${userId}`,
          {

            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (myTagsResponse.ok) {
          const data = await myTagsResponse.json();
          // Normalize tags to lowercase for consistent comparison
          const normalizedTags = (data.tags || []).map((tag: string) => tag.toLowerCase());
          setSelectedTags(normalizedTags);
          
          // Check for matches on page load
          checkForMatchesOnLoad();
          
          // Check if I've liked this user
          const iLikedThem = normalizedTags.includes('like');
          
          // Check if they've liked me (reverse check)
          if (iLikedThem) {
            const theirTagsResponse = await fetch(
              `${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/user_tags/?user_id=${userId}&result_user_id=${currentUserId}`,
              {
 
                headers: { 'Content-Type': 'application/json' },
              }
            );
            
            if (theirTagsResponse.ok) {
              const theirData = await theirTagsResponse.json();
              const theirNormalizedTags = (theirData.tags || []).map((tag: string) => tag.toLowerCase());
              const theyLikedMe = theirNormalizedTags.includes('like');
              setHasMatch(iLikedThem && theyLikedMe);
            }
          } else {
            setHasMatch(false);
          }
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };

    fetchTags();
  }, [userId]);

  // Helper function to get answer value for specific question
  const getAnswerValue = (questionNumber: number, groupNumber?: number, answerType: 'me_answer' | 'looking_for_answer' = 'me_answer') => {
    const answer = userAnswers.find(a =>
      a.question.question_number === questionNumber &&
      (groupNumber === undefined || a.question.group_number === groupNumber)
    );

    return answer ? answer[answerType] : null;
  };

  // Helper function to get answer text for specific question (returns the question name/text as the answer)
  const getAnswerText = (questionNumber: number, groupNumber?: number, answerType: 'me_answer' | 'looking_for_answer' = 'me_answer') => {
    const answer = userAnswers.find(a =>
      a.question.question_number === questionNumber &&
      (groupNumber === undefined || a.question.group_number === groupNumber)
    );

    return answer ? answer.question.question_name : null;
  };

  // Helper function to get the actual answer label based on user's answer value
  const getAnswerLabel = (questionNumber: number, groupNumber?: number, answerType: 'me_answer' | 'looking_for_answer' = 'me_answer') => {
    const answer = userAnswers.find(a =>
      a.question.question_number === questionNumber &&
      (groupNumber === undefined || a.question.group_number === groupNumber)
    );

    if (!answer) return null;

    // For kids questions, use predefined labels
    if (questionNumber === 10) {
      if (groupNumber === 1) {
        // Have kids question
        const haveLabels = { 1: "Don't Have", 5: "Have" };
        return haveLabels[answer[answerType] as keyof typeof haveLabels] || "Don't Have";
      } else if (groupNumber === 2) {
        // Want kids question
        const wantLabels = { 1: "Don't Want", 2: "Doubtful", 3: "Unsure", 4: "Eventually", 5: "Want" };
        return wantLabels[answer[answerType] as keyof typeof wantLabels] || null;
      }
    }

    // For politics question (question 9)
    if (questionNumber === 9) {
      const politicsLabels = { 1: "Uninvolved", 2: "Observant", 3: "Active", 4: "Fervent", 5: "Radical" };
      return politicsLabels[answer[answerType] as keyof typeof politicsLabels] || null;
    }

    // For other questions, could extend this function to get labels from question.answers field
    return null;
  };

  // Helper function to get question with highest answer value
  const getHighestAnswer = (questionNumber: number) => {
    const answers = userAnswers.filter(a => a.question.question_number === questionNumber);
    if (answers.length === 0) return null;

    // Find the highest me_answer value
    const maxValue = Math.max(...answers.map(a => a.me_answer));
    const highestAnswers = answers.filter(a => a.me_answer === maxValue);

    // If tie, use highest group_number
    return highestAnswers.reduce((prev, curr) =>
      (curr.question.group_number || 0) > (prev.question.group_number || 0) ? curr : prev
    );
  };

  // Helper function to get ranked ideology questions (question_number === 12)
  // Returns them sorted by: 1) highest value, 2) answered first (lowest group_number as tie-breaker)
  const getRankedIdeologyQuestions = () => {
    const ideologyAnswers = userAnswers.filter(a => a.question.question_number === 12);
    if (ideologyAnswers.length === 0) return [];

    // Sort by highest me_answer value first, then by group_number (answered first) as tie-breaker
    return ideologyAnswers.sort((a, b) => {
      // First, sort by highest value (descending)
      if (b.me_answer !== a.me_answer) {
        return b.me_answer - a.me_answer;
      }
      // If values are equal, sort by group_number (ascending - answered first)
      return (a.question.group_number || 0) - (b.question.group_number || 0);
    });
  };

  // Helper function to format height from centimeters to feet and inches
  const formatHeight = (heightCm: number | null | undefined): string => {
    if (!heightCm) return `5'-3"`;

    // Convert cm to inches
    const totalInches = Math.round(heightCm / 2.54);

    // Calculate feet and inches
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;

    return `${feet}'-${inches}"`;
  };

  // Generate profile icons based on user answers
  const getProfileIcons = (): ProfileIcon[] => {
    const icons: ProfileIcon[] = [];

    // Exercise icon (question_number === 6)
    const exerciseValue = getAnswerValue(6);
    if (exerciseValue) {
      const labels = { 1: 'Never', 2: 'Rarely', 3: 'Sometimes', 4: 'Often', 5: 'Very often' };
      icons.push({
        image: '/assets/exercise.png',
        label: labels[exerciseValue as keyof typeof labels] || '',
        show: true
      });
    }

    // Education icon (question_number === 4, highest value)
    const educationAnswer = getHighestAnswer(4);
    if (educationAnswer) {
      icons.push({
        image: '/assets/cap.png',
        label: educationAnswer.question.question_name || '',
        show: true
      });
    }

    // Alcohol icon (question_number === 7, group_number === 1)
    const alcoholValue = getAnswerValue(7, 1);
    if (alcoholValue) {
      const labels = { 1: 'Never', 2: 'Rarely', 3: 'Sometimes', 4: 'Regularly', 5: 'Very often' };
      icons.push({
        image: '/assets/drink.png',
        label: labels[alcoholValue as keyof typeof labels] || '',
        show: true
      });
    }

    // Diet icon (question_number === 5) - check all diet answers
    const dietAnswers = userAnswers.filter(a => a.question.question_number === 5);
    if (dietAnswers.length > 0) {
      // Get the answer with the highest value (most strongly identified with)
      const highestDietAnswer = dietAnswers.reduce((prev, curr) => 
        curr.me_answer > prev.me_answer ? curr : prev
      );
      
      const dietLabel = highestDietAnswer.question.question_name || '';
      
      icons.push({
        image: '/assets/leaf.png',
        label: dietLabel,
        show: true
      });
    }

    // Smoking icon (question_number === 7, group_number === 2)
    const smokingValue = getAnswerValue(7, 2);
    if (smokingValue) {
      const labels = { 1: 'Never', 2: 'Rarely', 3: 'Sometimes', 4: 'Regularly', 5: 'Very often' };
      icons.push({
        image: '/assets/smk.png',
        label: labels[smokingValue as keyof typeof labels] || '',
        show: true
      });
    }

    // Vaping icon (question_number === 7, group_number === 3)
    const vapingValue = getAnswerValue(7, 3);
    if (vapingValue) {
      const labels = { 1: 'Never', 2: 'Rarely', 3: 'Sometimes', 4: 'Regularly', 5: 'Very often' };
      icons.push({
        image: '/assets/vape.png',
        label: labels[vapingValue as keyof typeof labels] || '',
        show: true
      });
    }

    // Have Children icon (question_number === 10, group_number === 1)
    const haveChildrenLabel = getAnswerLabel(10, 1);
    if (haveChildrenLabel) {
      icons.push({
        image: '/assets/pacifier.png',
        label: haveChildrenLabel,
        show: true
      });
    }

    // Want Children icon (question_number === 10, group_number === 2)
    const wantChildrenLabel = getAnswerLabel(10, 2);
    if (wantChildrenLabel) {
      icons.push({
        image: '/assets/pacifier.png',
        label: wantChildrenLabel,
        show: true
      });
    }

    // Politics icon (question_number === 9)
    const politicsValue = getAnswerValue(9);
    if (politicsValue) {
      const politicsLabels = {
        1: 'Uninvolved',
        2: 'Observant',
        3: 'Active',
        4: 'Fervent',
        5: 'Radical'
      };
      const label = politicsLabels[politicsValue as keyof typeof politicsLabels];
      if (label) {
        icons.push({
          image: '/assets/politics.png',
          label: label,
          show: true
        });
      }
    }

    // Ethnicity icon (question_number === 3)
    const ethnicityAnswers = userAnswers.filter(a => a.question.question_number === 3);
    if (ethnicityAnswers.length > 0) {
      // Get the answer with the highest value (most strongly identified with)
      const highestEthnicityAnswer = ethnicityAnswers.reduce((prev, curr) => 
        curr.me_answer > prev.me_answer ? curr : prev
      );
      
      const ethnicityLabel = highestEthnicityAnswer.question.question_name || '';
      
      icons.push({
        image: '/assets/globex.png',
        label: ethnicityLabel,
        show: true
      });
    }

    // Religion icon (question_number === 8)
    const religionValue = getAnswerValue(8);
    if (religionValue) {
      const religionLabels = {
        1: 'Never',
        2: 'Rarely',
        3: 'Sometimes',
        4: 'Regularly',
        5: 'Daily'
      };
      const label = religionLabels[religionValue as keyof typeof religionLabels];
      if (label) {
        icons.push({
          image: '/assets/prayin.png',
          label: label,
          show: true
        });
      }
    }

    // Faith icon (question_number === 11, highest value)
    const faithAnswer = getHighestAnswer(11);
    if (faithAnswer) {
      icons.push({
        image: '/assets/prayin.png',
        label: faithAnswer.question.question_name || '',
        show: true
      });
    }

    return icons.filter(icon => icon.show);
  };

  // No longer needed - we go straight to note popup
  // const handleConfirmLike = () => {
  //   setShowLikePopup(false);
  //   setShowNotePopup(true);
  // };

  // Handle sending like with optional note
  const handleSendLike = async () => {
    setShowNotePopup(false);
    const currentUserId = localStorage.getItem('user_id');
    if (!currentUserId || !userId) return;

    // Add like while keeping approve, remove hide if present
    const newSelectedTags = selectedTags.filter(tag => tag !== 'hide');
    if (!newSelectedTags.includes('like')) {
      newSelectedTags.push('like');
    }

    // Update UI immediately
    setSelectedTags(newSelectedTags);

    try {
      // Remove hide tag if present before adding like
      if (selectedTags.includes('hide')) {
        await fetch(`${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/toggle_tag/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUserId,
            result_user_id: userId,
            tag: 'Hide',
          }),
        });
      }

      // Add like tag
      await fetch(`${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/toggle_tag/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          result_user_id: userId,
          tag: 'Like',
        }),
      });

      // Check for match after adding like
      await checkForMatch(newSelectedTags);

      // If there's a note, send it to the backend
      if (noteText.trim()) {
        const noteResponse = await fetch(`${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/send_note/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender_id: currentUserId,
            recipient_id: userId,
            note: noteText.trim(),
          }),
        });

        if (noteResponse.ok) {
          console.log('✅ Note sent successfully');
        } else {
          console.error('❌ Failed to send note');
        }
      }

      // Refresh tags from server to ensure sync
      const response = await fetch(
        `${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/user_tags/?user_id=${currentUserId}&result_user_id=${userId}`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (response.ok) {
        const data = await response.json();
        const refreshedTags = (data.tags || []).map((tag: string) => tag.toLowerCase());
        setSelectedTags(refreshedTags);
      }
    } catch (error) {
      console.error('Error sending like:', error);
      // Revert on error
      setSelectedTags(selectedTags);
    }

    // Clear note text for next time
    setNoteText('');
  };

  // Handle tag toggle
  const handleTagToggle = async (tag: string) => {
    const normalizedTag = tag.toLowerCase();
    const isCurrentlySelected = selectedTags.includes(normalizedTag);

    // Check if trying to like when other user hasn't approved you yet
    if (normalizedTag === 'like' && !isCurrentlySelected) {
      const theyApprovedMe = await checkIfTheyApprovedMe();
      if (!theyApprovedMe) {
        // Show approval required popup
        setShowApprovalPopup(true);
        return;
      }
      // They approved me, show note popup directly
      setShowNotePopup(true);
      return;
    }

    // For all other tags, process normally
    await processTagToggle(tag);
  };

  // Process the actual tag toggle
  const processTagToggle = async (tag: string) => {
    const currentUserId = localStorage.getItem('user_id');
    if (!currentUserId || !userId) return;

    const normalizedTag = tag.toLowerCase();
    const isCurrentlySelected = selectedTags.includes(normalizedTag);

    // If hiding a user, remove approve and like tags
    if (normalizedTag === 'hide' && !isCurrentlySelected) {
      // Adding hide tag - remove approve and like
      setSelectedTags(prev => {
        const filtered = prev.filter(t => t !== 'approve' && t !== 'like');
        return [...filtered, normalizedTag];
      });
      setHasMatch(false); // Reset match status when hiding
    }
    // If approving or liking, remove hide tag
    else if ((normalizedTag === 'approve' || normalizedTag === 'like') && !isCurrentlySelected) {
      // Adding approve/like tag - remove hide
      setSelectedTags(prev => {
        const filtered = prev.filter(t => t !== 'hide');
        return [...filtered, normalizedTag];
      });
    }
    // If removing approve, also remove like (can't like someone who isn't approved)
    else if (normalizedTag === 'approve' && isCurrentlySelected) {
      // Removing approve tag - also remove like
      setSelectedTags(prev => prev.filter(t => t !== 'approve' && t !== 'like'));
      setHasMatch(false); // Reset match status when un-approving
    }
    else {
      setSelectedTags(prev =>
        isCurrentlySelected
          ? prev.filter(t => t !== normalizedTag)
          : [...prev, normalizedTag]
      );
    }

    try {
      // If hiding, first remove approve and like tags
      if (normalizedTag === 'hide' && !isCurrentlySelected) {
        // Remove approve tag if present
        if (selectedTags.includes('approve')) {
          await fetch(`${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/toggle_tag/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: currentUserId,
              result_user_id: userId,
              tag: 'Approve',
            }),
          });
        }

        // Remove like tag if present
        if (selectedTags.includes('like')) {
          await fetch(`${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/toggle_tag/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: currentUserId,
              result_user_id: userId,
              tag: 'Like',
            }),
          });
        }

        // Remove the other user's like tag for the current user (if they liked us)
        console.log('🚫 Removing like tag from other user because we are hiding them');
        try {
          await fetch(`${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/toggle_tag/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId, // The other user
              result_user_id: currentUserId, // The current user
              tag: 'Like',
            }),
          });
        } catch (error) {
          // If the like tag doesn't exist, that's fine - just log and continue
          console.log('ℹ️ Other user may not have liked us, or tag already removed');
        }
      }

      // If approving or liking, first remove hide tag
      if ((normalizedTag === 'approve' || normalizedTag === 'like') && !isCurrentlySelected) {
        // Remove hide tag if present
        if (selectedTags.includes('hide')) {
          console.log('🚫 Removing hide tag before adding', normalizedTag);
          await fetch(`${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/toggle_tag/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: currentUserId,
              result_user_id: userId,
              tag: 'Hide',
            }),
          });
        }
      }

      // If removing approve, first remove like tag
      if (normalizedTag === 'approve' && isCurrentlySelected) {
        // Remove like tag if present
        if (selectedTags.includes('like')) {
          console.log('🚫 Removing like tag because approve is being removed');
          await fetch(`${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/toggle_tag/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: currentUserId,
              result_user_id: userId,
              tag: 'Like',
            }),
          });
        }

        // Remove the other user's like tag for the current user (if they liked us)
        console.log('🚫 Removing like tag from other user because we are unapproving them');
        try {
          await fetch(`${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/toggle_tag/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId, // The other user
              result_user_id: currentUserId, // The current user
              tag: 'Like',
            }),
          });
        } catch (error) {
          // If the like tag doesn't exist, that's fine - just log and continue
          console.log('ℹ️ Other user may not have liked us, or tag already removed');
        }
      }

      // Now toggle the requested tag
      const response = await fetch(
        `${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/toggle_tag/`,
        {
          method: 'POST',

          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUserId,
            result_user_id: userId,
            tag: tag,
          }),
        }
      );

      if (!response.ok) {
        // Revert on error
        setSelectedTags(prev =>
          isCurrentlySelected
            ? [...prev, normalizedTag]
            : prev.filter(t => t !== normalizedTag)
        );
        console.error('Failed to toggle tag');
      }
    } catch (error) {
      // Revert on error
      setSelectedTags(prev =>
        isCurrentlySelected
          ? [...prev, normalizedTag]
          : prev.filter(t => t !== normalizedTag)
      );
      console.error('Error toggling tag:', error);
    }
  };

  // Slider component copied from gender page with smaller size for profile
  const SliderComponent = ({
    value,
    onChange,
    isOpenToAll = false
  }: {
    value: number;
    onChange: (value: number) => void;
    isOpenToAll?: boolean;
  }) => {
    return (
      <div className="w-full h-4 relative flex items-center select-none">
          {!isOpenToAll && <span className="absolute left-2 text-xs text-gray-500 pointer-events-none z-10">1</span>}

          {/* Custom Slider Track - smaller version */}
          <div
            className="w-full h-4 rounded-[16px] relative cursor-pointer transition-all duration-200 border"
            style={{
              width: '100%',
              backgroundColor: isOpenToAll ? '#672DB7' : '#F5F5F5',
              borderColor: isOpenToAll ? '#672DB7' : '#ADADAD'
            }}
          />

          {/* Slider Thumb - smaller version */}
          {!isOpenToAll && (
            <div
              className="absolute top-1/2 transform -translate-y-1/2 w-6 h-6 border border-gray-300 rounded-full flex items-center justify-center text-xs font-semibold shadow-sm z-30"
              style={{
                backgroundColor: '#672DB7',
                left: value === 1 ? '0px' : value === 5 ? 'calc(100% - 24px)' : `calc(${((value - 1) / 4) * 100}% - 12px)`
              }}
            >
              <span className="text-white">{value}</span>
            </div>
          )}

          {!isOpenToAll && <span className="absolute right-2 text-xs text-gray-500 pointer-events-none z-10">5</span>}
      </div>
    );
  };

  // Question display names mapping (matching questions page)
  const questionDisplayNames: Record<number, string> = {
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
  };

  // Group questions for modal display (matching questions page logic)
  // Must be called before any early returns to satisfy Rules of Hooks
  const groupedQuestionsForModal = useMemo(() => {
    // If no user answers, return empty array
    if (userAnswers.length === 0) {
      return [];
    }

    // Get unique question numbers that the user has answered
    const answeredQuestionNumbers = new Set(
      userAnswers.map(answer => answer.question.question_number)
    );

    // Create a map of question IDs to full question data from allQuestions
    const questionMap = new Map(allQuestions.map((q: any) => [q.id, q]));

    // Group questions by question_number
    const questionsByNumber: Record<number, any[]> = {};
    
    // First, add questions from allQuestions that the user has answered
    allQuestions.forEach((q: any) => {
      if (answeredQuestionNumbers.has(q.question_number)) {
        if (!questionsByNumber[q.question_number]) {
          questionsByNumber[q.question_number] = [];
        }
        questionsByNumber[q.question_number].push(q);
      }
    });

    // Also add questions from userAnswers that might not be in allQuestions
    userAnswers.forEach(answer => {
      const qNum = answer.question.question_number;
      if (!questionsByNumber[qNum]) {
        questionsByNumber[qNum] = [];
      }
      // Check if this question is already in the array
      const questionId = answer.question.id;
      const exists = questionsByNumber[qNum].some((q: any) => q.id === questionId);
      if (!exists) {
        // Use the question from answer, enriched with data from questionMap if available
        const fullQuestion = questionMap.get(questionId) || answer.question;
        questionsByNumber[qNum].push(fullQuestion);
      }
    });

    // Now create grouped structure based on question_type
    const grouped: Record<string, { 
      questions: UserAnswer[], 
      displayName: string, 
      questionNumber: number, 
      answerCount: number,
      mostRecentAnswerTime?: string | null
    }> = {};

    // Process each answered question number
    Object.entries(questionsByNumber).forEach(([qNumStr, questions]) => {
      const questionNumber = parseInt(qNumStr);
      // Sort questions by group_number if available
      questions.sort((a: any, b: any) => (a.group_number || 0) - (b.group_number || 0));
      const firstQuestion = questions[0];
      const questionType = firstQuestion?.question_type || 'basic';

      // Find user answers for this question number
      const answersForQuestion = userAnswers.filter(
        answer => answer.question.question_number === questionNumber
      );

      // Only create group if there are answers (should always be true, but safety check)
      if (answersForQuestion.length === 0) return;

      if (questionType === 'basic') {
        // Basic questions - each question stands alone
        questions.forEach((question: any) => {
          const answersForThisQuestion = answersForQuestion.filter(
            answer => answer.question.id === question.id
          );
          
          // Only show if there's an answer for this specific question
          if (answersForThisQuestion.length === 0) return;
          
          const key = `${questionNumber}_${question.id}`;
          if (!grouped[key]) {
            grouped[key] = {
              questions: [],
              displayName: question.text,
              questionNumber: questionNumber,
              answerCount: 0
            };
          }
          grouped[key].questions.push(...answersForThisQuestion);
          grouped[key].answerCount = answersForThisQuestion.length;
        });
      } else if (['four', 'grouped', 'double', 'triple'].includes(questionType)) {
        // Grouped questions - combine by question_number
        const key = `group_${questionNumber}`;
        if (!grouped[key]) {
          // Use group_name_text if available, otherwise use predefined mapping, otherwise use question text
          const displayText = firstQuestion.group_name_text ||
                           questionDisplayNames[questionNumber] ||
                           firstQuestion.text;
          grouped[key] = {
            questions: [],
            displayName: displayText,
            questionNumber: questionNumber,
            answerCount: 0,
            mostRecentAnswerTime: null
          };
        }
        // Add all answers for this question number
        grouped[key].questions.push(...answersForQuestion);
        grouped[key].answerCount = answersForQuestion.length;
        // Track most recent answer time (use updated_at if available, otherwise created_at)
        const mostRecent = answersForQuestion.reduce((latest, answer: any) => {
          const answerTime = answer.updated_at || answer.created_at;
          if (!answerTime) return latest;
          if (!latest) return answerTime;
          return new Date(answerTime) > new Date(latest) ? answerTime : latest;
        }, null as string | null);
        grouped[key].mostRecentAnswerTime = mostRecent;
      }
    });

    // Sort by question number
    return Object.entries(grouped).sort((a, b) => 
      a[1].questionNumber - b[1].questionNumber
    );
  }, [userAnswers, allQuestions, questionDisplayNames]);

  // Questions the profile user hasn't answered from my required set ("Their Pending")
  const theirPendingQuestions = useMemo(() => {
    if (currentUserRequiredQuestionIds.size === 0) return [];
    const profileAnsweredIds = new Set(userAnswers.map(a => String(a.question.id).toLowerCase()));
    return [...currentUserRequiredQuestionIds].filter(qId => !profileAnsweredIds.has(qId));
  }, [currentUserRequiredQuestionIds, userAnswers]);

  // Questions I haven't answered from the profile user's required set ("My Pending")
  const myPendingQuestions = useMemo(() => {
    if (profileUserRequiredQuestionIds.size === 0) return [];
    return [...profileUserRequiredQuestionIds].filter(qId => !currentUserAnsweredQuestionIds.has(qId));
  }, [profileUserRequiredQuestionIds, currentUserAnsweredQuestionIds]);

  // Build pending question groups from allQuestions for display in the modal
  const pendingQuestionGroups = useMemo(() => {
    const groups: [string, {
      questions: UserAnswer[],
      displayName: string,
      questionNumber: number,
      answerCount: number,
      mostRecentAnswerTime?: string | null,
      isPending: true,
      pendingType: 'my' | 'their'
    }][] = [];

    // Build a map of question IDs that are already shown in answered groups
    const answeredGroupQuestionIds = new Set<string>();
    groupedQuestionsForModal.forEach(([, group]) => {
      group.questions.forEach((a: UserAnswer) => {
        if (a.question?.id) answeredGroupQuestionIds.add(String(a.question.id).toLowerCase());
      });
    });

    // Helper to create pending groups from a list of question IDs
    const createPendingGroups = (pendingQIds: string[], pendingType: 'my' | 'their') => {
      // Find question data from allQuestions
      const questionMap = new Map(allQuestions.map((q: any) => [String(q.id).toLowerCase(), q]));
      // Track which question numbers we've already added for this pending type
      const addedQuestionNumbers = new Set<number>();

      pendingQIds.forEach(qId => {
        const question = questionMap.get(qId);
        if (!question) return;

        const questionNumber = question.question_number;

        // For grouped question types, only add one entry per question_number
        const questionType = question.question_type || 'basic';
        if (['four', 'grouped', 'double', 'triple'].includes(questionType)) {
          if (addedQuestionNumbers.has(questionNumber)) return;
          addedQuestionNumbers.add(questionNumber);
        }

        const key = `pending_${pendingType}_${questionNumber}_${qId}`;
        const displayName = ['four', 'grouped', 'double', 'triple'].includes(questionType)
          ? (question.group_name_text || questionDisplayNames[questionNumber] || question.text)
          : question.text;

        groups.push([key, {
          questions: [],
          displayName,
          questionNumber,
          answerCount: 0,
          mostRecentAnswerTime: null,
          isPending: true,
          pendingType,
        }]);
      });
    };

    createPendingGroups(theirPendingQuestions, 'their');
    createPendingGroups(myPendingQuestions, 'my');

    return groups;
  }, [theirPendingQuestions, myPendingQuestions, allQuestions, groupedQuestionsForModal, questionDisplayNames]);

  // Filter and sort grouped questions for modal
  const filteredAndSortedQuestions = useMemo(() => {
    // Start with answered questions, and include pending groups when pending filters are active
    const hasPendingFilter = filters.questions.myPending || filters.questions.theirPending;
    let allGroups = [...groupedQuestionsForModal];
    if (hasPendingFilter) {
      // Add pending question groups (unanswered questions from required sets)
      allGroups = [...allGroups, ...pendingQuestionGroups];
    }

    let filtered = allGroups;

    // Apply filters: question-type filters use AND (must match every selected filter); tags use OR (must have at least one selected tag)
    const hasQuestionFilters = Object.values(filters.questions).some(filter => filter);
    const hasTagFilters = Object.values(filters.tags).some(filter => filter);

    if (hasQuestionFilters || hasTagFilters) {
      filtered = filtered.filter(([key, group]) => {
        const groupAny = group as typeof group & { isPending?: boolean; pendingType?: 'my' | 'their' };

        // For pending groups, only show if the matching pending filter is active
        if (groupAny.isPending) {
          if (groupAny.pendingType === 'their' && !filters.questions.theirPending) return false;
          if (groupAny.pendingType === 'my' && !filters.questions.myPending) return false;
          // Pending groups pass other question filters automatically (they are inherently "pending")
          // But they should still be filtered by tags if tag filters are active
          // Since pending groups have no answers/questions data to check tags on, skip tag filters for them
          return true;
        }

        const firstQuestion = group.questions[0]?.question;
        // Question from API may include is_mandatory, submitted_by, is_submitted_by_me, tags (not on base type)
        const firstQ = firstQuestion as typeof firstQuestion & { is_mandatory?: boolean; submitted_by?: { id?: string }; is_submitted_by_me?: boolean; tags?: { name?: string }[] };
        // Collect all question objects in this group (for grouped questions, multiple sub-questions)
        const questionsInGroup = group.questions.map(a => a.question).filter(Boolean);

        // Question-type filters: AND logic — must pass every selected filter
        let passesQuestionFilters = !hasQuestionFilters;
        if (hasQuestionFilters) {
          passesQuestionFilters = true;
          if (filters.questions.mandatory) {
            if (!firstQ?.is_mandatory) passesQuestionFilters = false;
          }
          if (filters.questions.required) {
            const anyRequired = questionsInGroup.some(q => q?.id && profileUserRequiredQuestionIds.has(String(q.id).toLowerCase()));
            if (!anyRequired) passesQuestionFilters = false;
          }
          if (filters.questions.submitted) {
            const currentUserId = localStorage.getItem('user_id');
            const submittedByMe = firstQ?.submitted_by?.id === currentUserId || firstQ?.is_submitted_by_me;
            if (!submittedByMe) passesQuestionFilters = false;
          }
          // For myPending/theirPending: answered groups don't match pending filters
          // so we exclude them (they are not "pending" by definition)
          if (filters.questions.myPending) {
            // This answered group doesn't match "my pending" — exclude unless it also passes other active filters
            passesQuestionFilters = false;
          }
          if (filters.questions.theirPending) {
            passesQuestionFilters = false;
          }
        }

        // Tag filters: OR logic — must have at least one of the selected tags (check all questions in group)
        let passesTagFilters = !hasTagFilters;
        if (hasTagFilters) {
          const allTagsInGroup = new Set<string>();
          questionsInGroup.forEach(q => {
            const qExt = q as typeof q & { tags?: { name?: string }[] };
            (qExt?.tags || []).forEach((t: { name?: string } | string) => {
              const name = typeof t === 'string' ? t.toLowerCase() : (t as { name?: string }).name?.toLowerCase();
              if (name) allTagsInGroup.add(name);
            });
          });
          if (filters.tags.value && allTagsInGroup.has('value')) passesTagFilters = true;
          if (filters.tags.lifestyle && allTagsInGroup.has('lifestyle')) passesTagFilters = true;
          if (filters.tags.look && allTagsInGroup.has('look')) passesTagFilters = true;
          if (filters.tags.trait && allTagsInGroup.has('trait')) passesTagFilters = true;
          if (filters.tags.hobby && allTagsInGroup.has('hobby')) passesTagFilters = true;
          if (filters.tags.interest && allTagsInGroup.has('interest')) passesTagFilters = true;
        }

        return passesQuestionFilters && passesTagFilters;
      });
    }

    // Apply sorting
    const sorted = [...filtered];
    switch (sortOption) {
      case 'popular':
        sorted.sort((a, b) => b[1].answerCount - a[1].answerCount);
        break;
      case 'new':
        // Sort by most recently answered (most recent first)
        sorted.sort((a, b) => {
          const timeA = a[1].mostRecentAnswerTime;
          const timeB = b[1].mostRecentAnswerTime;

          // If both have timestamps, compare them
          if (timeA && timeB) {
            return new Date(timeB).getTime() - new Date(timeA).getTime();
          }
          // If only one has a timestamp, prioritize it
          if (timeA && !timeB) return -1;
          if (!timeA && timeB) return 1;
          // If neither has a timestamp, fall back to question number
          return b[1].questionNumber - a[1].questionNumber;
        });
        break;
      case 'number':
      default:
        sorted.sort((a, b) => a[1].questionNumber - b[1].questionNumber);
        break;
    }

    return sorted;
  }, [groupedQuestionsForModal, pendingQuestionGroups, filters, sortOption, profileUserRequiredQuestionIds]);

  // Paginate filtered and sorted questions for modal (8 per page)
  const paginatedGroupedQuestions = useMemo(() => {
    const startIndex = (questionsModalPage - 1) * QUESTIONS_PER_PAGE;
    const endIndex = startIndex + QUESTIONS_PER_PAGE;
    return filteredAndSortedQuestions.slice(startIndex, endIndex);
  }, [filteredAndSortedQuestions, questionsModalPage]);

  // Calculate total pages for modal (handle both grouped and fallback cases)
  const totalModalPages = useMemo(() => {
    if (filteredAndSortedQuestions.length > 0) {
      return Math.ceil(filteredAndSortedQuestions.length / QUESTIONS_PER_PAGE);
    }
    // Fallback: calculate pages based on unique question numbers
    const uniqueQuestionNumbers = new Set(userAnswers.map(answer => answer.question.question_number));
    return Math.ceil(uniqueQuestionNumbers.size / QUESTIONS_PER_PAGE);
  }, [filteredAndSortedQuestions, userAnswers]);

  // Reset pagination and selected question when modal opens
  useEffect(() => {
    if (showQuestionsModal) {
      setQuestionsModalPage(1);
      setSelectedQuestionNumber(null);
      setSelectedQuestionData([]);
      setSelectedGroupedQuestionId(null);
    }
  }, [showQuestionsModal]);

  // Sync pendingFilters with filters when filter modal opens
  useEffect(() => {
    if (showFilterModal) {
      setPendingFilters(filters);
    }
  }, [showFilterModal, filters]);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showSortDropdown && !target.closest('.sort-dropdown-container')) {
        setShowSortDropdown(false);
      }
    };

    if (showSortDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSortDropdown]);

  // Handle question click - show question details in modal
  const handleQuestionClick = async (questionNumber: number, questionType?: string) => {
    // Reset edit mode when navigating to a different question
    setIsAnsweringPending(false);
    setSelectedGroupedQuestionId(null);

    // Always fetch questions for this specific question number to ensure we have all of them
    try {
      const response = await fetch(
        `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=${questionNumber}&page_size=100`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        let questionsForNumber = data.results || [];
        
        // Sort by group_number if available
        questionsForNumber.sort((a: any, b: any) => (a.group_number || 0) - (b.group_number || 0));
        
        // Update allQuestions to include these
        setAllQuestions(prev => {
          const existing = prev.filter(q => q.question_number !== questionNumber);
          return [...existing, ...questionsForNumber];
        });
        
        if (questionsForNumber.length > 0) {
          setSelectedQuestionNumber(questionNumber);
          setSelectedQuestionData(questionsForNumber);
        }
      }
    } catch (error) {
      console.error('Error fetching questions for question number:', questionNumber, error);
      // Fallback to using questions from allQuestions if fetch fails
      const questionsForNumber = allQuestions.filter(q => q.question_number === questionNumber);
      if (questionsForNumber.length > 0) {
        questionsForNumber.sort((a: any, b: any) => (a.group_number || 0) - (b.group_number || 0));
        setSelectedQuestionNumber(questionNumber);
        setSelectedQuestionData(questionsForNumber);
      }
    }
  };

  // Handle back to questions list
  const handleBackToQuestionsList = () => {
    setSelectedQuestionNumber(null);
    setSelectedQuestionData([]);
    setSelectedGroupedQuestionId(null);
    setIsAnsweringPending(false);
  };

  // Handle "Answer Question" button — switch to inline edit for the current question
  const handleAnswerQuestion = () => {
    if (!selectedQuestionNumber || !selectedQuestionData.length) return;
    const currentUserId = localStorage.getItem('user_id');
    const questionsForNumber = selectedQuestionData;

    // Helper to pre-populate sliders from existing answers
    const initSliders = (existingAnswers: any[]) => {
      const sliders: Record<string, number> = {};
      const openToAll: Record<string, boolean> = {};
      questionsForNumber.forEach((q: any) => {
        const key = `q${q.group_number || q.id}`;
        const existing = existingAnswers.find((a: any) => {
          const aQid = typeof a.question === 'object' ? a.question.id : a.question;
          return aQid === q.id;
        });
        sliders[`${key}_me`] = existing ? (existing.me_open_to_all ? 3 : existing.me_answer || 3) : 3;
        sliders[`${key}_looking`] = existing ? (existing.looking_for_open_to_all ? 3 : existing.looking_for_answer || 3) : 3;
        openToAll[`${key}_me`] = existing?.me_open_to_all || false;
        openToAll[`${key}_looking`] = existing?.looking_for_open_to_all || false;
      });
      setEditSliderAnswers(sliders);
      setEditOpenToAllStates(openToAll);
      const firstExisting = existingAnswers[0];
      setEditImportanceValues({
        me: firstExisting?.me_importance || 3,
        lookingFor: firstExisting?.looking_for_importance || 3,
      });
      setEditMeShare(firstExisting?.me_share !== false);
      setEditMeRequired(false);
    };

    // Switch to edit mode immediately with defaults
    setIsAnsweringPending(true);
    setEditError('');
    if (questionsForNumber[0]?.question_type === 'grouped') {
      setSelectedGroupedQuestionId(null);
    }
    initSliders([]); // Defaults first

    // Then fetch existing answers in the background to update sliders
    if (currentUserId) {
      fetch(
        `${getApiUrl(API_ENDPOINTS.ANSWERS)}?user=${currentUserId}&page_size=100`,
        { headers: { 'Content-Type': 'application/json' } }
      )
        .then(resp => resp.ok ? resp.json() : null)
        .then(data => {
          if (!data) return;
          const allAnswers = data.results || [];
          const existingAnswers = allAnswers.filter((a: any) => {
            const qId = typeof a.question === 'object' ? a.question.id : a.question;
            return questionsForNumber.some((q: any) => q.id === qId);
          });
          if (existingAnswers.length > 0) {
            initSliders(existingAnswers);
          }
        })
        .catch(() => { /* keep defaults */ });
    }
  };

  // Handle clicking a "My Pending" question card - opens inline edit form
  const handlePendingQuestionClick = async (questionNumber: number) => {
    try {
      const response = await fetch(
        `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=${questionNumber}&page_size=100`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        let questionsForNumber = data.results || [];
        questionsForNumber.sort((a: any, b: any) => (a.group_number || 0) - (b.group_number || 0));

        setSelectedQuestionNumber(questionNumber);
        setSelectedQuestionData(questionsForNumber);
        setIsAnsweringPending(true);
        setEditError('');

        // For grouped questions (e.g. ethnicity), show card list first — don't init sliders yet
        if (questionsForNumber.length > 0 && questionsForNumber[0].question_type === 'grouped') {
          // Slider state will be initialized when user picks a sub-question
          setEditSliderAnswers({});
          setEditOpenToAllStates({});
          setEditImportanceValues({ me: 3, lookingFor: 3 });
          setEditMeShare(true);
          setEditMeRequired(false);
          return;
        }

        // Initialize default slider values using same key pattern as questions page
        const sliders: Record<string, number> = {};
        const openToAll: Record<string, boolean> = {};
        questionsForNumber.forEach((q: any) => {
          const key = `q${q.group_number || q.id}`;
          sliders[`${key}_me`] = 3;
          sliders[`${key}_looking`] = 3;
          openToAll[`${key}_me`] = false;
          openToAll[`${key}_looking`] = false;
        });
        setEditSliderAnswers(sliders);
        setEditOpenToAllStates(openToAll);
        setEditImportanceValues({ me: 3, lookingFor: 3 });
        setEditMeShare(true);
        setEditMeRequired(false);
      }
    } catch (error) {
      console.error('Error fetching questions for pending question:', questionNumber, error);
    }
  };

  // Handle saving answers for a "My Pending" question
  const handleSavePendingAnswer = async () => {
    setEditSaving(true);
    setEditError('');
    const currentUserId = localStorage.getItem('user_id');
    if (!currentUserId || !selectedQuestionData.length) {
      setEditSaving(false);
      return;
    }

    try {
      const updates = [];
      const questionNumber = selectedQuestionNumber!;
      const isGrouped = selectedQuestionData[0]?.question_type === 'grouped';

      // For grouped questions with a selected sub-question, only save that one
      const questionsToSave = (isGrouped && selectedGroupedQuestionId)
        ? selectedQuestionData.filter((q: any) => q.id === selectedGroupedQuestionId)
        : selectedQuestionData;

      // Build answer data for each question to save
      for (const question of questionsToSave) {
        const key = `q${question.group_number || question.id}`;
        const isNonGrouped = questionNumber > 10 && question.question_type !== 'grouped';

        const answerData: any = {
          user_id: currentUserId,
          question_id: question.id,
          me_answer: editOpenToAllStates[`${key}_me`] ? 6 : editSliderAnswers[`${key}_me`] || 3,
          me_open_to_all: editOpenToAllStates[`${key}_me`] || false,
          me_importance: editImportanceValues.me,
          me_share: isNonGrouped ? editMeShare : true,
          looking_for_answer: editOpenToAllStates[`${key}_looking`] ? 6 : editSliderAnswers[`${key}_looking`] || 3,
          looking_for_open_to_all: editOpenToAllStates[`${key}_looking`] || false,
          looking_for_importance: editImportanceValues.lookingFor,
          looking_for_share: true,
          is_required_for_me: isNonGrouped ? editMeRequired : false
        };

        updates.push(
          fetch(getApiUrl(API_ENDPOINTS.ANSWERS), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(answerData)
          })
        );
      }

      const results = await Promise.all(updates);
      const failed = results.find(r => !r.ok);
      if (failed) throw new Error('Failed to save');

      // Update localStorage for instant UI feedback
      const answeredQuestionsKey = `answered_questions_${currentUserId}`;
      const existingAnswered = JSON.parse(localStorage.getItem(answeredQuestionsKey) || '[]');
      questionsToSave.forEach((q: any) => {
        if (!existingAnswered.includes(q.id)) existingAnswered.push(q.id);
      });
      localStorage.setItem(answeredQuestionsKey, JSON.stringify(existingAnswered));

      // Update currentUserAnsweredQuestionIds so pending list refreshes
      setCurrentUserAnsweredQuestionIds(prev => {
        const next = new Set(prev);
        questionsToSave.forEach((q: any) => next.add(String(q.id).toLowerCase()));
        return next;
      });

      // Clear profile cache so it refreshes on next visit
      sessionStorage.removeItem(`profile_${userId}`);
      sessionStorage.removeItem(`profile_${userId}_timestamp`);

      // For grouped questions, go back to card list; for others, go back to question list
      if (isGrouped && selectedGroupedQuestionId) {
        setSelectedGroupedQuestionId(null);
      } else {
        setIsAnsweringPending(false);
        handleBackToQuestionsList();
      }
    } catch (error) {
      setEditError('Failed to save answers');
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) {
    const loadingTexts = ['Loading profile...', 'Fetching details...', 'Almost there...'];
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          {/* Heart with math operators */}
          <div className="relative w-40 h-40 flex items-center justify-center">
            {/* Floating math operators */}
            {['×', '÷', '+', '−', '=', '%', '√'].map((op, i) => (
              <span
                key={op}
                className="profile-math-operator absolute text-xl font-bold"
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
            {/* Pulsing gradient heart */}
            <svg
              className="profile-heart-pulse relative z-10"
              width="72"
              height="72"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="profileHeartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#A855F7" />
                  <stop offset="50%" stopColor="#7C3AED" />
                  <stop offset="100%" stopColor="#672DB7" />
                </linearGradient>
              </defs>
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill="url(#profileHeartGradient)"
              />
            </svg>
          </div>

          {/* Cycling loading text */}
          <p className="mt-6 text-lg font-semibold text-gray-700 profile-loading-text">
            {loadingTexts[loadingTextIndex]}
          </p>
        </div>

        <style jsx>{`
          @keyframes profileHeartPulse {
            0%, 100% { transform: scale(1); }
            15% { transform: scale(1.18); }
            30% { transform: scale(1); }
            45% { transform: scale(1.12); }
            60% { transform: scale(1); }
          }

          @keyframes profileOrbit0 { 0% { transform: translate(-50%, -50%) rotate(0deg) translateX(60px) rotate(0deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(360deg) translateX(60px) rotate(-360deg); opacity: 0.5; } }
          @keyframes profileOrbit1 { 0% { transform: translate(-50%, -50%) rotate(51deg) translateX(64px) rotate(-51deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(411deg) translateX(64px) rotate(-411deg); opacity: 0.5; } }
          @keyframes profileOrbit2 { 0% { transform: translate(-50%, -50%) rotate(103deg) translateX(58px) rotate(-103deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(463deg) translateX(58px) rotate(-463deg); opacity: 0.5; } }
          @keyframes profileOrbit3 { 0% { transform: translate(-50%, -50%) rotate(154deg) translateX(66px) rotate(-154deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(514deg) translateX(66px) rotate(-514deg); opacity: 0.5; } }
          @keyframes profileOrbit4 { 0% { transform: translate(-50%, -50%) rotate(206deg) translateX(60px) rotate(-206deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(566deg) translateX(60px) rotate(-566deg); opacity: 0.5; } }
          @keyframes profileOrbit5 { 0% { transform: translate(-50%, -50%) rotate(257deg) translateX(62px) rotate(-257deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(617deg) translateX(62px) rotate(-617deg); opacity: 0.5; } }
          @keyframes profileOrbit6 { 0% { transform: translate(-50%, -50%) rotate(309deg) translateX(58px) rotate(-309deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(669deg) translateX(58px) rotate(-669deg); opacity: 0.5; } }

          @keyframes profileTextFade {
            0%, 100% { opacity: 0; transform: translateY(4px); }
            15%, 85% { opacity: 1; transform: translateY(0); }
          }

          .profile-heart-pulse {
            animation: profileHeartPulse 1.6s ease-in-out infinite;
          }

          .profile-math-operator:nth-child(1) { animation: profileOrbit0 3.5s linear infinite both; }
          .profile-math-operator:nth-child(2) { animation: profileOrbit1 4.0s linear infinite both; }
          .profile-math-operator:nth-child(3) { animation: profileOrbit2 3.2s linear infinite both; }
          .profile-math-operator:nth-child(4) { animation: profileOrbit3 3.8s linear infinite both; }
          .profile-math-operator:nth-child(5) { animation: profileOrbit4 4.2s linear infinite both; }
          .profile-math-operator:nth-child(6) { animation: profileOrbit5 3.6s linear infinite both; }
          .profile-math-operator:nth-child(7) { animation: profileOrbit6 3.4s linear infinite both; }

          .profile-loading-text {
            animation: profileTextFade 1.5s ease-in-out infinite;
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
            onClick={() => router.back()}
            className="px-4 py-2 bg-[#672DB7] text-white rounded-md hover:bg-purple-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const profileIcons = getProfileIcons();
  // Get the first name only
  const displayName = user.first_name || user.username;

  // Helper function to get the hide button icon based on tag state
  const getHideButtonIcon = () => {
    if (selectedTags.includes('hide')) {
      return '/assets/eye.png';
    } else {
      return '/assets/pslash.png';
    }
  };

  // Helper function to get the current action button icon based on tag state
  const getActionButtonIcon = () => {
    if (hasMatch) {
      return '/assets/purpleheart.png';
    } else if (selectedTags.includes('like')) {
      return '/assets/redheart.png';
    } else if (selectedTags.includes('approve')) {
      return '/assets/strokeheart.png';
    } else {
      return '/assets/approve.png';
    }
  };

  // Helper function to get the action button alt text
  const getActionButtonAlt = () => {
    if (hasMatch) {
      return 'Match';
    } else if (selectedTags.includes('like')) {
      return 'Liked';
    } else if (selectedTags.includes('approve')) {
      return 'Approved';
    } else {
      return 'Approve';
    }
  };

  // Handle action button click with seamless progression logic
  const handleActionButtonClick = async () => {
    const currentUserId = localStorage.getItem('user_id');
    if (!currentUserId || !userId) return;

    console.log('🔘 Action button clicked. Current tags:', selectedTags);

    // Determine what to do based on current state
    let action = '';
    if (hasMatch || selectedTags.includes('like')) {
      // If matched or liked, remove like tag (go back to approved state)
      action = 'remove_like';
    } else if (selectedTags.includes('approve')) {
      // If approved, check if they have approved me before allowing like
      const theyApprovedMe = await checkIfTheyApprovedMe();
      if (!theyApprovedMe) {
        // Show popup that they need to approve you first
        setShowApprovalPopup(true);
        return;
      }
      // They approved me, show note popup directly
      setShowNotePopup(true);
      return;
    } else {
      // If no tags, add approve
      action = 'add_approve';
    }

    console.log('🎬 Action determined:', action);

    // Update UI optimistically
    let newSelectedTags = [...selectedTags];

    switch (action) {
      case 'remove_like':
        newSelectedTags = newSelectedTags.filter(tag => tag !== 'like');
        // Keep approve tag - user stays in approved state
        if (!newSelectedTags.includes('approve')) {
          newSelectedTags.push('approve');
        }
        setHasMatch(false);
        break;
      case 'add_approve':
        // Add approve, remove hide if present
        newSelectedTags = newSelectedTags.filter(tag => tag !== 'hide');
        newSelectedTags.push('approve');
        break;
    }

    // Update UI immediately
    setSelectedTags(newSelectedTags);

    // Sync with backend
    try {
      switch (action) {
        case 'remove_like':
          await toggleTagAPI('Like');
          // Add approve back if not present
          if (!selectedTags.includes('approve')) {
            await toggleTagAPI('Approve');
          }
          // Reset celebration flag when unmatching to allow re-celebration
          setCelebratedMatch(false);
          // Check for match after removing like
          await checkForMatch(newSelectedTags);
          break;
        case 'add_approve':
          // Remove hide tag if present before adding approve
          if (selectedTags.includes('hide')) {
            console.log('🚫 Removing hide tag before approving');
            await toggleTagAPI('Hide');
          }
          console.log('✅ Adding approve tag');
          await toggleTagAPI('Approve');
          break;
      }

      // Refresh tags from server to ensure sync
      const currentUserId = localStorage.getItem('user_id');
      if (currentUserId && userId) {
        console.log('🔄 Refreshing tags from server...');
        const response = await fetch(
          `${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/user_tags/?user_id=${currentUserId}&result_user_id=${userId}`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        if (response.ok) {
          const data = await response.json();
          const refreshedTags = (data.tags || []).map((tag: string) => tag.toLowerCase());
          console.log('✅ Tags refreshed from server:', refreshedTags);
          setSelectedTags(refreshedTags);
        }
      }
    } catch (error) {
      // Revert on error
      setSelectedTags(selectedTags);
      setHasMatch(false);
      console.error('Error updating progression:', error);
    }
  };

  // Handle chat button click
  const handleChatClick = async () => {
    const currentUserId = localStorage.getItem('user_id');
    if (!currentUserId || !userId) {
      router.push('/auth/login');
      return;
    }

    try {
      // Create or get existing conversation
      const conversation = await apiService.createOrGetConversation(currentUserId, userId);
      // Navigate to the conversation
      router.push(`/chats/${conversation.id}`);
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  // Check if the other user has approved me
  const checkIfTheyApprovedMe = async (): Promise<boolean> => {
    const currentUserId = localStorage.getItem('user_id');
    if (!currentUserId || !userId) return false;

    try {
      const theirTagsResponse = await fetch(
        `${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/user_tags/?user_id=${userId}&result_user_id=${currentUserId}`,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (theirTagsResponse.ok) {
        const theirData = await theirTagsResponse.json();
        const theirNormalizedTags = (theirData.tags || []).map((tag: string) => tag.toLowerCase());
        return theirNormalizedTags.includes('approve') || theirNormalizedTags.includes('like');
      }
    } catch (error) {
      console.error('Error checking if they approved me:', error);
    }
    return false;
  };

  // Check if there's a match (both users liked each other)
  const checkForMatch = async (currentTags?: string[]) => {
    const currentUserId = localStorage.getItem('user_id');
    if (!currentUserId || !userId) return;

    try {
      // Use provided tags or fetch current tags
      const tagsToCheck = currentTags || selectedTags;
      const iLikedThem = tagsToCheck.includes('like');

      if (!iLikedThem) {
        setHasMatch(false);
        return;
      }

      // Check if they've liked me
      const theirTagsResponse = await fetch(
        `${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/user_tags/?user_id=${userId}&result_user_id=${currentUserId}`,
        {

          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (theirTagsResponse.ok) {
        const theirData = await theirTagsResponse.json();
        const theirNormalizedTags = (theirData.tags || []).map((tag: string) => tag.toLowerCase());
        const theyLikedMe = theirNormalizedTags.includes('like');
        const isMatch = iLikedThem && theyLikedMe;

        // Trigger celebration if it's a new match and hasn't been celebrated yet
        if (isMatch && !hasMatch && !celebratedMatch) {
          setShowMatchCelebration(true);
          setCelebratedMatch(true);
          
          // Save to localStorage to prevent showing again
          const celebratedMatchesKey = `celebrated_matches_${currentUserId}`;
          const existingMatches = localStorage.getItem(celebratedMatchesKey);
          const matchesSet = existingMatches ? new Set(JSON.parse(existingMatches)) : new Set();
          // Use match key (sorted pair) instead of just userId
          const matchKey = getMatchKey(currentUserId, userId);
          matchesSet.add(matchKey);
          localStorage.setItem(celebratedMatchesKey, JSON.stringify(Array.from(matchesSet)));
        }

        setHasMatch(isMatch);
      }
    } catch (error) {
      console.error('Error checking for match:', error);
    }
  };

  // Simple API call function
  const toggleTagAPI = async (tag: string) => {
    const currentUserId = localStorage.getItem('user_id');
    if (!currentUserId || !userId) return;

    const response = await fetch(
      `${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/toggle_tag/`,
      {
        method: 'POST',

        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          result_user_id: userId,
          tag: tag,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to toggle tag');
    }
  };


  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-200">
        <div className="flex-1">
          <button onClick={() => router.back()} className="flex items-center">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        <Image
          src="/assets/mmlogox.png"
          alt="Logo"
          width={32}
          height={32}
        />
        <div className="flex-1 flex justify-end">
          <HamburgerMenu />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto px-6 lg:px-12 xl:px-20 py-4">
        {/* Profile Photo and Name */}
        <div className="relative mb-6 w-full sm:w-95 mx-auto">
          {/* Photo Card - on top */}
          <div className="w-full aspect-[4/3] sm:aspect-[4/4] bg-gradient-to-b from-orange-400 to-orange-600 rounded-2xl overflow-hidden relative z-10">
            {user.profile_photo ? (
              <Image
                src={user.profile_photo}
                alt={displayName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-6xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute bottom-4 left-4">
              <h1 className="text-3xl font-bold text-white mb-1" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.8)' }}>
                {displayName}{user.age ? `, ${user.age}` : ''}
              </h1>
            </div>

            {/* Action Icons - Bottom Right */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-4">
              <button
                onClick={() => handleTagToggle('Hide')}
                className="hover:scale-105 transition-transform cursor-pointer"
              >
                <Image
                  key={selectedTags.includes('hide') ? 'eye' : 'pslash'}
                  src={getHideButtonIcon()}
                  alt={selectedTags.includes('hide') ? 'Unhide' : 'Hide'}
                  width={48}
                  height={48}
                />
              </button>
              <button
                onClick={() => handleActionButtonClick()}
                className="hover:scale-105 transition-transform cursor-pointer"
              >
                <Image
                  src={getActionButtonIcon()}
                  alt={getActionButtonAlt()}
                  width={48}
                  height={48}
                />
              </button>
            </div>
          </div>

          {/* Purple/Orange Sleeve - pulled up behind the photo (color from results card when ?border= is set) */}
          <div className="rounded-2xl -mt-6 pt-9 pb-3.5 px-5 relative z-0" style={{ background: effectiveShowOrange ? 'linear-gradient(135deg, #FB923C 0%, #F97316 50%, #EA580C 100%)' : 'linear-gradient(135deg, #A855F7 0%, #7C3AED 50%, #672DB7 100%)' }}>
            <div className="flex justify-between gap-3">
              <button
                onClick={handleChatClick}
                disabled={!hasMatch}
                className={`flex-1 px-4 py-2 rounded-full font-medium text-sm transition-colors text-center ${
                  hasMatch
                    ? 'bg-white text-black hover:bg-gray-100 cursor-pointer'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => {
                  console.log('Questions button clicked, opening modal');
                  setShowQuestionsModal(true);
                }}
                className="flex-1 bg-white text-black px-4 py-2 rounded-full font-medium text-sm hover:bg-gray-100 transition-colors cursor-pointer text-center"
              >
                Questions
              </button>
            </div>
          </div>
        </div>

        {/* Tagline and Activity Status - below the purple extension */}
        <div className="w-full sm:w-95 mx-auto -mt-2 mb-6">
          <div className="flex items-center justify-between gap-4">
            {/* Tagline - Left/Center side */}
            {user.tagline && (
              <p className="text-gray-700 text-lg flex-1">{user.tagline}</p>
            )}

            {/* Activity Status - Right side */}
            <ActivityStatus
              isOnline={user.is_online || false}
              lastActive={user.last_active}
            />
          </div>
        </div>

        {/* Profile Icons - horizontal layout with containers */}
        {profileIcons.length > 0 && (
          <div className="flex justify-start flex-wrap gap-3 mb-6">
            {profileIcons.map((icon, index) => (
              <div key={index} className="flex items-center bg-[#F3F3F3] rounded-full px-4 py-1">
                <div className="w-7 h-7 mr-1 relative">
                  <Image
                    src={icon.image}
                    alt={icon.label}
                    width={icon.image.includes('drink.png') ? 25 : 28}
                    height={icon.image.includes('drink.png') ? 25 : 28}
                    className="object-contain"
                    style={icon.image.includes('prayin.png') ? { position: 'relative', top: '-4px' } : {}}
                  />
                </div>
                <span className="text-base text-black font-medium">{icon.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Compatibility Section */}
        {compatibility && (
          <div className="mb-8">
            {/* First Row: Overall, Me, Them - Larger Cards */}
            <div className="flex gap-3 mb-3">
              {/* Overall */}
              <div className="bg-[#F3F3F3] rounded-xl px-4 py-3 flex-1">
                <div className="text-sm font-normal text-black capitalize mb-2">
                  Overall
                </div>
                <div className="flex items-baseline">
                  <span className={`text-3xl font-black ${effectiveShowOrange ? 'text-[#EA580C]' : 'text-[#672DB7]'}`}>
                    {Math.round(effectiveShowOrange &&
                                compatibility.required_overall_compatibility !== undefined &&
                                compatibility.required_overall_compatibility !== null
                      ? compatibility.required_overall_compatibility
                      : compatibility.overall_compatibility)}
                  </span>
                  <span className={`text-lg font-bold ml-1 ${effectiveShowOrange ? 'text-[#EA580C]' : 'text-[#672DB7]'}`}>%</span>
                </div>
              </div>

              {/* Me */}
              <div className="bg-[#F3F3F3] rounded-xl px-4 py-3 flex-1">
                <div className="text-sm font-normal text-black capitalize mb-2">
                  Me
                </div>
                <div className="flex items-baseline">
                  <span className={`text-3xl font-black ${effectiveShowOrange ? 'text-[#EA580C]' : 'text-[#672DB7]'}`}>
                    {Math.round(effectiveShowOrange &&
                                compatibility.required_im_compatible_with !== undefined &&
                                compatibility.required_im_compatible_with !== null
                      ? compatibility.required_im_compatible_with
                      : compatibility.im_compatible_with)}
                  </span>
                  <span className={`text-lg font-bold ml-1 ${effectiveShowOrange ? 'text-[#EA580C]' : 'text-[#672DB7]'}`}>%</span>
                </div>
              </div>

              {/* Them */}
              <div className="bg-[#F3F3F3] rounded-xl px-4 py-3 flex-1">
                <div className="text-sm font-normal text-black capitalize mb-2">
                  Them
                </div>
                <div className="flex items-baseline">
                  <span className={`text-3xl font-black ${effectiveShowOrange ? 'text-[#EA580C]' : 'text-[#672DB7]'}`}>
                    {Math.round(effectiveShowOrange &&
                                compatibility.required_compatible_with_me !== undefined &&
                                compatibility.required_compatible_with_me !== null
                      ? compatibility.required_compatible_with_me
                      : compatibility.compatible_with_me)}
                  </span>
                  <span className={`text-lg font-bold ml-1 ${effectiveShowOrange ? 'text-[#EA580C]' : 'text-[#672DB7]'}`}>%</span>
                </div>
              </div>
            </div>

            {/* Second Row: My Required, Their Required, Mutual Questions, Questions Answered - Smaller Cards */}
            <div className="flex gap-3">
              {/* My Required */}
              <div className="bg-[#F3F3F3] rounded-xl px-3 py-2 flex-1">
                <div className="text-sm font-normal text-black capitalize mb-2">
                  My Required
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline">
                    <span className={`text-3xl font-black ${effectiveShowOrange ? 'text-[#EA580C]' : 'text-[#672DB7]'}`}>
                      {compatibility.user1_required_completeness !== undefined
                        ? Math.round(compatibility.user1_required_completeness * 100)
                        : 'N/A'}
                    </span>
                    {compatibility.user1_required_completeness !== undefined && (
                      <span className={`text-lg font-bold ml-1 ${effectiveShowOrange ? 'text-[#EA580C]' : 'text-[#672DB7]'}`}>%</span>
                    )}
                  </div>
                  {compatibility.my_required_mutual_count !== undefined &&
                   compatibility.my_required_total_count !== undefined &&
                   compatibility.my_required_total_count > 0 && (
                    <span className="text-gray-600">
                      {compatibility.my_required_mutual_count}/{compatibility.my_required_total_count}
                    </span>
                  )}
                </div>
              </div>

              {/* Their Required */}
              <div className="bg-[#F3F3F3] rounded-xl px-3 py-2 flex-1">
                <div className="text-sm font-normal text-black capitalize mb-2">
                  Their Required
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline">
                    <span className={`text-3xl font-black ${effectiveShowOrange ? 'text-[#EA580C]' : 'text-[#672DB7]'}`}>
                      {compatibility.user2_required_completeness !== undefined
                        ? Math.round(compatibility.user2_required_completeness * 100)
                        : 'N/A'}
                    </span>
                    {compatibility.user2_required_completeness !== undefined && (
                      <span className={`text-lg font-bold ml-1 ${effectiveShowOrange ? 'text-[#EA580C]' : 'text-[#672DB7]'}`}>%</span>
                    )}
                  </div>
                  {compatibility.their_required_mutual_count !== undefined &&
                   compatibility.their_required_total_count !== undefined &&
                   compatibility.their_required_total_count > 0 && (
                    <span className="text-gray-600">
                      {compatibility.their_required_mutual_count}/{compatibility.their_required_total_count}
                    </span>
                  )}
                </div>
              </div>

              {/* Mutual Questions */}
              <div className="bg-[#F3F3F3] rounded-xl px-3 py-2 flex-1">
                <div className="text-sm font-normal text-black capitalize mb-2">
                  Mutual Questions
                </div>
                <div className="flex items-baseline">
                  <span className={`text-3xl font-black ${effectiveShowOrange ? 'text-[#EA580C]' : 'text-[#672DB7]'}`}>
                    {compatibility.mutual_questions_count || 0}
                  </span>
                </div>
              </div>

              {/* Questions Answered */}
              <div className="bg-[#F3F3F3] rounded-xl px-3 py-2 flex-1">
                <div className="text-sm font-normal text-black capitalize mb-2">
                  Questions Answered
                </div>
                <div className="flex items-baseline">
                  <span className={`text-3xl font-black ${effectiveShowOrange ? 'text-[#EA580C]' : 'text-[#672DB7]'}`}>
                    {userAnswers.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* User Info - responsive layout */}
        <div className="grid grid-cols-2 gap-4 sm:flex sm:items-center sm:space-x-16 mb-6">
          <div>
            <h3 className="font-semibold text-gray-900">Username</h3>
            <p className="text-gray-600">{user.username}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">From</h3>
            <p className="text-gray-600">{user.from_location || 'Austin'}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Live</h3>
            <p className="text-gray-600">{user.live || 'Austin'}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Height</h3>
            <p className="text-gray-600">{formatHeight(user.height)}</p>
          </div>
        </div>

        {/* Bio */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Bio</h3>
          <p className="text-gray-600">{user.bio || 'Lord of the rings hardcore fan and doja cat enthusiast'}</p>
        </div>

        {/* My Gender Section - left aligned content block */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">Gender</h3>

          {/* Me Section */}
          <div className="mb-6">
            <div className="max-w-md">
              {/* Me label aligned with middle of slider */}
              <div className="mb-2 flex" style={{ paddingLeft: '5rem' }}>
                <div className="flex-1 relative">
                  <div className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                    <h4 className="font-semibold text-lg">Me</h4>
                  </div>
                </div>
              </div>

              {/* LESS, MORE labels above sliders - aligned with slider start */}
              <div className="flex justify-between text-xs text-gray-500 mb-2 ml-16 sm:ml-20">
                <span>LESS</span>
                <span>MORE</span>
              </div>

              <div className="space-y-3">
                {/* MALE Slider Row */}
                <div className="flex items-center gap-4">
                  <div className="text-xs font-semibold text-gray-400 w-16">MALE</div>
                  <div className="flex-1">
                    <SliderComponent
                      value={getAnswerValue(2, 1) || 3}
                      onChange={() => {}}
                      isOpenToAll={getAnswerValue(2, 1) === 6}
                    />
                  </div>
                </div>

                {/* FEMALE Slider Row */}
                <div className="flex items-center gap-4">
                  <div className="text-xs font-semibold text-gray-400 w-16">FEMALE</div>
                  <div className="flex-1">
                    <SliderComponent
                      value={getAnswerValue(2, 2) || 3}
                      onChange={() => {}}
                      isOpenToAll={getAnswerValue(2, 2) === 6}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interested In Section */}
          <div className="mb-6">
            <div className="max-w-md">
              {/* Interested In label aligned with middle of slider */}
              <div className="mb-2 flex" style={{ paddingLeft: '5rem' }}>
                <div className="flex-1 relative">
                  <div className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                    <h4 className="font-semibold text-lg" style={{ color: '#672DB7' }}>Interested In</h4>
                  </div>
                </div>
              </div>
              {/* LESS, MORE labels above sliders - aligned with slider start */}
              <div className="flex justify-between text-xs text-gray-500 mb-2 ml-16 sm:ml-20">
                <span>LESS</span>
                <span>MORE</span>
              </div>

              <div className="space-y-3">
                {/* MALE Slider Row */}
                <div className="flex items-center gap-4">
                  <div className="text-xs font-semibold text-gray-400 w-16">MALE</div>
                  <div className="flex-1">
                    <SliderComponent
                      value={getAnswerValue(2, 1, 'looking_for_answer') || 3}
                      onChange={() => {}}
                      isOpenToAll={getAnswerValue(2, 1, 'looking_for_answer') === 6}
                    />
                  </div>
                </div>

                {/* FEMALE Slider Row */}
                <div className="flex items-center gap-4">
                  <div className="text-xs font-semibold text-gray-400 w-16">FEMALE</div>
                  <div className="flex-1">
                    <SliderComponent
                      value={getAnswerValue(2, 2, 'looking_for_answer') || 3}
                      onChange={() => {}}
                      isOpenToAll={getAnswerValue(2, 2, 'looking_for_answer') === 6}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* I'm Looking For Section */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">I&apos;m Looking For</h3>

          <div className="max-w-md">
            {/* LESS, MORE labels above sliders - aligned with slider start */}
            <div className="flex justify-between text-xs text-gray-500 mb-2 ml-20 sm:ml-24">
              <span>LESS</span>
              <span>MORE</span>
            </div>

            <div className="space-y-3">
              {/* FRIEND Slider Row */}
              <div className="flex items-center gap-4">
                <div className="text-xs font-semibold text-gray-400 w-20">FRIEND</div>
                <div className="flex-1">
                  <SliderComponent
                    value={getAnswerValue(1, 1, 'me_answer') || 3}
                    onChange={() => {}}
                    isOpenToAll={getAnswerValue(1, 1, 'me_answer') === 6}
                  />
                </div>
              </div>

              {/* HOOK UP Slider Row */}
              <div className="flex items-center gap-4">
                <div className="text-xs font-semibold text-gray-400 w-20">HOOK UP</div>
                <div className="flex-1">
                  <SliderComponent
                    value={getAnswerValue(1, 2, 'me_answer') || 3}
                    onChange={() => {}}
                    isOpenToAll={getAnswerValue(1, 2, 'me_answer') === 6}
                  />
                </div>
              </div>

              {/* DATE Slider Row */}
              <div className="flex items-center gap-4">
                <div className="text-xs font-semibold text-gray-400 w-20">DATE</div>
                <div className="flex-1">
                  <SliderComponent
                    value={getAnswerValue(1, 3, 'me_answer') || 3}
                    onChange={() => {}}
                    isOpenToAll={getAnswerValue(1, 3, 'me_answer') === 6}
                  />
                </div>
              </div>

              {/* LIFE PARTNER Slider Row */}
              <div className="flex items-center gap-4">
                <div className="text-xs font-semibold text-gray-400 w-20">PARTNER</div>
                <div className="flex-1">
                  <SliderComponent
                    value={getAnswerValue(1, 4, 'me_answer') || 3}
                    onChange={() => {}}
                    isOpenToAll={getAnswerValue(1, 4, 'me_answer') === 6}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ideology Section */}
        {getRankedIdeologyQuestions().length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">Ideology</h3>

            <div className="max-w-md">
              {/* LESS, MORE labels above sliders - aligned with slider start */}
              <div className="flex justify-between text-xs text-gray-500 mb-2 ml-20 sm:ml-24">
                <span>LESS</span>
                <span>MORE</span>
              </div>

              <div className="space-y-3">
                {getRankedIdeologyQuestions().map((ideologyAnswer, index) => {
                  const questionName = ideologyAnswer.question.question_name || 'Unknown';
                  const answerValue = ideologyAnswer.me_answer;
                  const isOpenToAll = answerValue === 6;

                  return (
                    <div key={index} className="flex items-center gap-4">
                      <div className="text-xs font-semibold text-gray-400 w-20 uppercase">
                        {questionName}
                      </div>
                      <div className="flex-1">
                        <SliderComponent
                          value={answerValue}
                          onChange={() => {}}
                          isOpenToAll={isOpenToAll}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tags Section */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">Tags</h3>
          <div className="flex flex-wrap gap-3">
            {['Approve', 'Hot', 'Maybe', 'Like', 'Save', 'Hide'].map((tag) => {
              const isSelected = selectedTags.includes(tag.toLowerCase());
              return (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-white text-gray-900 border-black'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute inset-0 bg-black rounded-full" style={{ opacity: 0.05 }}></div>
                  )}
                  <span className="relative z-10">{tag}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Questions Modal Overlay */}
      {showQuestionsModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50" 
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
          onClick={() => setShowQuestionsModal(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-lg w-full max-w-4xl mx-4 h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              {selectedQuestionNumber ? (
                <>
                  <button
                    onClick={() => {
                      // If viewing a grouped sub-question in edit mode, go back to card list
                      if (isAnsweringPending && selectedGroupedQuestionId) {
                        setSelectedGroupedQuestionId(null);
                      } else {
                        handleBackToQuestionsList();
                      }
                    }}
                    className="flex items-center text-gray-600 hover:text-gray-900"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Back</span>
                  </button>
                  <h2 className="text-xl font-semibold flex-1 text-center">
                    {isAnsweringPending && selectedGroupedQuestionId
                      ? selectedQuestionData.find((q: any) => q.id === selectedGroupedQuestionId)?.question_name || `Question ${selectedQuestionNumber}`
                      : (selectedQuestionData[0]?.group_name_text ||
                         selectedQuestionData[0]?.text ||
                         `Question ${selectedQuestionNumber}`)}
                  </h2>
                  <div className="w-20"></div> {/* Spacer for centering */}
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold">Questions Answered</h2>
                  <div className="flex items-center gap-3">
                    {/* Filter Button — icon-only on iPad and smaller (match results page) */}
                    <button
                      onClick={() => setShowFilterModal(true)}
                      className="inline-flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto md:w-10 md:h-10 lg:w-auto lg:h-auto px-0 py-0 sm:px-3 sm:py-2 md:px-0 md:py-0 lg:px-3 lg:py-2 border border-gray-300 rounded-full text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-black sm:mr-1 md:mr-0 lg:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                      </svg>
                      <span className="hidden sm:inline md:hidden lg:inline">Filter</span>
                    </button>

                    {/* Sort Dropdown — icon-only on iPad and smaller */}
                    <div className="relative sort-dropdown-container">
                      <button
                        onClick={() => setShowSortDropdown(!showSortDropdown)}
                        className="inline-flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto md:w-10 md:h-10 lg:w-auto lg:h-auto px-0 py-0 sm:px-3 sm:py-2 md:px-0 md:py-0 lg:px-3 lg:py-2 border border-gray-300 rounded-full text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none cursor-pointer"
                      >
                        <svg className="w-4 h-4 inline text-black sm:mr-1 md:mr-0 lg:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                        <span className="hidden sm:inline md:hidden lg:inline">Sort</span>
                      </button>

                      {/* Sort Dropdown Menu */}
                      {showSortDropdown && (
                        <div
                          className="absolute top-full mt-2 right-0 w-64 bg-white rounded-2xl shadow-lg border border-gray-200 py-2 z-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setSortOption('number');
                              setShowSortDropdown(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <div className="font-semibold text-black">Number</div>
                            <div className="text-sm text-gray-500">Questions in numerical order</div>
                          </button>

                          <button
                            onClick={() => {
                              setSortOption('popular');
                              setShowSortDropdown(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <div className="font-semibold text-black">Popular</div>
                            <div className="text-sm text-gray-500">Questions with the most answers</div>
                          </button>

                          <button
                            onClick={() => {
                              setSortOption('new');
                              setShowSortDropdown(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <div className="font-semibold text-black">New</div>
                            <div className="text-sm text-gray-500">Recently answered</div>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Close Button */}
                    <button
                      onClick={() => setShowQuestionsModal(false)}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-24 py-6">
              {selectedQuestionNumber ? (
                isAnsweringPending ? (
                  // Render editable answer form for "My Pending" questions
                  <div className="flex flex-col items-center justify-center min-h-full">
                  {(() => {
                    const questionNumber = selectedQuestionNumber;
                    const isGrouped = selectedQuestionData.length > 0 && selectedQuestionData[0].question_type === 'grouped';
                    const isRelationship = questionNumber === 1;
                    const IMPORTANCE_LABELS_EDIT = [
                      { value: "1", answer_text: "TRIVIAL" },
                      { value: "2", answer_text: "MINOR" },
                      { value: "3", answer_text: "AVERAGE" },
                      { value: "4", answer_text: "SIGNIFICANT" },
                      { value: "5", answer_text: "ESSENTIAL" }
                    ];

                    // Icon mapping for grouped question cards
                    const editOptionIcons: Record<number, string> = {
                      3: '/assets/ethn.png', 4: '/assets/cpx.png', 5: '/assets/lf2.png',
                      7: '/assets/hands.png', 8: '/assets/prayin.png', 9: '/assets/politics.png',
                      10: '/assets/pacifier.png', 11: '/assets/prayin.png', 12: '/assets/ethn.png'
                    };

                    // Grouped questions: show card list or sub-question slider
                    if (isGrouped) {
                      // If a sub-question is selected, show its editable slider
                      if (selectedGroupedQuestionId) {
                        const selectedSubQ = selectedQuestionData.find((q: any) => q.id === selectedGroupedQuestionId);
                        if (selectedSubQ) {
                          const subKey = `q${selectedSubQ.group_number || selectedSubQ.id}`;

                          // Render using the same responsive grid as the questions page
                          return (
                            <div className="w-full overflow-x-hidden">
                              <div className="w-full max-w-[95vw] sm:max-w-[640px] md:max-w-[630px] lg:max-w-[692px] mx-auto">

                              {/* Share/Required toggles for non-mandatory grouped questions > 10 */}
                              {questionNumber > 10 && (
                                <div className="flex flex-wrap items-center justify-center sm:justify-between gap-3 sm:gap-4 w-full mb-6">
                                  <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => setEditMeRequired(!editMeRequired)} className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer" style={{ backgroundColor: editMeRequired ? '#000000' : '#ADADAD' }}>
                                      <span className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform" style={{ transform: editMeRequired ? 'translateX(20px)' : 'translateX(2px)' }} />
                                    </button>
                                    <span className="text-sm text-black">Required For Match</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => setEditMeShare(!editMeShare)} className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer" style={{ backgroundColor: editMeShare ? '#000000' : '#ADADAD' }}>
                                      <span className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform" style={{ transform: editMeShare ? 'translateX(20px)' : 'translateX(2px)' }} />
                                    </button>
                                    <span className="text-sm text-black">Share Answer</span>
                                  </div>
                                </div>
                              )}

                              {/* THEM section (first) */}
                              <div className="mb-6">
                                <h3 className="text-2xl font-bold text-center mb-1" style={{ color: '#672DB7' }}>Them</h3>

                                {/* LESS/MORE + OTA header row */}
                                <div className="grid items-center justify-center mb-2 grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
                                  <div></div>
                                  <div className="flex justify-between text-xs text-gray-500 min-w-0">
                                    <span>LESS</span>
                                    <span>MORE</span>
                                  </div>
                                  <div className="text-xs text-gray-500 text-center lg:ml-[-15px]">OTA</div>
                                </div>

                                {/* Slider grid */}
                                <div className="grid items-center justify-center grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
                                  <div className="text-xs font-semibold text-gray-400 min-w-0">{selectedSubQ.question_name.toUpperCase()}</div>
                                  <div className="relative min-w-0">
                                    <EditableSlider
                                      value={editSliderAnswers[`${subKey}_looking`] || 3}
                                      onChange={(val: number) => setEditSliderAnswers(prev => ({ ...prev, [`${subKey}_looking`]: val }))}
                                      isOpenToAll={editOpenToAllStates[`${subKey}_looking`] || false}
                                    />
                                  </div>
                                  <div>
                                    <label className="flex items-center cursor-pointer">
                                      <div className="relative">
                                        <input type="checkbox" className="sr-only" checked={editOpenToAllStates[`${subKey}_looking`] || false}
                                          onChange={() => setEditOpenToAllStates(prev => ({ ...prev, [`${subKey}_looking`]: !prev[`${subKey}_looking`] }))} />
                                        <div className={`block w-11 h-6 rounded-full ${editOpenToAllStates[`${subKey}_looking`] ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                                        <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${editOpenToAllStates[`${subKey}_looking`] ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                                      </div>
                                    </label>
                                  </div>

                                  {/* IMPORTANCE row */}
                                  <div className="text-xs font-semibold text-gray-400">IMPORTANCE</div>
                                  <div className="relative min-w-0">
                                    <EditableSlider
                                      value={editImportanceValues.lookingFor}
                                      onChange={(val: number) => setEditImportanceValues(prev => ({ ...prev, lookingFor: val }))}
                                      isImportance={true}
                                      labels={IMPORTANCE_LABELS_EDIT}
                                    />
                                  </div>
                                  <div className="w-11 h-6"></div>
                                </div>

                                {/* Importance label below */}
                                <div className="grid items-center justify-center mt-2 grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
                                  <div></div>
                                  <div className="relative text-xs text-gray-500 w-full min-w-0">
                                    {editImportanceValues.lookingFor === 1 && <span className="absolute" style={{ left: '14px', transform: 'translateX(-50%)' }}>TRIVIAL</span>}
                                    {editImportanceValues.lookingFor === 2 && <span className="absolute" style={{ left: '25%', transform: 'translateX(-50%)' }}>MINOR</span>}
                                    {editImportanceValues.lookingFor === 3 && <span className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>AVERAGE</span>}
                                    {editImportanceValues.lookingFor === 4 && <span className="absolute" style={{ left: '75%', transform: 'translateX(-50%)' }}>SIGNIFICANT</span>}
                                    {editImportanceValues.lookingFor === 5 && <span className="absolute" style={{ left: 'calc(100% - 14px)', transform: 'translateX(-50%)' }}>ESSENTIAL</span>}
                                  </div>
                                  <div></div>
                                </div>
                              </div>

                              {/* ME section */}
                              <div className="mb-6 pt-8">
                                <h3 className="text-2xl font-bold text-center mb-1">Me</h3>

                                {/* LESS/MORE header row */}
                                <div className="grid items-center justify-center mb-2 grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
                                  <div></div>
                                  <div className="flex justify-between text-xs text-gray-500 min-w-0">
                                    <span>LESS</span>
                                    <span>MORE</span>
                                  </div>
                                  <div className="text-xs text-gray-500 text-center lg:ml-[-15px]"></div>
                                </div>

                                {/* Slider grid */}
                                <div className="grid items-center justify-center grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
                                  <div className="text-xs font-semibold text-gray-400 min-w-0">{selectedSubQ.question_name.toUpperCase()}</div>
                                  <div className="relative min-w-0">
                                    <EditableSlider
                                      value={editSliderAnswers[`${subKey}_me`] || 3}
                                      onChange={(val: number) => setEditSliderAnswers(prev => ({ ...prev, [`${subKey}_me`]: val }))}
                                      isOpenToAll={editOpenToAllStates[`${subKey}_me`] || false}
                                    />
                                  </div>
                                  <div className="w-11 h-6"></div>
                                </div>
                              </div>

                              </div>
                            </div>
                          );
                        }
                      }

                      // Show card list for sub-question selection (with icons, matching read-only view)
                      return (
                        <div className="w-full max-w-lg mx-auto">
                          <div className="space-y-3">
                            {selectedQuestionData.map((question: any) => (
                              <div
                                key={question.id}
                                onClick={() => {
                                  // Stay in overlay — select this sub-question and init its slider values
                                  const subKey = `q${question.group_number || question.id}`;
                                  setEditSliderAnswers(prev => ({
                                    ...prev,
                                    [`${subKey}_me`]: prev[`${subKey}_me`] || 3,
                                    [`${subKey}_looking`]: prev[`${subKey}_looking`] || 3,
                                  }));
                                  setEditOpenToAllStates(prev => ({
                                    ...prev,
                                    [`${subKey}_me`]: prev[`${subKey}_me`] || false,
                                    [`${subKey}_looking`]: prev[`${subKey}_looking`] || false,
                                  }));
                                  setSelectedGroupedQuestionId(question.id);
                                }}
                                className="flex items-center justify-between p-4 border border-black rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center space-x-3">
                                  <Image
                                    src={editOptionIcons[questionNumber] || '/assets/ethn.png'}
                                    alt="Question icon"
                                    width={24}
                                    height={24}
                                    className="w-6 h-6"
                                  />
                                  <span className="text-black font-medium">{question.question_name}</span>
                                </div>
                                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    // Slider-based questions
                    const lessLabel = selectedQuestionData[0]?.answers?.find((a: any) => String(a.value) === '1')?.answer_text?.toUpperCase() || 'LESS';
                    const moreLabel = selectedQuestionData[0]?.answers?.find((a: any) => String(a.value) === '5')?.answer_text?.toUpperCase() || 'MORE';

                    return (
                      <div className="w-full overflow-x-hidden">
                        <div className="w-full max-w-[95vw] sm:max-w-[640px] md:max-w-[630px] lg:max-w-[692px] mx-auto">
                        {/* Share/Required toggles for non-mandatory questions > 10 */}
                        {questionNumber > 10 && selectedQuestionData[0]?.question_type !== 'grouped' && (
                          <div className="flex flex-wrap items-center justify-center sm:justify-between gap-3 sm:gap-4 w-full mb-6">
                            <div className="flex items-center gap-3">
                              <button type="button" onClick={() => setEditMeRequired(!editMeRequired)} className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer" style={{ backgroundColor: editMeRequired ? '#000000' : '#ADADAD' }}>
                                <span className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform" style={{ transform: editMeRequired ? 'translateX(20px)' : 'translateX(2px)' }} />
                              </button>
                              <span className="text-sm text-black">Required For Match</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <button type="button" onClick={() => setEditMeShare(!editMeShare)} className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer" style={{ backgroundColor: editMeShare ? '#000000' : '#ADADAD' }}>
                                <span className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform" style={{ transform: editMeShare ? 'translateX(20px)' : 'translateX(2px)' }} />
                              </button>
                              <span className="text-sm text-black">Share Answer</span>
                            </div>
                          </div>
                        )}

                        {/* Them Section (shown for all except Q1 Relationship) */}
                        {!isRelationship && (
                          <div className="mb-6">
                            <h3 className="text-2xl font-bold text-center mb-1" style={{ color: '#672DB7' }}>Them</h3>

                            <div className="grid items-center justify-center mb-2 grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
                              <div></div>
                              <div className="flex justify-between text-xs text-gray-500 min-w-0"><span>{lessLabel}</span><span>{moreLabel}</span></div>
                              <div className="text-xs text-gray-500 text-center lg:ml-[-15px]">{selectedQuestionData.some((q: any) => q.open_to_all_looking_for) ? 'OTA' : ''}</div>
                            </div>

                            <div className="grid items-center justify-center grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
                              {selectedQuestionData.map((question: any) => {
                                const key = `q${question.group_number || question.id}`;
                                const lookingKey = `${key}_looking`;
                                return (
                                  <React.Fragment key={`looking-${question.id}`}>
                                    <div className="text-xs font-semibold text-gray-400 min-w-0">{question.question_name?.toUpperCase()}</div>
                                    <div className="relative min-w-0">
                                      <EditableSlider value={editSliderAnswers[lookingKey] || 3} onChange={(value: number) => setEditSliderAnswers(prev => ({ ...prev, [lookingKey]: value }))} isOpenToAll={editOpenToAllStates[lookingKey] || false} labels={question.answers || []} />
                                    </div>
                                    <div>
                                      {question.open_to_all_looking_for ? (
                                        <label className="flex items-center cursor-pointer"><div className="relative"><input type="checkbox" checked={editOpenToAllStates[lookingKey] || false} onChange={() => setEditOpenToAllStates(prev => ({ ...prev, [lookingKey]: !prev[lookingKey] }))} className="sr-only" /><div className={`block w-11 h-6 rounded-full ${editOpenToAllStates[lookingKey] ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div><div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition bg-white ${editOpenToAllStates[lookingKey] ? 'transform translate-x-5' : ''}`}></div></div></label>
                                      ) : (<div className="w-11 h-6"></div>)}
                                    </div>
                                  </React.Fragment>
                                );
                              })}
                              {/* Importance slider row */}
                              <div className="text-xs font-semibold text-gray-400">IMPORTANCE</div>
                              <div className="relative min-w-0">
                                <EditableSlider value={editImportanceValues.lookingFor} onChange={(value: number) => setEditImportanceValues(prev => ({ ...prev, lookingFor: value }))} isImportance={true} labels={IMPORTANCE_LABELS_EDIT} />
                              </div>
                              <div className="w-11 h-6"></div>
                            </div>

                            {/* Importance label */}
                            <div className="grid items-center justify-center mt-2 grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
                              <div></div>
                              <div className="relative text-xs text-gray-500 w-full min-w-0">
                                {IMPORTANCE_LABELS_EDIT.map((label) => { const v = parseInt(label.value); if (editImportanceValues.lookingFor !== v) return null; const pos = v === 1 ? '14px' : v === 2 ? '25%' : v === 3 ? '50%' : v === 4 ? '75%' : 'calc(100% - 14px)'; return <span key={v} className="absolute" style={{ left: pos, transform: 'translateX(-50%)' }}>{label.answer_text}</span>; })}
                              </div>
                              <div></div>
                            </div>
                          </div>
                        )}

                        {/* Me Section (no importance slider, except Q1) */}
                        <div className={`mb-6 ${!isRelationship ? 'pt-8' : ''}`}>
                          <h3 className="text-2xl font-bold text-center mb-1">Me</h3>

                          <div className="grid items-center justify-center mb-2 grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
                            <div></div>
                            <div className="flex justify-between text-xs text-gray-500 min-w-0"><span>{lessLabel}</span><span>{moreLabel}</span></div>
                            <div className="text-xs text-gray-500 text-center lg:ml-[-15px]">{selectedQuestionData.some((q: any) => q.open_to_all_me) ? 'OTA' : ''}</div>
                          </div>

                          <div className="grid items-center justify-center grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
                            {selectedQuestionData.map((question: any) => {
                              const key = `q${question.group_number || question.id}`;
                              const meKey = `${key}_me`;
                              return (
                                <React.Fragment key={question.id}>
                                  <div className="text-xs font-semibold text-gray-400 min-w-0">{question.question_name?.toUpperCase()}</div>
                                  <div className="relative min-w-0">
                                    <EditableSlider value={editSliderAnswers[meKey] || 3} onChange={(value: number) => setEditSliderAnswers(prev => ({ ...prev, [meKey]: value }))} isOpenToAll={editOpenToAllStates[meKey] || false} labels={question.answers || []} />
                                  </div>
                                  <div>
                                    {question.open_to_all_me ? (
                                      <label className="flex items-center cursor-pointer"><div className="relative"><input type="checkbox" checked={editOpenToAllStates[meKey] || false} onChange={() => setEditOpenToAllStates(prev => ({ ...prev, [meKey]: !prev[meKey] }))} className="sr-only" /><div className={`block w-11 h-6 rounded-full ${editOpenToAllStates[meKey] ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div><div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition bg-white ${editOpenToAllStates[meKey] ? 'transform translate-x-5' : ''}`}></div></div></label>
                                    ) : (<div className="w-11 h-6"></div>)}
                                  </div>
                                </React.Fragment>
                              );
                            })}
                            {/* For Q1: importance slider in Me section */}
                            {isRelationship && (
                              <>
                                <div className="text-xs font-semibold text-gray-400">IMPORTANCE</div>
                                <div className="relative min-w-0"><EditableSlider value={editImportanceValues.me} onChange={(value: number) => setEditImportanceValues(prev => ({ ...prev, me: value }))} isImportance={true} labels={IMPORTANCE_LABELS_EDIT} /></div>
                                <div className="w-11 h-6"></div>
                              </>
                            )}
                          </div>

                          {/* Importance label for Q1 */}
                          {isRelationship && (
                            <div className="grid items-center justify-center mt-2 grid-cols-[80px_1fr_44px] gap-x-3 gap-y-3 lg:grid-cols-[108px_500px_44px] lg:gap-x-5 lg:gap-y-3">
                              <div></div>
                              <div className="relative text-xs text-gray-500 w-full min-w-0">
                                {IMPORTANCE_LABELS_EDIT.map((label) => { const v = parseInt(label.value); if (editImportanceValues.me !== v) return null; const pos = v === 1 ? '14px' : v === 2 ? '25%' : v === 3 ? '50%' : v === 4 ? '75%' : 'calc(100% - 14px)'; return <span key={v} className="absolute" style={{ left: pos, transform: 'translateX(-50%)' }}>{label.answer_text}</span>; })}
                              </div>
                              <div></div>
                            </div>
                          )}
                        </div>
                        </div>
                      </div>
                    );
                  })()}
                  </div>
                ) : (
                // Show question details inline (read-only)
                <div className="flex flex-col items-center justify-center min-h-full">
                {(() => {
                  const questionType = selectedQuestionData[0]?.question_type || 'basic';
                  const questionNumber = selectedQuestionNumber;

                  // Find user answers for this question
                  const answersForQuestion = userAnswers.filter(answer => {
                    const questionId = typeof answer.question === 'object' ? answer.question.id : answer.question;
                    return selectedQuestionData.some(q => q.id === questionId);
                  });

                  // Read-only slider component
                  const ReadOnlySlider = ({ value, isOpenToAll = false, isImportance = false, labels = [] }: {
                    value: number;
                    isOpenToAll?: boolean;
                    isImportance?: boolean;
                    labels?: Array<{ value: string; answer_text: string }>;
                  }) => {
                    const sortedLabels = labels.sort((a, b) => parseInt(a.value) - parseInt(b.value));
                    const minValue = sortedLabels.length > 0 ? parseInt(sortedLabels[0].value) : 1;
                    const maxValue = sortedLabels.length > 0 ? parseInt(sortedLabels[sortedLabels.length - 1].value) : 5;
                    const percentage = ((value - minValue) / (maxValue - minValue)) * 100;
                    
                    return (
                      <div className="w-full h-5 relative flex items-center select-none">
                        <span className={`absolute left-2 text-xs pointer-events-none z-10 ${isOpenToAll ? 'text-white font-medium' : 'text-gray-500'}`}>{minValue}</span>
                        <div
                          className="w-full h-5 rounded-[20px] relative border"
                          style={{
                            backgroundColor: isOpenToAll ? '#672DB7' : '#F5F5F5',
                            borderColor: isOpenToAll ? '#672DB7' : '#ADADAD'
                          }}
                        >
                          {isOpenToAll && (
                            // When Open to All is enabled, show full purple fill (100% width)
                            <div
                              className="absolute top-0 left-0 h-full bg-[#672DB7] rounded-[20px]"
                              style={{ width: '100%' }}
                            />
                          )}
                        </div>
                        {!isOpenToAll && (
                          <div 
                            className="absolute top-1/2 transform -translate-y-1/2 w-7 h-7 border border-gray-300 rounded-full flex items-center justify-center text-sm font-semibold z-30"
                            style={{
                              backgroundColor: isImportance ? 'white' : '#672DB7',
                              boxShadow: isImportance ? '0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.12)',
                              left: value === minValue ? '0px' : value === maxValue ? 'calc(100% - 28px)' : `calc(${percentage}% - 14px)`
                            }}
                          >
                            <span style={{ color: isImportance ? '#672DB7' : 'white' }}>{value}</span>
                          </div>
                        )}
                        <span className={`absolute right-2 text-xs pointer-events-none z-10 ${isOpenToAll ? 'text-white font-medium' : 'text-gray-500'}`}>{maxValue}</span>
                      </div>
                    );
                  };

                  // Helper function to render top labels for kids question
                  const renderKidsTopLabels = (groupNumber: number) => {
                    const wantKidsLabels = ['DON\'T WANT', 'DOUBTFUL', 'UNSURE', 'EVENTUALLY', 'WANT'];
                    const haveKidsLabels = ['DON\'T HAVE', '', '', '', 'HAVE'];
                    
                    const labels = groupNumber === 2 ? wantKidsLabels : haveKidsLabels; // group_number 1 = Have, 2 = Want
                    
                    return (
                      <div className="relative text-xs text-gray-500 w-full mb-2" style={{ height: '14px' }}>
                        {labels.map((label, index) => {
                          const value = index + 1;
                          let leftPosition;
                          
                          // Position labels to center on slider thumb positions
                          if (value === 1) {
                            leftPosition = '14px'; // Left edge of thumb (14px from left)
                          } else if (value === 2) {
                            leftPosition = '25%';
                          } else if (value === 3) {
                            leftPosition = '50%';
                          } else if (value === 4) {
                            leftPosition = '75%';
                          } else if (value === 5) {
                            leftPosition = 'calc(100% - 14px)'; // Right edge of thumb (14px from right)
                          }
                          
                          return (
                            <span 
                              key={value}
                              className="absolute text-xs text-gray-500" 
                              style={{ left: leftPosition, transform: 'translateX(-50%)' }}
                            >
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    );
                  };

                  // Helper function to render top labels for education question
                  const renderEducationTopLabels = () => {
                    return (
                      <div className="relative text-xs text-gray-500 w-full mb-2" style={{ height: '14px' }}>
                        <span className="absolute text-left" style={{ left: '0' }}>NONE</span>
                        <span className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>SOME</span>
                        <span className="absolute text-right" style={{ right: '0' }}>COMPLETED</span>
                      </div>
                    );
                  };

                  // Helper function to render top labels for diet question
                  const renderDietTopLabels = () => {
                    return (
                      <div className="flex justify-between text-xs text-gray-500 mb-2">
                        <span>NO</span>
                        <span>YES</span>
                      </div>
                    );
                  };

                  // Helper function to render top labels for frequency questions (Exercise, Habits, Religion)
                  const renderFrequencyTopLabels = () => {
                    return (
                      <div className="relative text-xs text-gray-500 w-full mb-2" style={{ height: '14px' }}>
                        <span className="absolute" style={{ left: '14px', transform: 'translateX(-50%)' }}>NEVER</span>
                        <span className="absolute" style={{ left: '25%', transform: 'translateX(-50%)' }}>RARELY</span>
                        <span className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>SOMETIMES</span>
                        <span className="absolute" style={{ left: '75%', transform: 'translateX(-50%)' }}>REGULARLY</span>
                        <span className="absolute" style={{ left: 'calc(100% - 14px)', transform: 'translateX(-50%)' }}>DAILY</span>
                      </div>
                    );
                  };

                  // Special handling for Relationship question (question_number === 1) - ONLY Me section
                  if (questionNumber === 1) {
                    const IMPORTANCE_LABELS = [
                      { value: "1", answer_text: "TRIVIAL" },
                      { value: "2", answer_text: "MINOR" },
                      { value: "3", answer_text: "AVERAGE" },
                      { value: "4", answer_text: "SIGNIFICANT" },
                      { value: "5", answer_text: "ESSENTIAL" }
                    ];
                    
                    return (
                      <div className="mb-6">
                        <h3 className="text-2xl font-bold text-center mb-1">Me</h3>

                        <div className="grid items-center justify-center mx-auto max-w-fit mb-2" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
                          <div></div>
                          <div className="flex justify-between text-xs text-gray-500">
                            {(() => {
                              // For non-mandatory questions, show actual answer labels for value 1 and 5
                              if (questionNumber > 10 && selectedQuestionData[0]?.answers?.length > 0) {
                                const answers = selectedQuestionData[0].answers;
                                const answer1 = answers.find((a: any) => a.value === '1' || a.value === 1);
                                const answer5 = answers.find((a: any) => a.value === '5' || a.value === 5);
                                return (
                                  <>
                                    <span>{answer1?.answer_text?.toUpperCase() || 'LESS'}</span>
                                    <span>{answer5?.answer_text?.toUpperCase() || 'MORE'}</span>
                                  </>
                                );
                              }
                              return (
                                <>
                                  <span>LESS</span>
                                  <span>MORE</span>
                                </>
                              );
                            })()}
                          </div>
                          <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
                            {selectedQuestionData.some(q => q.open_to_all_me) ? 'OTA' : ''}
                          </div>
                        </div>

                        <div className="grid items-center justify-center mx-auto max-w-fit" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
                          {selectedQuestionData.map((question: any) => {
                            const answer = answersForQuestion.find(a => {
                              const questionId = typeof a.question === 'object' ? a.question.id : a.question;
                              return questionId === question.id;
                            });
                            
                            // If me_answer is 6, it means "Open to All" is enabled
                            // Check both number 6 and string "6", and also check the me_open_to_all flag
                            const rawMeAnswer = answer?.me_answer;
                            const isOpenToAll = rawMeAnswer === 6 || 
                                               rawMeAnswer === '6' || 
                                               Number(rawMeAnswer) === 6 ||
                                               answer?.me_open_to_all === true;
                            // When Open to All is enabled, use value 3 for display (but slider will be full purple)
                            // When disabled, use the actual answer value (1-5)
                            const meValue = isOpenToAll ? 3 : (rawMeAnswer && rawMeAnswer !== 6 ? rawMeAnswer : 3);
                            const meOpenToAll = isOpenToAll;

                            return (
                              <React.Fragment key={question.id}>
                                <div className="text-xs font-semibold text-gray-400">{question.question_name.toUpperCase()}</div>
                                <div className="relative">
                                  <ReadOnlySlider value={meValue} isOpenToAll={meOpenToAll} labels={question.answers} />
                                </div>
                                <div>
                                  {question.open_to_all_me ? (
                                    <div className={`block w-11 h-6 rounded-full ${meOpenToAll ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}>
                                      <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${meOpenToAll ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                                    </div>
                                  ) : (
                                    <div className="w-11 h-6"></div>
                                  )}
                                </div>
                              </React.Fragment>
                            );
                          })}

                          {/* SHARE ANSWER Row - only for non-mandatory questions */}
                          {questionNumber > 10 && (
                            <>
                              <div className="text-xs font-semibold text-gray-400">SHARE ANSWER</div>
                              <div className="flex items-center">
                                <span className="text-sm text-gray-600">
                                  {answersForQuestion[0]?.me_share !== false ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <div className="flex items-center justify-center">
                                <div className={`block w-11 h-6 rounded-full ${answersForQuestion[0]?.me_share !== false ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}>
                                  <div className={`dot absolute top-0.5 w-5 h-5 rounded-full transition ${answersForQuestion[0]?.me_share !== false ? 'transform translate-x-5 bg-white' : 'left-0.5 bg-white'}`}></div>
                                </div>
                              </div>
                            </>
                          )}

                          {/* IMPORTANCE Slider Row */}
                          <div className="text-xs font-semibold text-gray-400">IMPORTANCE</div>
                          <div className="relative">
                            <ReadOnlySlider
                              value={answersForQuestion[0]?.me_importance || 3}
                              isOpenToAll={false}
                              isImportance={true}
                              labels={IMPORTANCE_LABELS}
                            />
                          </div>
                          <div className="w-11 h-6"></div>
                        </div>

                        {/* Importance labels */}
                        <div className="grid items-center justify-center mx-auto max-w-fit mt-2" style={{ gridTemplateColumns: '112px 500px 60px', columnGap: '20px', gap: '20px 12px' }}>
                          <div></div>
                          <div className="relative text-xs text-gray-500" style={{ width: '500px' }}>
                            {(() => {
                              const importance = answersForQuestion[0]?.me_importance || 3;
                              const positions: Record<number, { left: string; label: string }> = {
                                1: { left: '14px', label: 'TRIVIAL' },
                                2: { left: '25%', label: 'MINOR' },
                                3: { left: '50%', label: 'AVERAGE' },
                                4: { left: '75%', label: 'SIGNIFICANT' },
                                5: { left: 'calc(100% - 14px)', label: 'ESSENTIAL' }
                              };
                              const pos = positions[importance];
                              return pos ? <span className="absolute" style={{ left: pos.left, transform: 'translateX(-50%)' }}>{pos.label}</span> : null;
                            })()}
                          </div>
                          <div></div>
                        </div>
                      </div>
                    );
                  }

                  // Render based on question type
                  if (questionType === 'grouped') {
                    const optionIcons: Record<number, string> = {
                      3: '/assets/ethn.png', 4: '/assets/cpx.png', 5: '/assets/lf2.png',
                      7: '/assets/hands.png', 8: '/assets/prayin.png', 9: '/assets/politics.png',
                      10: '/assets/pacifier.png', 11: '/assets/prayin.png', 12: '/assets/ethn.png'
                    };

                    // If a specific grouped question is selected, show its slider
                    if (selectedGroupedQuestionId) {
                      const selectedQuestion = selectedQuestionData.find(q => q.id === selectedGroupedQuestionId);
                      if (selectedQuestion) {
                        const answer = answersForQuestion.find(a => {
                          const questionId = typeof a.question === 'object' ? a.question.id : a.question;
                          return questionId === selectedQuestion.id;
                        });
                        
                        // Check if me_answer is 6 (Open to All) - handle both number and string
                        const rawMeAnswer = answer?.me_answer;
                        const rawLookingAnswer = answer?.looking_for_answer;
                        
                        // Only consider Open to All if answer exists and value is explicitly 6
                        const isOpenToAllMe = answer && (
                          rawMeAnswer === 6 || 
                          rawMeAnswer === '6' || 
                          Number(rawMeAnswer) === 6 ||
                          answer.me_open_to_all === true
                        ) || false;
                        
                        const isOpenToAllLooking = answer && (
                          rawLookingAnswer === 6 || 
                          rawLookingAnswer === '6' || 
                          Number(rawLookingAnswer) === 6 ||
                          answer.looking_for_open_to_all === true
                        ) || false;
                        
                        // When Open to All is enabled, use value 3 for display (but slider will be full purple)
                        // When disabled, use the actual answer value (1-5), or default to 3 if no answer
                        const meValue = isOpenToAllMe ? 3 : (answer && rawMeAnswer !== 6 && rawMeAnswer !== '6' && rawMeAnswer !== undefined ? rawMeAnswer : 3);
                        const lookingValue = isOpenToAllLooking ? 3 : (answer && rawLookingAnswer !== 6 && rawLookingAnswer !== '6' && rawLookingAnswer !== undefined ? rawLookingAnswer : 3);

                        const isEducationQuestion = questionNumber === 4;
                        const isDietQuestion = questionNumber === 5;
                        const isExerciseQuestion = questionNumber === 6;
                        const isHabitsQuestion = questionNumber === 7;
                        const isReligionQuestion = questionNumber === 8;
                        
                        // Check if answer is shared
                        const isShared = answer?.me_share !== false; // Default to true if not set
                        const isDisabled = !isShared;

                        return (
                          <div className={isDisabled ? 'opacity-50' : ''}>
                            {/* Me Section */}
                            <div className={`mb-6 ${isDisabled ? 'pointer-events-none' : ''}`}>
                              <h3 className="text-2xl font-bold text-center mb-1">{selectedQuestion.question_name}</h3>

                              {/* Switches for non-mandatory questions - above Me title */}
                              {questionNumber > 10 && (
                                <div className="mx-auto mt-4 mb-4 flex items-center justify-between" style={{ width: '500px' }}>
                                  {/* Required For Match - Left */}
                                  <div className="flex items-center gap-3">
                                    <div className="relative">
                                      <div className={`block w-11 h-6 rounded-full ${answer?.me_importance === 5 ? 'bg-black' : 'bg-[#ADADAD]'}`}>
                                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition ${answer?.me_importance === 5 ? 'left-5.5' : 'left-0.5'}`}></div>
                                      </div>
                                    </div>
                                    <span className="text-sm text-black">Required For Match</span>
                                  </div>

                                  {/* Share Answer - Right */}
                                  <div className="flex items-center gap-3">
                                    <div className="relative">
                                      <div className={`block w-11 h-6 rounded-full ${answer?.me_share !== false ? 'bg-black' : 'bg-[#ADADAD]'}`}>
                                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition ${answer?.me_share !== false ? 'left-5.5' : 'left-0.5'}`}></div>
                                      </div>
                                    </div>
                                    <span className="text-sm text-black">Share Answer</span>
                                  </div>
                                </div>
                              )}

                              <h4 className="text-xl font-bold text-center mb-4">Me</h4>

                              {/* Labels above slider */}
                              <div className="mx-auto mb-2" style={{ width: '500px' }}>
                                <div className="flex justify-between text-xs text-gray-500">
                                  {isEducationQuestion && (
                                    <div className="relative text-xs text-gray-500 w-full" style={{ height: '14px' }}>
                                      <span className="absolute text-left" style={{ left: '0' }}>NONE</span>
                                      <span className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>SOME</span>
                                      <span className="absolute text-right" style={{ right: '0' }}>COMPLETED</span>
                                    </div>
                                  )}
                                  {isDietQuestion && (
                                    <div className="flex justify-between text-xs text-gray-500 w-full">
                                      <span>NO</span>
                                      <span>YES</span>
                                    </div>
                                  )}
                                  {(isExerciseQuestion || isHabitsQuestion || isReligionQuestion) && (
                                    <div className="relative text-xs text-gray-500 w-full" style={{ height: '14px' }}>
                                      <span className="absolute" style={{ left: '14px', transform: 'translateX(-50%)' }}>NEVER</span>
                                      <span className="absolute" style={{ left: '25%', transform: 'translateX(-50%)' }}>RARELY</span>
                                      <span className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>SOMETIMES</span>
                                      <span className="absolute" style={{ left: '75%', transform: 'translateX(-50%)' }}>REGULARLY</span>
                                      <span className="absolute" style={{ left: 'calc(100% - 14px)', transform: 'translateX(-50%)' }}>DAILY</span>
                                    </div>
                                  )}
                                  {questionNumber === 3 && (
                                    <>
                                      <span>LESS</span>
                                      <span>MORE</span>
                                    </>
                                  )}
                                  {/* For non-mandatory questions (> 10), show value 1 and value 5 labels */}
                                  {questionNumber > 10 && selectedQuestion.answers && selectedQuestion.answers.length > 0 && (
                                    <>
                                      <span>{selectedQuestion.answers.find((a: any) => a.value === '1' || a.value === 1)?.answer_text?.toUpperCase() || 'LESS'}</span>
                                      <span>{selectedQuestion.answers.find((a: any) => a.value === '5' || a.value === 5)?.answer_text?.toUpperCase() || 'MORE'}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="mx-auto" style={{ width: '500px' }}>
                                <ReadOnlySlider value={meValue} isOpenToAll={isOpenToAllMe} labels={selectedQuestion.answers} />
                              </div>

                            </div>

                            {/* Them Section */}
                            <div className="mb-6">
                              <h4 className="text-xl font-bold text-center mb-4" style={{ color: '#672DB7' }}>Them</h4>

                              {/* Labels above slider */}
                              <div className="mx-auto mb-2" style={{ width: '500px' }}>
                                <div className="flex justify-between text-xs text-gray-500">
                                  {isEducationQuestion && (
                                    <div className="relative text-xs text-gray-500 w-full" style={{ height: '14px' }}>
                                      <span className="absolute text-left" style={{ left: '0' }}>NONE</span>
                                      <span className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>SOME</span>
                                      <span className="absolute text-right" style={{ right: '0' }}>COMPLETED</span>
                                    </div>
                                  )}
                                  {isDietQuestion && (
                                    <div className="flex justify-between text-xs text-gray-500 w-full">
                                      <span>NO</span>
                                      <span>YES</span>
                                    </div>
                                  )}
                                  {(isExerciseQuestion || isHabitsQuestion || isReligionQuestion) && (
                                    <div className="relative text-xs text-gray-500 w-full" style={{ height: '14px' }}>
                                      <span className="absolute" style={{ left: '14px', transform: 'translateX(-50%)' }}>NEVER</span>
                                      <span className="absolute" style={{ left: '25%', transform: 'translateX(-50%)' }}>RARELY</span>
                                      <span className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>SOMETIMES</span>
                                      <span className="absolute" style={{ left: '75%', transform: 'translateX(-50%)' }}>REGULARLY</span>
                                      <span className="absolute" style={{ left: 'calc(100% - 14px)', transform: 'translateX(-50%)' }}>DAILY</span>
                                    </div>
                                  )}
                                  {questionNumber === 3 && (
                                    <>
                                      <span>LESS</span>
                                      <span>MORE</span>
                                    </>
                                  )}
                                  {/* For non-mandatory questions (> 10), show value 1 and value 5 labels */}
                                  {questionNumber > 10 && selectedQuestion.answers && selectedQuestion.answers.length > 0 && (
                                    <>
                                      <span>{selectedQuestion.answers.find((a: any) => a.value === '1' || a.value === 1)?.answer_text?.toUpperCase() || 'LESS'}</span>
                                      <span>{selectedQuestion.answers.find((a: any) => a.value === '5' || a.value === 5)?.answer_text?.toUpperCase() || 'MORE'}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="mx-auto" style={{ width: '500px' }}>
                                <ReadOnlySlider value={lookingValue} isOpenToAll={isOpenToAllLooking} labels={selectedQuestion.answers} />
                              </div>
                            </div>

                          </div>
                        );
                      }
                    }

                    // Show all grouped question cards
                    return (
                      <div className="w-full max-w-lg mx-auto">
                        <div className="space-y-3">
                          {selectedQuestionData.map((question: any) => {
                            const answer = answersForQuestion.find(a => {
                              const questionId = typeof a.question === 'object' ? a.question.id : a.question;
                              return questionId === question.id;
                            });
                            const hasAnswer = !!answer;
                            const isShared = answer?.me_share !== false; // Default to true if not set
                            const isDisabled = !hasAnswer || !isShared;

                            return (
                              <div
                                key={question.id}
                                onClick={() => {
                                  if (isDisabled) return;
                                  setSelectedGroupedQuestionId(question.id);
                                }}
                                className={`flex items-center justify-between p-4 border rounded-lg transition-all duration-200 ${
                                  !isDisabled
                                    ? 'border-black bg-gray-50 cursor-pointer hover:bg-gray-100'
                                    : 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-50'
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <Image
                                    src={optionIcons[questionNumber] || '/assets/ethn.png'}
                                    alt="Question icon"
                                    width={24}
                                    height={24}
                                    className={`w-6 h-6 ${isDisabled && 'opacity-50'}`}
                                  />
                                  <span className={`font-medium ${!isDisabled ? 'text-black' : 'text-gray-400'}`}>
                                    {question.question_name}
                                  </span>
                                  {hasAnswer && (
                                    <span className={`text-sm ${isShared ? 'text-[#672DB7]' : 'text-gray-400'}`}>✓ Answered</span>
                                  )}
                                </div>
                                {!isDisabled && (
                                  <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  } else {
                    // For slider questions, show Me and Them sections
                    // Gender (question 2) and Kids (question 10) should NEVER show OTA switches
                    const isRelationshipQuestion = questionNumber === 1;
                    const isGenderQuestion = questionNumber === 2;
                    const isKidsQuestion = questionNumber === 10;
                    const isEducationQuestion = questionNumber === 4;
                    const isDietQuestion = questionNumber === 5;
                    const isExerciseQuestion = questionNumber === 6;
                    const isHabitsQuestion = questionNumber === 7;
                    const isReligionQuestion = questionNumber === 8;
                    const isPoliticsQuestion = questionNumber === 9;
                    
                    // Check if all answers are shared (for non-grouped questions, check each answer)
                    // Default to true if me_share is not set (undefined/null)
                    const isShared = answersForQuestion.length > 0 && 
                                     answersForQuestion.every(answer => answer?.me_share !== false);
                    const isDisabled = !isShared;

                    // Helper to render labels row for a section
                    const renderSectionLabels = (sectionType: 'me' | 'them', hasAnyOTA: boolean) => (
                      <div className="grid items-center justify-center mx-auto max-w-fit mb-2" style={{ gridTemplateColumns: hasAnyOTA ? '500px 60px' : '500px', columnGap: '20px', gap: '20px 12px' }}>
                        <div className="flex justify-between text-xs text-gray-500">
                          {isRelationshipQuestion && (
                            <div className="relative text-xs text-gray-500 w-full" style={{ height: '14px' }}>
                              <span className="absolute" style={{ left: '10%', transform: 'translateX(-50%)' }}>FRIEND</span>
                              <span className="absolute" style={{ left: '37%', transform: 'translateX(-50%)' }}>HOOKUP</span>
                              <span className="absolute" style={{ left: '63%', transform: 'translateX(-50%)' }}>DATE</span>
                              <span className="absolute" style={{ left: '90%', transform: 'translateX(-50%)' }}>PARTNER</span>
                            </div>
                          )}
                          {isEducationQuestion && (
                            <div className="relative text-xs text-gray-500 w-full" style={{ height: '14px' }}>
                              <span className="absolute text-left" style={{ left: '0' }}>NONE</span>
                              <span className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>SOME</span>
                              <span className="absolute text-right" style={{ right: '0' }}>COMPLETED</span>
                            </div>
                          )}
                          {isDietQuestion && (
                            <div className="flex justify-between text-xs text-gray-500 w-full">
                              <span>NO</span>
                              <span>YES</span>
                            </div>
                          )}
                          {(isExerciseQuestion || isHabitsQuestion || isReligionQuestion || isPoliticsQuestion) && (
                            <div className="relative text-xs text-gray-500 w-full" style={{ height: '14px' }}>
                              <span className="absolute" style={{ left: '14px', transform: 'translateX(-50%)' }}>NEVER</span>
                              <span className="absolute" style={{ left: '25%', transform: 'translateX(-50%)' }}>RARELY</span>
                              <span className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>SOMETIMES</span>
                              <span className="absolute" style={{ left: '75%', transform: 'translateX(-50%)' }}>REGULARLY</span>
                              <span className="absolute" style={{ left: 'calc(100% - 14px)', transform: 'translateX(-50%)' }}>DAILY</span>
                            </div>
                          )}
                          {!isRelationshipQuestion && !isEducationQuestion && !isDietQuestion && !isExerciseQuestion && !isHabitsQuestion && !isReligionQuestion && !isPoliticsQuestion && !isKidsQuestion && (
                            <>
                              <span>LESS</span>
                              <span>MORE</span>
                            </>
                          )}
                        </div>
                        {hasAnyOTA && !isGenderQuestion && !isKidsQuestion && !isHabitsQuestion && !isExerciseQuestion && (
                          <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
                            OTA
                          </div>
                        )}
                      </div>
                    );

                    // Helper: compute hasAnyOTA for Me
                    const meHasAnyOTA = selectedQuestionData.some((question: any) => {
                      const answer = answersForQuestion.find((a: any) => {
                        const questionId = typeof a.question === 'object' ? a.question.id : a.question;
                        return questionId === question.id;
                      });
                      return answer && (answer.me_answer === 6 || answer.me_answer === '6' || Number(answer.me_answer) === 6 || answer.me_open_to_all === true);
                    });

                    // Helper: compute hasAnyOTA for Them
                    const themHasAnyOTA = selectedQuestionData.some((question: any) => {
                      const answer = answersForQuestion.find((a: any) => {
                        const questionId = typeof a.question === 'object' ? a.question.id : a.question;
                        return questionId === question.id;
                      });
                      return answer && (answer.looking_for_answer === 6 || answer.looking_for_answer === '6' || Number(answer.looking_for_answer) === 6 || answer.looking_for_open_to_all === true);
                    });

                    // Me sliders section
                    const renderMeSliders = () => (
                      <div className={`mb-6 ${isDisabled ? 'pointer-events-none' : ''}`}>
                        <h3 className="text-2xl font-bold text-center mb-1">Me</h3>
                        {renderSectionLabels('me', meHasAnyOTA)}
                        <div className="grid items-center justify-center mx-auto max-w-fit" style={{ gridTemplateColumns: meHasAnyOTA ? '500px 60px' : '500px', columnGap: '20px', gap: '20px 12px' }}>
                          {selectedQuestionData.map((question: any) => {
                            const answer = answersForQuestion.find((a: any) => {
                              const questionId = typeof a.question === 'object' ? a.question.id : a.question;
                              return questionId === question.id;
                            });
                            const isOpenToAllMe = answer?.me_answer === 6 || answer?.me_open_to_all || false;
                            const meValue = isOpenToAllMe ? 3 : (answer?.me_answer || 3);
                            const meOpenToAll = isOpenToAllMe;

                            return (
                              <React.Fragment key={`me-${question.id}`}>
                                <div className="relative">
                                  {isKidsQuestion && renderKidsTopLabels(question.group_number || 1)}
                                  <ReadOnlySlider value={meValue} isOpenToAll={meOpenToAll} labels={question.answers} />
                                </div>
                                {meHasAnyOTA && (
                                  <div>
                                    {!isGenderQuestion && !isKidsQuestion && !isHabitsQuestion && !isExerciseQuestion && question.open_to_all_me && meOpenToAll ? (
                                      <div className={`block w-11 h-6 rounded-full ${meOpenToAll ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}>
                                        <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${meOpenToAll ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                                      </div>
                                    ) : (
                                      <div className="w-11 h-6"></div>
                                    )}
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    );

                    // Them sliders section
                    const renderThemSliders = () => (
                      <div className="mb-6">
                        <h3 className="text-2xl font-bold text-center mb-1" style={{ color: '#672DB7' }}>Them</h3>
                        {renderSectionLabels('them', themHasAnyOTA)}
                        <div className="grid items-center justify-center mx-auto max-w-fit" style={{ gridTemplateColumns: themHasAnyOTA ? '500px 60px' : '500px', columnGap: '20px', gap: '20px 12px' }}>
                          {selectedQuestionData.map((question: any) => {
                            const answer = answersForQuestion.find((a: any) => {
                              const questionId = typeof a.question === 'object' ? a.question.id : a.question;
                              return questionId === question.id;
                            });
                            const isOpenToAllLooking = answer?.looking_for_answer === 6 || answer?.looking_for_open_to_all || false;
                            const lookingValue = isOpenToAllLooking ? 3 : (answer?.looking_for_answer || 3);
                            const lookingOpenToAll = isOpenToAllLooking;

                            return (
                              <React.Fragment key={`looking-${question.id}`}>
                                <div className="relative">
                                  {isKidsQuestion && renderKidsTopLabels(question.group_number || 1)}
                                  <ReadOnlySlider value={lookingValue} isOpenToAll={lookingOpenToAll} labels={question.answers} />
                                </div>
                                {themHasAnyOTA && (
                                  <div className="w-11 h-6"></div>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    );

                    return (
                      <div className={isDisabled ? 'opacity-50' : ''}>
                        {isRelationshipQuestion ? (
                          <>
                            {/* Q1 Relationship: Me only */}
                            {renderMeSliders()}
                          </>
                        ) : (
                          <>
                            {/* Q2+ (Gender, etc.): Them first, then Me */}
                            {renderThemSliders()}
                            {renderMeSliders()}
                          </>
                        )}
                      </div>
                    );
                  }
                })()}
                </div>
                )
              ) : (
                // Questions List (when filters are active, never show unfiltered fallback — fixes wrong questions on page 2+)
                <>
                  <div className="space-y-2">
                    {paginatedGroupedQuestions.length > 0 ? (
                      paginatedGroupedQuestions.map(([key, group]) => {
                        const groupAny = group as typeof group & { isPending?: boolean; pendingType?: 'my' | 'their' };

                        // Render pending question cards with distinct styling
                        if (groupAny.isPending) {
                          return (
                            <div
                              key={key}
                              onClick={() => {
                                if (groupAny.pendingType === 'my') {
                                  // Open inline answer form in the overlay
                                  handlePendingQuestionClick(group.questionNumber);
                                }
                              }}
                              className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                                groupAny.pendingType === 'my'
                                  ? 'border-dashed border-purple-300 bg-purple-50/50 cursor-pointer hover:bg-purple-50'
                                  : 'border-dashed border-gray-300 bg-gray-50 cursor-default'
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-start">
                                  <span className="text-sm text-gray-400 mr-3">{group.questionNumber}.</span>
                                  <div className="flex-1">
                                    <span className="text-gray-500">{group.displayName}</span>
                                    <p className={`text-xs mt-1 ${
                                      groupAny.pendingType === 'my' ? 'text-purple-500' : 'text-gray-400'
                                    }`}>
                                      {groupAny.pendingType === 'my' ? 'Answer this question' : 'Not yet answered'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {groupAny.pendingType === 'my' && (
                                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              )}
                            </div>
                          );
                        }

                        // Determine question type from the first question in the group
                        const firstQuestion = group.questions[0]?.question;
                        const questionType = firstQuestion?.question_type || 'basic';

                        // For basic questions, check if answer is shared
                        // For grouped questions, always allow navigation (user can still see cards)
                        const firstAnswer = group.questions[0];
                        const isBasicQuestion = questionType === 'basic';
                        const isNotShared = firstAnswer?.me_share === false;
                        const isDisabled = isBasicQuestion && isNotShared;

                        return (
                          <div
                            key={key}
                            onClick={() => {
                              if (isDisabled) return;
                              handleQuestionClick(group.questionNumber, questionType);
                            }}
                            className={`flex items-center justify-between p-4 bg-white border rounded-lg transition-colors ${
                              isDisabled
                                ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-50'
                                : 'border-gray-200 hover:bg-gray-50 cursor-pointer'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-start">
                                <span className="text-sm text-gray-500 mr-3">{group.questionNumber}.</span>
                                <span className={`flex-1 ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>{group.displayName}</span>
                              </div>
                            </div>
                            {!isDisabled && (
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </div>
                        );
                      })
                    ) : (Object.values(filters.questions).some(Boolean) || Object.values(filters.tags).some(Boolean)) ? (
                      // Filters are on but no results — show message instead of unfiltered fallback
                      <div className="text-center py-12 text-gray-500">
                        <p>No questions match your filters.</p>
                      </div>
                    ) : (
                      // Fallback only when no filters: simple grouping when grouped data empty
                      (() => {
                        const groupedAnswers = userAnswers.reduce((acc, answer) => {
                          const qNum = answer.question.question_number;
                          if (!acc[qNum]) {
                            acc[qNum] = [];
                          }
                          acc[qNum].push(answer);
                          return acc;
                        }, {} as Record<number, UserAnswer[]>);

                        const sortedQuestionNumbers = Object.keys(groupedAnswers)
                          .map(Number)
                          .sort((a, b) => a - b);

                        // Paginate fallback questions
                        const startIndex = (questionsModalPage - 1) * QUESTIONS_PER_PAGE;
                        const endIndex = startIndex + QUESTIONS_PER_PAGE;
                        const paginatedQuestionNumbers = sortedQuestionNumbers.slice(startIndex, endIndex);

                        return paginatedQuestionNumbers.map((qNum) => {
                          const answers = groupedAnswers[qNum];
                          const firstAnswer = answers[0];
                          const questionText = firstAnswer.question.text;
                          const questionType = firstAnswer.question.question_type || 'basic';
                          
                          // For basic questions, check if answer is shared
                          // For grouped questions, always allow navigation
                          const isBasicQuestion = questionType === 'basic';
                          const isNotShared = firstAnswer?.me_share === false;
                          const isDisabled = isBasicQuestion && isNotShared;
                          
                          return (
                            <div
                              key={qNum}
                              onClick={() => {
                                if (isDisabled) return;
                                handleQuestionClick(qNum);
                              }}
                              className={`flex items-center justify-between p-4 bg-white border rounded-lg transition-colors ${
                                isDisabled
                                  ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-50'
                                  : 'border-gray-200 hover:bg-gray-50 cursor-pointer'
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-start">
                                  <span className="text-sm text-gray-500 mr-3">{qNum}.</span>
                                  <span className={`flex-1 ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>{questionText}</span>
                                </div>
                              </div>
                              {!isDisabled && (
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              )}
                            </div>
                          );
                        });
                      })()
                    )}
                  </div>

                  {userAnswers.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <p>No questions answered yet.</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer for read-only non-grouped question detail: Answer Question button */}
            {!isAnsweringPending && selectedQuestionNumber && !selectedGroupedQuestionId && selectedQuestionData[0]?.question_type !== 'grouped' && (
              <div className="flex justify-end items-center px-6 py-4 border-t border-gray-200">
                <button
                  onClick={handleAnswerQuestion}
                  className="px-8 py-3 rounded-md font-medium transition-colors cursor-pointer bg-black text-white hover:bg-gray-800"
                >
                  Answer Question
                </button>
              </div>
            )}

            {/* Footer for read-only grouped sub-question: Back to Group (leading) + Answer Question (trailing) */}
            {!isAnsweringPending && selectedQuestionNumber && selectedGroupedQuestionId && (
              <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200">
                <button
                  onClick={() => setSelectedGroupedQuestionId(null)}
                  className="flex items-center text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Back to Group</span>
                </button>
                <button
                  onClick={handleAnswerQuestion}
                  className="px-8 py-3 rounded-md font-medium transition-colors cursor-pointer bg-black text-white hover:bg-gray-800"
                >
                  Answer Question
                </button>
              </div>
            )}

            {/* Save button when answering pending question (matches questions page footer) */}
            {/* For grouped questions, only show Save when a sub-question is selected */}
            {isAnsweringPending && selectedQuestionNumber && (
              !(selectedQuestionData[0]?.question_type === 'grouped' && !selectedGroupedQuestionId)
            ) && (
              <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200">
                {editError && <p className="text-red-500 text-sm">{editError}</p>}
                {!editError && <div />}
                <button
                  onClick={handleSavePendingAnswer}
                  disabled={editSaving}
                  className={`px-8 py-3 rounded-md font-medium transition-colors cursor-pointer ${
                    !editSaving
                      ? 'bg-black text-white hover:bg-gray-800'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {editSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}

            {/* Pagination Controls - only show when viewing questions list */}
            {!selectedQuestionNumber && totalModalPages > 1 && (
              <div className="flex justify-center items-center space-x-4 p-6 border-t border-gray-200">
                {/* Previous Button */}
                <button
                  onClick={() => setQuestionsModalPage(Math.max(1, questionsModalPage - 1))}
                  disabled={questionsModalPage === 1}
                  className={`text-gray-600 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Page Numbers */}
                {Array.from({ length: Math.min(totalModalPages, 7) }, (_, i) => {
                  let pageNum;
                  if (totalModalPages <= 7) {
                    pageNum = i + 1;
                  } else {
                    if (questionsModalPage <= 4) {
                      pageNum = i + 1;
                    } else if (questionsModalPage >= totalModalPages - 3) {
                      pageNum = totalModalPages - 6 + i;
                    } else {
                      pageNum = questionsModalPage - 3 + i;
                    }
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setQuestionsModalPage(pageNum)}
                      className={`w-8 h-8 flex items-center justify-center text-sm rounded-full ${
                        pageNum === questionsModalPage
                          ? 'bg-black text-white font-medium'
                          : 'text-gray-600 hover:text-black'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {/* Show ellipsis and last page if needed */}
                {totalModalPages > 7 && questionsModalPage < totalModalPages - 3 && (
                  <>
                    <span className="text-gray-400">...</span>
                    <button
                      onClick={() => setQuestionsModalPage(totalModalPages)}
                      className={`w-8 h-8 flex items-center justify-center text-sm rounded-full ${
                        totalModalPages === questionsModalPage
                          ? 'bg-black text-white font-medium'
                          : 'text-gray-600 hover:text-black'
                      }`}
                    >
                      {totalModalPages}
                    </button>
                  </>
                )}

                {/* Next Button */}
                <button
                  onClick={() => setQuestionsModalPage(Math.min(totalModalPages, questionsModalPage + 1))}
                  disabled={questionsModalPage === totalModalPages}
                  className={`text-gray-600 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report Button */}
      <div className="mt-8 mb-8 text-center">
        <button
          onClick={() => setShowReportPopup(true)}
          className="text-red-600 hover:text-red-700 font-medium text-sm transition-colors"
        >
          Report
        </button>
      </div>

      {/* Report Popup */}
      {showReportPopup && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowReportPopup(false)}
        >
          <div
            className="bg-white rounded-[28px] shadow-xl w-full max-w-[400px] mx-4 p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-center mb-6">Report User</h2>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Please describe the reason for reporting this user..."
              className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500 mb-6"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReportPopup(false);
                  setReportReason('');
                }}
                className="flex-1 py-3 px-6 rounded-full border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!reportReason.trim()) {
                    alert('Please enter a reason for reporting');
                    return;
                  }

                  const currentUserId = localStorage.getItem('user_id');
                  if (!currentUserId) return;

                  try {
                    const response = await fetch(getApiUrl(API_ENDPOINTS.REPORTS), {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        reporter: currentUserId,
                        reported_user: userId,
                        reason: reportReason,
                      }),
                    });

                    if (response.ok) {
                      alert('Report submitted successfully');
                      setShowReportPopup(false);
                      setReportReason('');
                    } else {
                      alert('Failed to submit report');
                    }
                  } catch (error) {
                    console.error('Error submitting report:', error);
                    alert('Error submitting report');
                  }
                }}
                className="flex-1 py-3 px-6 rounded-full bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Private Answer Popup */}
      {showPrivateAnswerPopup && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowPrivateAnswerPopup(false)}
        >
          <div
            className="bg-white rounded-[28px] shadow-xl w-full max-w-[340px] mx-4 p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-gray-50 flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">
                Private Answer
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                This user has chosen to keep their answer to this question private.
              </p>
              <button
                onClick={() => setShowPrivateAnswerPopup(false)}
                className="w-full bg-black text-white py-3 px-6 rounded-full font-semibold hover:bg-gray-800 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Required Popup */}
      {showApprovalPopup && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
          onClick={() => setShowApprovalPopup(false)}
        >
          <div
            className="bg-white rounded-[28px] shadow-xl w-full max-w-[340px] mx-4 p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-gray-50 flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 tracking-tight">
                Waiting for Approval
              </h3>
              <p className="text-[15px] text-gray-500 leading-relaxed mb-8">
                You can like {user?.first_name || 'this person'} once they approve you.
              </p>
              <button
                onClick={() => setShowApprovalPopup(false)}
                className="w-full py-3.5 text-[15px] font-medium text-white bg-black rounded-full hover:bg-gray-800 active:bg-gray-900 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Send Note Popup */}
      {showNotePopup && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
          onClick={() => {
            setShowNotePopup(false);
            setNoteText('');
          }}
        >
          <div
            className="bg-white rounded-[28px] shadow-xl w-full max-w-[400px] mx-4 p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-center mb-6">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 50%, #672DB7 100%)' }}>
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center tracking-tight">
                Send a note to {user?.first_name || 'them'}
              </h3>
              <p className="text-[14px] text-gray-500 text-center mb-6 leading-relaxed">
                Make a great first impression! They&apos;ll see your note in their notifications.
              </p>

              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write something nice..."
                maxLength={200}
                className="w-full h-28 px-4 py-3 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[15px] mb-2"
              />
              <div className="text-right text-xs text-gray-400 mb-6">
                {noteText.length}/200
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSendLike}
                  className="w-full py-3.5 text-[15px] font-medium text-white rounded-full hover:opacity-90 active:opacity-80 transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 50%, #672DB7 100%)' }}
                >
                  {noteText.trim() ? 'Send Like & Note' : 'Send Like'}
                </button>
                <button
                  onClick={() => {
                    setShowNotePopup(false);
                    setNoteText('');
                  }}
                  className="w-full py-3.5 text-[15px] font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <div className={`grid gap-3 max-w-xl ${localStorage.getItem('user_id') !== userId ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  {/* Mandatory */}
                  <button
                    onClick={() => setPendingFilters(prev => ({
                      ...prev,
                      questions: { ...prev.questions, mandatory: !prev.questions.mandatory }
                    }))}
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

                  {/* Required */}
                  <button
                    onClick={() => setPendingFilters(prev => ({
                      ...prev,
                      questions: { ...prev.questions, required: !prev.questions.required }
                    }))}
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

                  {/* Pending - only when viewing someone else's profile */}
                  {localStorage.getItem('user_id') !== userId && (
                    <button
                      onClick={() => setPendingFilters(prev => ({
                        ...prev,
                        questions: { ...prev.questions, myPending: !prev.questions.myPending }
                      }))}
                      className={`flex flex-col items-center justify-center p-0 rounded-3xl border-2 transition-colors aspect-square gap-0 cursor-pointer ${
                        pendingFilters.questions.myPending
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div>
                        <Image src="/assets/prp.png" alt="Pending" width={48} height={48} />
                      </div>
                      <span className="text-xs font-medium text-gray-900 text-center leading-none whitespace-nowrap">Pending</span>
                    </button>
                  )}

                  {/* Submitted */}
                  <button
                    onClick={() => setPendingFilters(prev => ({
                      ...prev,
                      questions: { ...prev.questions, submitted: !prev.questions.submitted }
                    }))}
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
                        onClick={() => setPendingFilters(prev => ({
                          ...prev,
                          tags: { ...prev.tags, [tagKey]: !prev.tags[tagKey] }
                        }))}
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
                onClick={() => setPendingFilters({
                  questions: {
                    mandatory: false,
                    unanswered: false,
                    required: false,
                    submitted: false,
                    myPending: false,
                    theirPending: false
                  },
                  tags: {
                    value: false,
                    lifestyle: false,
                    look: false,
                    trait: false,
                    hobby: false,
                    interest: false
                  }
                })}
                className="text-gray-600 hover:text-gray-800 font-medium cursor-pointer"
              >
                Clear all
              </button>
              <button
                onClick={() => {
                  setFilters(pendingFilters);
                  setShowFilterModal(false);
                  setQuestionsModalPage(1); // Reset to page 1 when filters change
                }}
                className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 font-medium cursor-pointer"
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Celebration */}
      <MatchCelebration
        show={showMatchCelebration}
        onClose={() => setShowMatchCelebration(false)}
        onChat={async () => {
          if (!userId) return;
          const currentUserId = localStorage.getItem('user_id');
          if (!currentUserId) return;

          try {
            // Create or get existing conversation
            const conversation = await apiService.createOrGetConversation(currentUserId, userId);
            // Navigate to the conversation
            router.push(`/chats/${conversation.id}`);
          } catch (error) {
            console.error('Error starting conversation:', error);
            // Close modal on error
            setShowMatchCelebration(false);
          }
        }}
        matchedUserId={userId}
        currentUserPhoto={localStorage.getItem('user_profile_photo') || undefined}
        matchedUserPhoto={user?.profile_photo}
        matchedUserName={user?.first_name || user?.username}
        showModal={true}
      />
    </div>
  );
}


