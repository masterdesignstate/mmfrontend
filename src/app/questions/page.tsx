'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS, API_BASE_URL } from '@/config/api';
import HamburgerMenu from '@/components/HamburgerMenu';

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

export default function QuestionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [loading, setLoading] = useState(true);
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
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
  const ROWS_PER_PAGE = 10;
  const [filters, setFilters] = useState({
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
  });

  // Fetch question metadata (question numbers and answer counts) from backend in single optimized request
  const fetchQuestionMetadata = async () => {
    try {
      // Check sessionStorage cache first (5 min TTL)
      const cacheKey = 'questions_metadata';
      const cachedData = sessionStorage.getItem(cacheKey);
      const cacheTimestamp = sessionStorage.getItem(`${cacheKey}_timestamp`);
      const now = Date.now();

      if (cachedData && cacheTimestamp && (now - parseInt(cacheTimestamp)) < 300000) { // 5 min cache
        console.log('Using cached question metadata');
        const metadata = JSON.parse(cachedData);
        console.log('📊 Cached Metadata:', {
          distinct_question_numbers: metadata.distinct_question_numbers,
          total_question_groups: metadata.total_question_groups,
          question_count: metadata.distinct_question_numbers?.length
        });
        // Filter out any null values from distinct_question_numbers
        const validQuestionNumbers = metadata.distinct_question_numbers.filter((num: number | null) => num !== null && num !== undefined);
        setAllQuestionNumbers(validQuestionNumbers);
        setTotalQuestionGroups(metadata.total_question_groups);
        setTotalPages(Math.ceil(metadata.total_question_groups / ROWS_PER_PAGE));
        setAnswerCounts(metadata.answer_counts);
        return validQuestionNumbers;
      }

      // Fetch from new optimized metadata endpoint
      const metadataUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}metadata/`;
      console.log('🔍 Fetching metadata from:', metadataUrl);
      console.log('🔍 Full metadata URL:', metadataUrl);
      
      const response = await fetch(metadataUrl, {
   
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const metadata = await response.json();

        console.log('📊 Fresh Metadata from API:', {
          distinct_question_numbers: metadata.distinct_question_numbers,
          total_question_groups: metadata.total_question_groups,
          question_count: metadata.distinct_question_numbers?.length,
          answer_counts: metadata.answer_counts
        });
        console.log('📊 All question numbers in metadata:', metadata.distinct_question_numbers);

        // Cache the metadata
        sessionStorage.setItem(cacheKey, JSON.stringify(metadata));
        sessionStorage.setItem(`${cacheKey}_timestamp`, now.toString());

        // Filter out any null values from distinct_question_numbers
        const validQuestionNumbers = metadata.distinct_question_numbers.filter((num: number | null) => num !== null && num !== undefined);
        setAllQuestionNumbers(validQuestionNumbers);
        setTotalQuestionGroups(metadata.total_question_groups);
        setTotalPages(Math.ceil(metadata.total_question_groups / ROWS_PER_PAGE));
        setAnswerCounts(metadata.answer_counts);

        console.log(`Fetched metadata: ${metadata.total_question_groups} question groups`);
        return validQuestionNumbers;
      } else {
        console.error('Failed to fetch question metadata');
        return [];
      }
    } catch (error) {
      console.error('Error fetching question metadata:', error);
      
      // If fetch failed but we have cached data, try to use it even if expired
      const cacheKey = 'questions_metadata';
      const cachedData = sessionStorage.getItem(cacheKey);
      if (cachedData) {
        console.log('⚠️ Using stale cache due to network error');
        try {
          const metadata = JSON.parse(cachedData);
          const validQuestionNumbers = metadata.distinct_question_numbers.filter((num: number | null) => num !== null && num !== undefined);
          setAllQuestionNumbers(validQuestionNumbers);
          setTotalQuestionGroups(metadata.total_question_groups);
          setTotalPages(Math.ceil(metadata.total_question_groups / ROWS_PER_PAGE));
          setAnswerCounts(metadata.answer_counts);
          return validQuestionNumbers;
        } catch (parseError) {
          console.error('Error parsing cached data:', parseError);
        }
      }
      return [];
    }
  };


  useEffect(() => {
    const fetchQuestionsAndAnswers = async () => {
      try {
        // Get user ID from localStorage
        const storedUserId = localStorage.getItem('user_id');
        if (!storedUserId) {
          setError('User ID not found');
          router.push('/auth/login');
          return;
        }
        setUserId(storedUserId);

        // Fetch question metadata (question numbers + answer counts) in single optimized request
        const questionNumbers = await fetchQuestionMetadata();

        // Questions will be fetched by the useEffect for pagination

        // Fetch user answers
        const answersResponse = await fetch(
          `${getApiUrl(API_ENDPOINTS.ANSWERS)}?user=${storedUserId}`,
          {
       
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (answersResponse.ok) {
          const answersData = await answersResponse.json();
          setUserAnswers(answersData.results || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load questions');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionsAndAnswers();
  }, [router]);

  // Check for refresh parameter and refetch metadata
  useEffect(() => {
    const refresh = searchParams.get('refresh');
    if (refresh === 'true') {
      // Clear the refresh parameter from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('refresh');
      window.history.replaceState({}, '', url.toString());

      // Clear cache and refetch metadata
      sessionStorage.removeItem('questions_metadata');
      sessionStorage.removeItem('questions_metadata_timestamp');
      fetchQuestionMetadata();
    }
  }, [searchParams]);

  // Clear stale cache on mount (one-time cache bust)
  useEffect(() => {
    const cacheBustKey = 'questions_cache_v2';
    if (!sessionStorage.getItem(cacheBustKey)) {
      console.log('🔄 Cache bust: Clearing stale question metadata');
      sessionStorage.removeItem('questions_metadata');
      sessionStorage.removeItem('questions_metadata_timestamp');
      sessionStorage.setItem(cacheBustKey, 'true');
    }
  }, []);

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

  // Check for filter parameter and apply submitted filter
  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter === 'submitted' && !filters.questions.submitted) {
      setFilters(prev => ({
        ...prev,
        questions: {
          ...prev.questions,
          submitted: true
        }
      }));
    }
  }, [searchParams, filters.questions.submitted]);

  // Fetch questions for current page
  const fetchQuestionsForCurrentPage = React.useCallback(async () => {
    if (allQuestionNumbers.length === 0) return;

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
      setLoading(true);

      // Calculate which question numbers to show on current page
      const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
      const endIndex = startIndex + ROWS_PER_PAGE;
      const pageQuestionNumbers = sortedQuestionNumbers.slice(startIndex, endIndex);

      if (pageQuestionNumbers.length === 0) {
        setQuestions([]);
        setFilteredQuestions([]);
        return;
      }

      // Build single batch API call with multiple question_number params
      const questionNumberParams = pageQuestionNumbers.map(num => `question_number=${num}`).join('&');
      let url = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?${questionNumberParams}&page_size=100`;

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

        console.log(`📥 API Response (page ${pageNum}):`, {
          total_in_response: data.count,
          results_this_page: results.length,
          accumulated_total: allPageQuestions.length,
          has_next: !!data.next,
          question_numbers: allPageQuestions.map(q => q.question_number).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b)
        });

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
      setFilteredQuestions(pageQuestions);
    } catch (error) {
      console.error('Error fetching questions for page:', error);
      setError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [allQuestionNumbers, currentPage, sortOption, answerCounts]);

  // Effect to handle page changes
  useEffect(() => {
    fetchQuestionsForCurrentPage();
  }, [fetchQuestionsForCurrentPage]);

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

    const questionNumbers = Object.keys(allGroupedQuestions).map(Number);
    
    // Helper functions for filtering
    const isQuestionMandatory = (questionNumber: number): boolean => {
      const questionGroup = allGroupedQuestions[questionNumber];
      if (!questionGroup || questionGroup.length === 0) return false;
      return questionGroup[0].is_mandatory || false;
    };

    const isQuestionAnswered = (questionNumber: number): boolean => {
      const questionGroup = allGroupedQuestions[questionNumber];
      if (!questionGroup || questionGroup.length === 0) return false;
      // Use the backend-computed field if available, otherwise check UserAnswers
      if (questionGroup[0].is_answered !== undefined) {
        return questionGroup[0].is_answered;
      }
      return userAnswers.some(answer => answer.question.question_number === questionNumber);
    };

    const isQuestionUnanswered = (questionNumber: number): boolean => {
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
    
    const filtered = questionNumbers.filter(questionNumber => {
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

    // Reset to page 1 when filters change (only if not already on page 1 to prevent duplicate fetch)
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    // Note: currentPage is intentionally NOT in dependencies to avoid re-filtering on page change
  }, [filters, questions, userAnswers]);

  // Apply filters when questions are loaded or filter state changes
  useEffect(() => {
    if (questions.length > 0) {
      // Check if any filters are active
      const hasQuestionFilters = Object.values(filters.questions).some(filter => filter);
      const hasTagFilters = Object.values(filters.tags).some(filter => filter);

      if (!hasQuestionFilters && !hasTagFilters) {
        // No filters active, show all questions
        setFilteredQuestions(questions);
      } else {
        // Apply filters
        applyFilters();
      }
    }
  }, [questions, filters, applyFilters]);

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
    console.log('🔍 Grouping questions. filteredQuestions:', {
      count: filteredQuestions.length,
      question_numbers: filteredQuestions.map(q => q.question_number).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b)
    });

    const grouped: Record<string, { questions: Question[], displayName: string, questionNumber: number, answerCount: number }> = {};

    filteredQuestions.forEach(question => {
      const questionType = question.question_type || 'basic';

      if (questionType === 'basic') {
        // Basic questions - each stands alone
        const key = `${question.question_number}_${question.id}`;
        grouped[key] = {
          questions: [question],
          displayName: question.text,
          questionNumber: question.question_number,
          answerCount: answerCounts[question.question_number] || 0
        };
      } else if (['four', 'grouped', 'double', 'triple'].includes(questionType)) {
        // Grouped questions - combine by question_number
        const key = `group_${question.question_number}`;
        if (!grouped[key]) {
          // Use group_name_text if available, otherwise use the first question's text
          const displayText = question.group_name_text ||
                             questionDisplayNames[question.question_number] ||
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
  }, [filteredQuestions, questionDisplayNames, answerCounts]);

  // Sort the grouped questions based on selected sort option
  const sortedGroupedQuestions = React.useMemo(() => {
    const entries = Object.entries(groupedQuestions);

    switch (sortOption) {
      case 'randomized':
        // Randomize order
        return entries.sort(() => Math.random() - 0.5);
      case 'popular':
        // Sort by answer count (most answers first)
        return entries.sort((a, b) => b[1].answerCount - a[1].answerCount);
      case 'new':
        // Sort by question number descending (recently asked)
        return entries.sort((a, b) => b[1].questionNumber - a[1].questionNumber);
      case 'number':
        // Sort by question number ascending (numerical order)
        return entries.sort((a, b) => a[1].questionNumber - b[1].questionNumber);
      default:
        return entries.sort((a, b) => a[1].questionNumber - b[1].questionNumber);
    }
  }, [groupedQuestions, sortOption]);


  // Get answer count for a question number from fetched data
  const getAnswerCount = (questionNumber: number): number => {
    return answerCounts[questionNumber] || 0;
  };

  const handleQuestionClick = (questionNumber: number) => {
    // Store questions and answers in sessionStorage to avoid refetching while preventing URL issues
    sessionStorage.setItem('questionsData', JSON.stringify(questions));
    sessionStorage.setItem('userAnswersData', JSON.stringify(userAnswers));
    sessionStorage.setItem('questionsDataTimestamp', Date.now().toString());

    router.push(`/questions/${questionNumber}`);
  };

  const handleFilterToggle = (category: 'questions' | 'tags', filter: string) => {
    if (category === 'questions') {
      updateQuestionFilter(filter as keyof typeof filters.questions, !filters.questions[filter as keyof typeof filters.questions]);
    } else {
      updateTagFilter(filter as keyof typeof filters.tags, !filters.tags[filter as keyof typeof filters.tags]);
    }
  };

  const updateQuestionFilter = (filterType: keyof typeof filters.questions, value: boolean) => {
    setFilters(prev => ({
      ...prev,
      questions: {
        ...prev.questions,
        [filterType]: value
      }
    }));
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
    setFilters({
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
    });
    
    setFilteredQuestions(questions);
    setCurrentPage(1);
  };

  const applyFiltersAndClose = () => {
    applyFilters();
    setShowFilterModal(false);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#672DB7] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading questions...</p>
        </div>
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
      {/* Header */}
      <div className="flex items-center justify-center p-4 relative border-b border-gray-200">
        <div className="absolute left-4">
          <Image
            src="/assets/mmlogox.png"
            alt="Logo"
            width={32}
            height={32}
          />
        </div>
        
        {/* Search Bar */}
        <div className="flex items-center max-w-2xl w-full mx-8">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search questions"
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-full leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <button 
            onClick={() => setShowFilterModal(true)}
            className="ml-4 px-4 py-3 border border-gray-300 rounded-full text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none cursor-pointer"
          >
            <svg className="w-4 h-4 mr-1 inline text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
            </svg>
            Filter
          </button>
          
          <div className="relative ml-2">
            <button
              ref={sortButtonRef}
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="px-4 py-3 border border-gray-300 rounded-full text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              <svg className="w-4 h-4 mr-1 inline text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              Sort
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
        
        <div className="absolute right-4">
          <HamburgerMenu />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-6 max-w-6xl mx-auto">
        {/* Title and Ask Button */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">All Questions</h1>
            <p className="text-gray-600">
              Showing {sortedGroupedQuestions.length} questions
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
          <div className="flex items-center justify-between px-4 mb-2">
            <div className="flex-1"></div>
            <span className="text-sm font-medium text-black">Times Answered</span>
          </div>
          {sortedGroupedQuestions
            .map(([key, group]) => {
              const answerCount = getAnswerCount(group.questionNumber);

              return (
                <div
                  key={key}
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
        {totalPages > 1 && (
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
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else {
                if (currentPage <= 4) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
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
            {totalPages > 7 && currentPage < totalPages - 3 && (
              <>
                <span className="text-gray-400">...</span>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-8 h-8 text-gray-600 flex items-center justify-center text-sm hover:text-black"
                >
                  {totalPages}
                </button>
              </>
            )}

            {/* Next Button */}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
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
                className="text-gray-400 hover:text-gray-600"
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
                      filters.questions.mandatory 
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
                    className={`flex flex-col items-center justify-center p- rounded-3xl border-2 transition-colors aspect-square gap-0 ${
                      filters.questions.answered 
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
                      filters.questions.unanswered 
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
                      filters.questions.required 
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
                      filters.questions.submitted 
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
                    const tagKey = tag.toLowerCase() as keyof typeof filters.tags;
                    const isSelected = filters.tags[tagKey];
                    
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

              {/* Tags Section */}
              <div className="mb-6">
                <h3 className="text-base font-semibold mb-3">Add Tag</h3>
                <div className="flex flex-wrap gap-2">
                  {['Value', 'Lifestyle', 'Look', 'Trait', 'Hobby', 'Interest'].map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTags(selectedTags.filter(t => t !== tag));
                          } else if (selectedTags.length < 3) {
                            setSelectedTags([...selectedTags, tag]);
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
                    // First, fetch the max question_number to determine the next number
                    const maxResponse = await fetch(`${getApiUrl(API_ENDPOINTS.QUESTIONS)}?ordering=-question_number&page_size=1`, {
                      headers: {
                        'Content-Type': 'application/json',
                      },
                    });

                    let nextQuestionNumber = 1;
                    if (maxResponse.ok) {
                      const maxData = await maxResponse.json();
                      console.log('📊 Max question data:', maxData);
                      console.log('📊 Results array:', maxData.results);
                      if (maxData.results && maxData.results.length > 0) {
                        // Find the highest question_number from all results
                        let maxNum = 0;
                        for (const q of maxData.results) {
                          if (q.question_number && q.question_number > maxNum) {
                            maxNum = q.question_number;
                          }
                        }
                        if (maxNum > 0) {
                          nextQuestionNumber = maxNum + 1;
                          console.log(`📝 Next question number will be: ${nextQuestionNumber}`);
                        }
                      }
                    }

                    // Get user ID from localStorage
                    const storedUserId = localStorage.getItem('user_id');
                    
                    // Now create the question with the next number
                    const questionData = {
                        text: questionText.trim(),
                        question_name: questionText.trim().substring(0, 50),  // Auto-generate name from text
                        question_number: nextQuestionNumber,  // Use the next available question number
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
                    console.log('📝 Created question number:', responseData.question_number);
                    console.log('📝 Created question id:', responseData.id);

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