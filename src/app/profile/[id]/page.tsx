'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
import HamburgerMenu from '@/components/HamburgerMenu';

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

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [hasMatch, setHasMatch] = useState(false); // Track if both users liked each other
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [questionsModalPage, setQuestionsModalPage] = useState(1);
  const QUESTIONS_PER_PAGE = 8;
  const [selectedQuestionNumber, setSelectedQuestionNumber] = useState<number | null>(null);
  const [selectedQuestionData, setSelectedQuestionData] = useState<any[]>([]);

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

        if (cachedData && cacheTimestamp && (now - parseInt(cacheTimestamp)) < 120000) { // 2 min cache
          console.log('Using cached profile data');
          const { user: cachedUser, answers: cachedAnswers } = JSON.parse(cachedData);
          setUser(cachedUser);
          setUserAnswers(cachedAnswers);
          setLoading(false);
          return;
        }

        // Fetch user, answers, and questions in parallel
        const [userResponse, answersResponse, questionsResponse] = await Promise.all([
          fetch(`${getApiUrl(API_ENDPOINTS.USERS)}${userId}/`, {
 
            headers: {
              'Content-Type': 'application/json',
            },
          }),
          fetch(`${getApiUrl(API_ENDPOINTS.ANSWERS)}?user=${userId}&page_size=100`, {

            headers: {
              'Content-Type': 'application/json',
            },
          }),
          fetch(`${getApiUrl(API_ENDPOINTS.QUESTIONS)}?page_size=1000`, {

            headers: {
              'Content-Type': 'application/json',
            },
          })
        ]);

        if (!userResponse.ok) {
          throw new Error('User not found');
        }

        if (!answersResponse.ok) {
          throw new Error('Failed to fetch user answers');
        }

        if (!questionsResponse.ok) {
          throw new Error('Failed to fetch questions');
        }

        const [userData, answersData, questionsData] = await Promise.all([
          userResponse.json(),
          answersResponse.json(),
          questionsResponse.json()
        ]);

        const answers = answersData.results || [];
        const questions = questionsData.results || [];

        // Cache the data
        sessionStorage.setItem(cacheKey, JSON.stringify({ user: userData, answers }));
        sessionStorage.setItem(`${cacheKey}_timestamp`, now.toString());

        setUser(userData);
        setUserAnswers(answers);
        setAllQuestions(questions);

      } catch (error) {
        console.error('Error fetching profile:', error);
        setError(error instanceof Error ? error.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

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

  // Handle tag toggle
  const handleTagToggle = async (tag: string) => {
    const currentUserId = localStorage.getItem('user_id');
    if (!currentUserId || !userId) return;

    // Optimistically update UI
    const normalizedTag = tag.toLowerCase();
    const isCurrentlySelected = selectedTags.includes(normalizedTag);
    
    setSelectedTags(prev =>
      isCurrentlySelected
        ? prev.filter(t => t !== normalizedTag)
        : [...prev, normalizedTag]
    );

    try {
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
      answerCount: number 
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
            answerCount: 0
          };
        }
        // Add all answers for this question number
        grouped[key].questions.push(...answersForQuestion);
        grouped[key].answerCount = answersForQuestion.length;
      }
    });

    // Sort by question number
    return Object.entries(grouped).sort((a, b) => 
      a[1].questionNumber - b[1].questionNumber
    );
  }, [userAnswers, allQuestions, questionDisplayNames]);

  // Paginate grouped questions for modal (8 per page)
  const paginatedGroupedQuestions = useMemo(() => {
    const startIndex = (questionsModalPage - 1) * QUESTIONS_PER_PAGE;
    const endIndex = startIndex + QUESTIONS_PER_PAGE;
    return groupedQuestionsForModal.slice(startIndex, endIndex);
  }, [groupedQuestionsForModal, questionsModalPage]);

  // Calculate total pages for modal (handle both grouped and fallback cases)
  const totalModalPages = useMemo(() => {
    if (groupedQuestionsForModal.length > 0) {
      return Math.ceil(groupedQuestionsForModal.length / QUESTIONS_PER_PAGE);
    }
    // Fallback: calculate pages based on unique question numbers
    const uniqueQuestionNumbers = new Set(userAnswers.map(answer => answer.question.question_number));
    return Math.ceil(uniqueQuestionNumbers.size / QUESTIONS_PER_PAGE);
  }, [groupedQuestionsForModal, userAnswers]);

  // Reset pagination and selected question when modal opens
  useEffect(() => {
    if (showQuestionsModal) {
      setQuestionsModalPage(1);
      setSelectedQuestionNumber(null);
      setSelectedQuestionData([]);
    }
  }, [showQuestionsModal]);

  // Handle question click - show question details in modal
  const handleQuestionClick = async (questionNumber: number, questionType?: string) => {
    // Find all questions with this question number
    const questionsForNumber = allQuestions.filter(q => q.question_number === questionNumber);
    
    if (questionsForNumber.length > 0) {
      setSelectedQuestionNumber(questionNumber);
      setSelectedQuestionData(questionsForNumber);
    }
  };

  // Handle back to questions list
  const handleBackToQuestionsList = () => {
    setSelectedQuestionNumber(null);
    setSelectedQuestionData([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#672DB7] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
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
  // Get the first name only (text before first space)
  const fullName = user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username;
  const displayName = fullName.split(' ')[0]; // Take only the first part before space

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

    // Determine what to do based on current state
    let action = '';
    if (hasMatch || selectedTags.includes('like')) {
      // If matched or liked, remove like tag (go back to approve or no tags)
      action = 'remove_like';
    } else if (selectedTags.includes('approve')) {
      // If approved, remove approve and add like
      action = 'approve_to_like';
    } else {
      // If no tags, add approve
      action = 'add_approve';
    }

    // Update UI optimistically
    let newSelectedTags = [...selectedTags];
    
    switch (action) {
      case 'remove_like':
        newSelectedTags = newSelectedTags.filter(tag => tag !== 'like');
        setHasMatch(false);
        break;
      case 'approve_to_like':
        newSelectedTags = newSelectedTags.filter(tag => tag !== 'approve');
        newSelectedTags.push('like');
        break;
      case 'add_approve':
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
          // Check for match after removing like
          await checkForMatch(newSelectedTags);
          break;
        case 'approve_to_like':
          await toggleTagAPI('Approve');
          await toggleTagAPI('Like');
          // Check for match after adding like
          await checkForMatch(newSelectedTags);
          break;
        case 'add_approve':
          await toggleTagAPI('Approve');
          break;
      }
    } catch (error) {
      // Revert on error
      setSelectedTags(selectedTags);
      setHasMatch(false);
      console.error('Error updating progression:', error);
    }
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
        setHasMatch(iLikedThem && theyLikedMe);
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
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button onClick={() => router.back()} className="flex items-center">
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <Image
          src="/assets/mmlogox.png"
          alt="Logo"
          width={32}
          height={32}
        />
        <HamburgerMenu />
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto px-6 lg:px-12 xl:px-20 py-4">
        {/* Profile Photo and Name */}
        <div className="relative mb-6">
          <div className="w-full sm:w-95 aspect-[4/3] sm:aspect-[4/4] bg-gradient-to-b from-orange-400 to-orange-600 rounded-2xl overflow-hidden relative mx-auto">
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
          
          {/* Tagline and Questions button below the profile photo */}
          <div className="mt-2 w-full sm:w-95 mx-auto flex items-center justify-between">
            {user.tagline && (
              <div className="text-left flex-1 mr-4">
                <p className="text-gray-700 text-lg">{user.tagline}</p>
              </div>
            )}
            <button
              onClick={() => {
                console.log('Questions button clicked, opening modal');
                setShowQuestionsModal(true);
              }}
              className="bg-black text-white px-6 py-2 rounded-full font-medium hover:bg-gray-800 transition-colors flex-shrink-0 cursor-pointer"
            >
              Questions
            </button>
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
        <div className="mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Bio</h3>
          <p className="text-gray-600 text-sm">{user.bio || 'Lord of the rings hardcore fan and doja cat enthusiast'}</p>
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
                    onClick={handleBackToQuestionsList}
                    className="flex items-center text-gray-600 hover:text-gray-900"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Back</span>
                  </button>
                  <h2 className="text-xl font-semibold flex-1 text-center">
                    {selectedQuestionData[0]?.group_name_text || 
                     selectedQuestionData[0]?.text || 
                     `Question ${selectedQuestionNumber}`}
                  </h2>
                  <div className="w-20"></div> {/* Spacer for centering */}
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold">Questions Answered</h2>
                  <button 
                    onClick={() => setShowQuestionsModal(false)}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedQuestionNumber ? (
                // Show question details
                (() => {
                  const questionType = selectedQuestionData[0]?.question_type || 'basic';
                  const questionNumber = selectedQuestionNumber;
                  
                  // Option icons mapping
                  const optionIcons: Record<number, string> = {
                    3: '/assets/ethn.png',
                    4: '/assets/cpx.png',
                    5: '/assets/lf2.png',
                    7: '/assets/hands.png',
                    8: '/assets/prayin.png',
                    9: '/assets/politics.png',
                    10: '/assets/pacifier.png',
                    11: '/assets/prayin.png',
                    12: '/assets/ethn.png'
                  };

                  // Find user answers for this question
                  const answersForQuestion = userAnswers.filter(
                    answer => answer.question.question_number === questionNumber
                  );

                  if (questionType === 'grouped') {
                    // Show cards for grouped questions (like ethnicity, education, diet)
                    return (
                      <div className="max-w-2xl mx-auto">
                        <div className="mb-6">
                          <p className="text-gray-600 text-center">
                            {selectedQuestionData[0]?.text || selectedQuestionData[0]?.group_name_text}
                          </p>
                        </div>
                        <div className="space-y-3">
                          {selectedQuestionData.map((question: any) => {
                            const hasAnswer = answersForQuestion.some(
                              answer => answer.question.id === question.id
                            );
                            
                            return (
                              <div
                                key={question.id}
                                className={`flex items-center space-x-3 p-4 border rounded-lg ${
                                  hasAnswer
                                    ? 'border-[#672DB7] bg-purple-50'
                                    : 'border-gray-200 bg-white'
                                }`}
                              >
                                <Image
                                  src={optionIcons[questionNumber] || '/assets/ethn.png'}
                                  alt={question.question_name}
                                  width={24}
                                  height={24}
                                  className="w-6 h-6"
                                />
                                <span className="flex-1 text-gray-900 font-medium">
                                  {question.question_name}
                                </span>
                                {hasAnswer && (
                                  <span className="text-xs text-[#672DB7] font-medium">
                                    Answered
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  } else if (['double', 'triple', 'four', 'basic'].includes(questionType)) {
                    // Show sliders/answers for double, triple, four, and basic questions
                    return (
                      <div className="max-w-2xl mx-auto">
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-4 text-center">
                            {selectedQuestionData[0]?.text || selectedQuestionData[0]?.group_name_text}
                          </h3>
                          
                          {answersForQuestion.length > 0 ? (
                            <div className="space-y-4">
                              {selectedQuestionData.map((question: any) => {
                                const answerForQuestion = answersForQuestion.find(
                                  answer => answer.question.id === question.id
                                );
                                
                                if (!answerForQuestion) return null;
                                
                                return (
                                  <div key={question.id} className="p-4 bg-gray-50 rounded-lg">
                                    <div className="mb-2">
                                      <p className="text-sm font-medium text-gray-700">
                                        {question.question_name}
                                      </p>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Me:</span>
                                        <span className="text-sm font-medium text-gray-900">
                                          {answerForQuestion.me_answer}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Looking for:</span>
                                        <span className="text-sm font-medium text-gray-900">
                                          {answerForQuestion.looking_for_answer}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-center">No answers yet</p>
                          )}
                        </div>
                      </div>
                    );
                  } else {
                    // Fallback for unknown types
                    return (
                      <div className="max-w-2xl mx-auto">
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-2">
                            {selectedQuestionData[0]?.text}
                          </h3>
                          {answersForQuestion.length > 0 && (
                            <div className="mt-4 space-y-2">
                              <p className="text-sm font-medium text-gray-700">Your Answers:</p>
                              {answersForQuestion.map((answer) => (
                                <div key={answer.id} className="p-3 bg-gray-50 rounded-lg">
                                  <p className="text-sm text-gray-900">
                                    Me: {answer.me_answer} | Looking for: {answer.looking_for_answer}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                })()
              ) : (
                // Show questions list
                <>
                  {/* Questions List */}
                  <div className="space-y-2">
                    {paginatedGroupedQuestions.length > 0 ? (
                      paginatedGroupedQuestions.map(([key, group]) => {
                        // Determine question type from the first question in the group
                        const firstQuestion = group.questions[0]?.question;
                        const questionType = firstQuestion?.question_type || 'basic';
                        
                        return (
                          <div
                            key={key}
                            onClick={() => handleQuestionClick(group.questionNumber, questionType)}
                            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <div className="flex-1">
                              <div className="flex items-start">
                                <span className="text-sm text-gray-500 mr-3">{group.questionNumber}.</span>
                                <span className="text-gray-900 flex-1">{group.displayName}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 rounded-full bg-[#ECECEC] flex items-center justify-center">
                                <span className="text-sm text-gray-700 font-medium">{group.answerCount}</span>
                              </div>
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      // Fallback: simple grouping by question_number when questions data not loaded
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
                          
                          return (
                            <div
                              key={qNum}
                              onClick={() => handleQuestionClick(qNum)}
                              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              <div className="flex-1">
                                <div className="flex items-start">
                                  <span className="text-sm text-gray-500 mr-3">{qNum}.</span>
                                  <span className="text-gray-900 flex-1">{questionText}</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 rounded-full bg-[#ECECEC] flex items-center justify-center">
                                  <span className="text-sm text-gray-700 font-medium">{answers.length}</span>
                                </div>
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
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
    </div>
  );
}
