'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
import AnswerSliderRow, { AnswerScaleHeader } from '@/components/AnswerSliderRow';
import OnboardingShell, { OnboardingTitle } from '@/components/OnboardingShell';
import { DEFAULT_SCALE_LABELS, IMPORTANCE_LABELS } from '@/constants/answerLabels';
import { getSliderLabelsForQuestion } from '@/utils/answerValues';
import type { AnswerValueLabel } from '@/utils/answerValues';
import { getAllowedExclusionValues, normalizeExcludedValues } from '@/utils/exclusionValues';
import posthog from 'posthog-js';

/**
 * Scale captions this page overrides per route. When a route appears here only the listed
 * values get a caption; anything else on the scale renders blank, matching the labels the
 * page showed before the shared slider row replaced them.
 */
const FREQUENCY_SCALE = { 1: 'NEVER', 2: 'RARELY', 3: 'SOMETIMES', 4: 'REGULARLY', 5: 'DAILY' };
const SCALE_TEXT_OVERRIDES: Record<string, Record<number, string>> = {
  ethnicity: { 1: 'LESS', 5: 'MORE' },
  education: { 1: 'NONE', 3: 'SOME', 5: 'COMPLETED' },
  diet: { 1: 'NO', 5: 'YES' },
  '6': FREQUENCY_SCALE,
  '7': FREQUENCY_SCALE,
  '8': FREQUENCY_SCALE,
  '9': { 1: 'UNINVOLVED', 2: 'OBSERVANT', 3: 'ACTIVE', 4: 'FERVENT', 5: 'RADICAL' },
};

const questionAllowsLookingOta = (
  question?: { question_number?: number; open_to_all_looking_for?: boolean } | null
) => (
  Boolean(question && (question.open_to_all_looking_for || Number(question.question_number) === 13))
);

export default function QuestionPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string>('');
  const [question, setQuestion] = useState<{
    id: string;
    question_name: string;
    question_number: number;
    group_name: string;
    text: string;
    answers: AnswerValueLabel[];
    open_to_all_me: boolean;
    open_to_all_looking_for: boolean;
  } | null>(null);

  // Parse existing answer from URL (passed by questions page for instant loading)
  const initialEaRaw = searchParams.get('ea');
  const initialEa = useMemo(() => {
    try {
      return initialEaRaw ? JSON.parse(initialEaRaw) : null;
    } catch { return null; }
  }, [initialEaRaw]);

  // Question answer states — initialized from URL params when available (zero delay)
  const [meAnswer, setMeAnswer] = useState(initialEa ? (initialEa.mo ? 3 : initialEa.me) : 3);
  const [lookingForAnswer, setLookingForAnswer] = useState(initialEa ? (initialEa.lo ? 3 : initialEa.lf) : 3);
  const [importance, setImportance] = useState({
    me: initialEa?.mi || 1,
    lookingFor: initialEa?.li || 3
  });
  const [openToAll, setOpenToAll] = useState({
    meOpen: initialEa?.mo || false,
    lookingForOpen: initialEa?.lo || false
  });
  const [excludedAnswerValues, setExcludedAnswerValues] = useState<number[]>(
    normalizeExcludedValues(initialEa?.exc)
  );
  const [answerNote, setAnswerNote] = useState<string>(initialEa?.note || '');
  const allowedExclusionValues = useMemo(
    () => getAllowedExclusionValues(question),
    [question]
  );
  const blockedExclusionValues = useMemo(
    () => openToAll.meOpen ? [] : [meAnswer],
    [meAnswer, openToAll.meOpen]
  );
  const [meShare, setMeShare] = useState(true);
  const [meRequired, setMeRequired] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [error, setError] = useState<string>('');
  const answerFetchIdRef = useRef(0);

  const getUserStorageKey = useCallback(
    (base: string) => (userId ? `${base}_${userId}` : null),
    [userId]
  );

  // Hardcoded question IDs from Django database (question_number=4)
  const educationQuestionIds = {
    'Pre High School': '345bab19-ed6a-4d25-a871-8e13331afc68',    // Group 1: Pre High School
    'High School': '4f5bbf05-00d1-4b75-b26d-d465ef51ddd6',        // Group 2: High School
    'Trade': '95bffb86-6872-47d0-8a32-418cc5a26e20',              // Group 3: Trade
    'Undergraduate': '60639d56-337e-46a0-83c7-cce8cb1676ef',      // Group 4: Undergraduate
    'Masters': 'cc55db09-a064-4cd3-b919-77bf0c4e53b7',            // Group 5: Masters
    'Doctorate': 'e1961280-0371-4319-81e6-0efc596b8d1d'           // Group 6: Doctorate
  };

  // Hardcoded question IDs from Django database (question_number=5)
  const dietQuestionIds = {
    'Omnivore': '88c5d527-5b04-4227-8b94-e2e8537c5ad1',        // Group 1: Omnivore
    'Pescatarian': 'f0634c01-0941-4ae6-bfa8-24268b40d7f0',     // Group 2: Pescatarian
    'Vegetarian': 'cbb8c995-a0f2-4311-af82-daff06435e84',       // Group 3: Vegetarian
    'Vegan': '5dde9565-3ee5-4910-837c-ee92212db90a'             // Group 4: Vegan
  };

  // Hardcoded question ID from Django database (question_number=6)
  const exerciseQuestionId = '69340c6a-ab20-441c-b3d6-5564d9808998';

  // Helper function to get education display name
  const getEducationDisplayName = (education: string): string => {
    const educationMap: { [key: string]: string } = {
      'Doctorate': 'Doctorate',
      'Masters': 'Masters', 
      'Undergraduate': 'Undergraduate',
      'Trade': 'Trade',
      'High School': 'High School',
      'Pre High School': 'Pre High School'
    };
    return educationMap[education] || education;
  };

  // Helper function to get diet display name
  const getDietDisplayName = (diet: string) => {
    return diet;
  };

  // Scale captions + selectable values for this question, shared by the header strip and
  // each row's slider so positions always agree.
  const scaleLabels: AnswerValueLabel[] = useMemo(() => {
    const routeId = String(params.id);
    const valueLabels =
      routeId === 'diet'
        ? [{ value: '1', answer_text: 'NO' }, { value: '5', answer_text: 'YES' }]
        : getSliderLabelsForQuestion(question?.question_number, question?.answers || []);

    if (valueLabels.length === 0) return DEFAULT_SCALE_LABELS;

    const overrides = SCALE_TEXT_OVERRIDES[routeId];
    if (!overrides) return valueLabels;

    return valueLabels.map(label => ({
      value: label.value,
      answer_text: overrides[Number(label.value)] || '',
    }));
  }, [params.id, question]);

  
  // For habits page (question 7) - 3 questions + importance
  const [habitsQuestions, setHabitsQuestions] = useState<Array<{
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

  useEffect(() => {
    const userIdParam = searchParams.get('user_id');
    const ethnicityParam = searchParams.get('ethnicity');
    const educationParam = searchParams.get('education');
    const dietParam = searchParams.get('diet');
    const nextQuestionParam = searchParams.get('next_question');
    const questionNumberParam = searchParams.get('question_number');
    const questionDataParam = searchParams.get('question_data');
    const contextParam = searchParams.get('context');
    const questionId = params.id as string;

    // Get userId from URL params first, then try localStorage as fallback
    if (userIdParam) {
      setUserId(userIdParam);
    } else {
      const storedUserId = localStorage.getItem('user_id');
      if (storedUserId) {
        setUserId(storedUserId);
      }
    }

    // Handle special case for ethnicity questions - HARDCODED DATA
    if (questionId === 'ethnicity' && ethnicityParam && questionNumberParam) {
      // Hardcoded question IDs from Django database (question_number=3)
      const questionIds = {
        White: 'ee193abd-92ab-4808-8d18-40eef117142c',        // Group 1: White
        Black: '99b0deb7-8d11-4e89-8b08-e48bb7cffa9a',        // Group 2: Black
        Native: '473dd873-c249-4426-a1f0-7368d5604888',       // Group 3: Native
        Hispanic: 'ee1136e8-d7fa-4d5f-905b-09d3e85f38a7',    // Group 4: Hispanic
        Asian: 'a135b6e5-7b85-4122-9218-d0093881646c',        // Group 5: Asian
        Other: '2ef95f1a-3b2f-48f5-adb6-1c31d89ed904'         // Group 6: Other
      };

      // Get ethnicity display name
      const getEthnicityDisplayName = (ethnicity: string) => {
        const displayNames = {
          White: 'White',
          Black: 'Black or African Descent',
          Native: 'Native American',
          Hispanic: 'Hispanic/Latino',
          Asian: 'Asian',
          Other: 'Other'
        };
        return displayNames[ethnicity as keyof typeof displayNames] || ethnicity;
      };

      // Create hardcoded question data
      const hardcodedQuestion = {
        id: questionIds[ethnicityParam as keyof typeof questionIds],
        question_name: ethnicityParam,
        question_number: 3,
        group_number: Object.keys(questionIds).indexOf(ethnicityParam) + 1,
        group_name: 'Ethnicity',
        text: `How strongly do you identify as ${getEthnicityDisplayName(ethnicityParam).toLowerCase()}?`,
        answers: [{ value: '1', answer_text: 'Less' }, { value: '2', answer_text: '' }, { value: '3', answer_text: '' }, { value: '4', answer_text: '' }, { value: '5', answer_text: 'More' }],
        open_to_all_me: false,
        open_to_all_looking_for: true
      };
      setQuestion(hardcodedQuestion);
    } else if (questionId === 'education' && educationParam && questionNumberParam) {
      // Create hardcoded question object for education
      const hardcodedQuestion = {
        id: educationQuestionIds[educationParam as keyof typeof educationQuestionIds],
        question_name: educationParam,
        question_number: parseInt(questionNumberParam),
        group_name: 'Education',
        text: `How much of ${getEducationDisplayName(educationParam)} degree have you completed?`,
        answers: [
          { value: '1', answer_text: 'LESS' },
          { value: '3', answer_text: 'SOME' },
          { value: '5', answer_text: 'MORE' }
        ],
        open_to_all_me: false,
        open_to_all_looking_for: true
      };
      setQuestion(hardcodedQuestion);
    } else if (questionId === 'diet' && dietParam && questionNumberParam) {
      // Create hardcoded question object for diet
      const hardcodedQuestion = {
        id: dietQuestionIds[dietParam as keyof typeof dietQuestionIds],
        question_name: dietParam,
        question_number: parseInt(questionNumberParam),
        group_name: 'Diet',
        text: `Do you identify as a ${getDietDisplayName(dietParam).toLowerCase()}?`,
        answers: [
          { value: '1', answer_text: 'NO' },
          { value: '2', answer_text: '' },
          { value: '3', answer_text: '' },
          { value: '4', answer_text: '' },
          { value: '5', answer_text: 'YES' }
        ],
        open_to_all_me: false,
        open_to_all_looking_for: true
      };
      setQuestion(hardcodedQuestion);

      // Set initial slider values to 5 (YES) for diet questions (only if no existing answer was passed)
      if (!initialEa) {
        setMeAnswer(5);
        setLookingForAnswer(5);
      }
    } else if (questionId === '6') {
      // Create hardcoded question object for exercise
      const hardcodedQuestion = {
        id: exerciseQuestionId,
        question_name: 'Exercise',
        question_number: 6,
        group_name: 'Exercise',
        text: 'How frequently do you exercise?',
        answers: [
          { value: '1', answer_text: 'Never' },
          { value: '2', answer_text: 'Rarely' },
          { value: '3', answer_text: 'Sometimes' },
          { value: '4', answer_text: 'Regularly' },
          { value: '5', answer_text: 'Daily' }
        ],
        open_to_all_me: false,
        open_to_all_looking_for: true
      };
      setQuestion(hardcodedQuestion);
    } else if (questionId === '8') {
      // Create hardcoded question object for religion
      const hardcodedQuestion = {
        id: '66545c20-b2df-4e26-80fc-756a54cd51f3',
        question_name: 'Religion',
        question_number: 8,
        group_name: 'Religion',
        text: 'How often do you practice religion?',
        answers: [
          { value: '1', answer_text: 'Never' },
          { value: '2', answer_text: 'Rarely' },
          { value: '3', answer_text: 'Sometimes' },
          { value: '4', answer_text: 'Regularly' },
          { value: '5', answer_text: 'Daily' }
        ],
        open_to_all_me: false,
        open_to_all_looking_for: true
      };
      setQuestion(hardcodedQuestion);
    } else if (questionId === '9') {
      // Create hardcoded question object for politics
      const hardcodedQuestion = {
        id: 'dde017cd-7065-4ac0-9413-cac7e155e93e',
        question_name: 'Politics',
        question_number: 9,
        group_name: 'Politics',
        text: 'How important is politics in your life?',
        answers: [
          { value: '1', answer_text: 'Uninvolved' },
          { value: '2', answer_text: 'Observant' },
          { value: '3', answer_text: 'Active' },
          { value: '4', answer_text: 'Fervent' },
          { value: '5', answer_text: 'Radical' }
        ],
        open_to_all_me: false,
        open_to_all_looking_for: true
      };
      setQuestion(hardcodedQuestion);
    } else if (questionId === 'next-question' && nextQuestionParam && questionNumberParam) {
      // Use passed question data if available, otherwise fetch
      if (questionDataParam) {
        try {
          const parsedQuestionData = JSON.parse(questionDataParam);
          setQuestion(parsedQuestionData);
        } catch (error) {
          fetchNextQuestion(nextQuestionParam, parseInt(questionNumberParam));
        }
      } else {
        fetchNextQuestion(nextQuestionParam, parseInt(questionNumberParam));
      }
    } else if (questionId && questionId !== 'ethnicity' && questionId !== 'education' && questionId !== 'diet' && questionId !== '6' && questionId !== '8' && questionId !== '9' && questionId !== 'next-question') {
      // Use passed question data if available, otherwise fetch the specific question by ID
      if (questionDataParam) {
        try {
          const parsedQuestionData = JSON.parse(questionDataParam);
          setQuestion(parsedQuestionData);
        } catch (error) {
          fetchQuestion(questionId);
        }
      } else {
        fetchQuestion(questionId);
      }
    }
  }, [params.id, searchParams]);

  useEffect(() => {
    setExcludedAnswerValues(prev => normalizeExcludedValues(prev, allowedExclusionValues, blockedExclusionValues));
  }, [allowedExclusionValues, blockedExclusionValues]);

  // Fetch habits questions in background when userId is available
  useEffect(() => {
    if (userId) {
      fetchHabitsQuestions();
    }
  }, [userId]);

  // Load existing answer and "required for me" when userId and question are set.
  // Uses a ref-based counter instead of cleanup-based cancelled flag to survive
  // React strict mode's unmount/remount cycle.
  useEffect(() => {
    if (!userId || !question?.id) return;
    const currentFetchId = ++answerFetchIdRef.current;
    const qId = question.id;

    (async () => {
      try {
        const [answerRes, reqRes] = await Promise.all([
          fetch(
            // user_id marks the requester as the author so their own me_note is returned
            `${getApiUrl(API_ENDPOINTS.ANSWERS)}?user=${encodeURIComponent(userId)}&user_id=${encodeURIComponent(userId)}&page_size=100`,
            { headers: { 'Content-Type': 'application/json' } }
          ),
          fetch(
            `${getApiUrl(API_ENDPOINTS.USER_REQUIRED_QUESTIONS)}?user=${encodeURIComponent(userId)}&page_size=200`,
            { headers: { 'Content-Type': 'application/json' } }
          )
        ]);

        // If a newer fetch was started, discard this result
        if (currentFetchId !== answerFetchIdRef.current) return;

        if (answerRes.ok) {
          const answerData = await answerRes.json();
          const allAnswers = answerData.results || [];
          const existing = allAnswers.find((a: any) => {
            const aQId = typeof a.question === 'object' ? a.question.id : a.question;
            return aQId === qId;
          });
          if (existing && currentFetchId === answerFetchIdRef.current) {
            setMeAnswer(existing.me_open_to_all ? 3 : existing.me_answer || 3);
            setLookingForAnswer(existing.looking_for_open_to_all ? 3 : existing.looking_for_answer || 3);
            setImportance({
              me: existing.me_importance || 1,
              lookingFor: existing.looking_for_importance || 3,
            });
            setOpenToAll({
              meOpen: existing.me_open_to_all || false,
              lookingForOpen: existing.looking_for_open_to_all || false,
            });
            setExcludedAnswerValues(normalizeExcludedValues(
              existing.excluded_answer_values,
              allowedExclusionValues,
              existing.me_open_to_all ? [] : [existing.me_answer || 3]
            ));
            setMeShare(existing.me_share !== false);
            setAnswerNote(existing.me_note || '');
          } else if (!initialEa && currentFetchId === answerFetchIdRef.current) {
            setOpenToAll(prev => ({
              ...prev,
              meOpen: false,
              lookingForOpen: false,
            }));
            setExcludedAnswerValues([]);
            setAnswerNote('');
          }
        }

        if (reqRes.ok && currentFetchId === answerFetchIdRef.current) {
          const data = await reqRes.json();
          const results = data.results ?? [];
          const requiredIds = new Set(results.map((r: { question_id: string }) => r.question_id));
          setMeRequired(requiredIds.has(qId));
        }
      } catch (_) {
        if (currentFetchId === answerFetchIdRef.current) setMeRequired(false);
      }
    })();
    // No cleanup — staleness is detected via the ref counter
  }, [userId, question?.id, question?.open_to_all_looking_for, question?.question_number, initialEa, allowedExclusionValues]);

  const fetchQuestion = async (questionId: string) => {
    setLoadingQuestion(true);
    try {
      const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}${questionId}/`;
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        setQuestion(data);
      } else {
        setError('Failed to load question');
      }
    } catch (error: unknown) {
      setError('Failed to load question');
    } finally {
      setLoadingQuestion(false);
    }
  };

  const fetchEthnicityQuestion = async (ethnicity: string, questionNumber: number) => {
    setLoadingQuestion(true);
    try {
      // Fetch all ethnicity questions and find the specific one
      const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=${questionNumber}`;
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          // Find the specific ethnicity question by matching the ethnicity name exactly
          const specificQuestion = data.results.find((q: { question_name: string }) => 
            q.question_name === ethnicity
          );
          
          if (specificQuestion) {
            setQuestion(specificQuestion);
          } else {
            setError(`No ethnicity question found for ${ethnicity}`);
          }
        } else {
          setError(`No ethnicity question ${questionNumber} found`);
        }
      } else {
        setError('Failed to load ethnicity question');
      }
    } catch (error: unknown) {
      setError('Failed to load ethnicity question');
    } finally {
      setLoadingQuestion(false);
    }
  };

  const fetchEducationQuestion = async (education: string, questionNumber: number) => {
    setLoadingQuestion(true);
    try {
      // Fetch all education questions and find the specific one
      const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=${questionNumber}`;
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          // Find the specific education question by matching the education name exactly
          const specificQuestion = data.results.find((q: { question_name: string }) => 
            q.question_name === education
          );
          
          if (specificQuestion) {
            setQuestion(specificQuestion);
          } else {
            setError(`No education question found for ${education}`);
          }
        } else {
          setError(`No education question ${questionNumber} found`);
        }
      } else {
        setError('Failed to load education question');
      }
    } catch (error: unknown) {
      setError('Failed to load education question');
    } finally {
      setLoadingQuestion(false);
    }
  };

  const fetchDietQuestion = async (diet: string, questionNumber: number) => {
    setLoadingQuestion(true);
    try {
      // Fetch all diet questions and find the specific one
      const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=${questionNumber}`;
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          // Find the specific diet question by matching the diet name exactly
          const specificQuestion = data.results.find((q: { question_name: string }) => 
            q.question_name === diet
          );
          
          if (specificQuestion) {
            setQuestion(specificQuestion);
          } else {
            setError(`No diet question found for ${diet}`);
          }
        } else {
          setError(`No diet question ${questionNumber} found`);
        }
      } else {
        setError('Failed to load diet question');
      }
    } catch (error: unknown) {
      setError('Failed to load diet question');
    } finally {
      setLoadingQuestion(false);
    }
  };

  const fetchNextQuestion = async (nextQuestion: string, questionNumber: number) => {
    setLoadingQuestion(true);
    try {
      // Fetch all next questions and find the specific one
      const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=${questionNumber}`;
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          // Find the specific next question by matching the question name exactly
          const specificQuestion = data.results.find((q: { question_name: string }) => 
            q.question_name === nextQuestion
          );
          
          if (specificQuestion) {
            setQuestion(specificQuestion);
          } else {
            setError(`No next question found for ${nextQuestion}`);
          }
        } else {
          setError(`No next question ${questionNumber} found`);
        }
      } else {
        setError('Failed to load next question');
      }
    } catch (error: unknown) {
      setError('Failed to load next question');
    } finally {
      setLoadingQuestion(false);
    }
  };

  const fetchHabitsQuestions = async () => {
    // Fetch habits questions in the background
    if (userId && habitsQuestions.length === 0) {
      try {
        const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=7`;
        const response = await fetch(apiUrl);
        
        if (response.ok) {
          const data = await response.json();
          
          // Sort questions by group_number
          const sortedHabitsQuestions = (data.results || []).sort((a: typeof habitsQuestions[0], b: typeof habitsQuestions[0]) => {
            const groupA = a.group_number || 0;
            const groupB = b.group_number || 0;
            return groupA - groupB;
          });
          
          setHabitsQuestions(sortedHabitsQuestions);
        }
      } catch (error: unknown) {
        // Silently fail - habits page will fetch normally if needed
      }
    }
  };

  const getProgressPercentage = () => {
    if (!question) return 60; // default fallback
    
    // Progressive onboarding steps:
    // Relationship (1): 10%
    // Gender (2): 20%
    // Ethnicity (3): 30%
    // Education (4): 40%
    // Diet (5): 50%
    // Exercise (6): 60%
    // Habits (7): 70%
    // Religion (8): 80%
    // Politics (9): 90%
    // Kids (10): 100%
    
    const progressMap: { [key: number]: number } = {
      1: 10,  // Relationship
      2: 20,  // Gender
      3: 30,  // Ethnicity
      4: 40,  // Education
      5: 50,  // Diet
      6: 60,  // Exercise
      7: 70,  // Habits
      8: 80,  // Religion
      9: 90,  // Politics
      10: 100 // Kids
    };
    
    return progressMap[question.question_number] || 60;
  };

  const handleSliderChange = (section: 'meAnswer' | 'lookingForAnswer' | 'importance', value: number) => {
    if (section === 'meAnswer') {
      setMeAnswer(value);
    } else if (section === 'lookingForAnswer') {
      setLookingForAnswer(value);
    } else if (section === 'importance') {
      // For importance, we need to know which section (me or lookingFor)
      // This will be handled by the individual importance sliders
    }
  };

  const handleOpenToAllToggle = (switchType: 'meOpen' | 'lookingForOpen') => {
    setOpenToAll(prev => ({ ...prev, [switchType]: !prev[switchType] }));
  };

  const handleNext = async () => {
    
    if (!userId || !question) {
      setError('User ID and question are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // IMMEDIATELY save to localStorage for instant UI feedback
      const answeredQuestionsKey = `answered_questions_${userId}`;
      const existingAnswered = JSON.parse(localStorage.getItem(answeredQuestionsKey) || '[]');
      if (!existingAnswered.includes(question.id)) {
        existingAnswered.push(question.id);
        localStorage.setItem(answeredQuestionsKey, JSON.stringify(existingAnswered));
      }

      // Prepare user answer (is_required_for_me is per-user; me_importance is separate)
      const userAnswer = {
        user_id: userId,
        question_id: question.id,
        me_answer: openToAll.meOpen ? 6 : meAnswer,
        me_open_to_all: openToAll.meOpen,
        me_importance: importance.me,
        me_share: meShare,
        looking_for_answer: openToAll.lookingForOpen ? 6 : lookingForAnswer,
        looking_for_open_to_all: openToAll.lookingForOpen,
        looking_for_importance: importance.lookingFor,
        looking_for_share: true,
        excluded_answer_values: normalizeExcludedValues(excludedAnswerValues, allowedExclusionValues, blockedExclusionValues),
        me_note: answerNote,
        is_required_for_me: meRequired
      };
      // For ethnicity questions, save in background without blocking UI
      const saveAnswerInBackground = async () => {
        try {

          const response = await fetch(getApiUrl(API_ENDPOINTS.ANSWERS), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userAnswer)
          });
          if (!response.ok) {
            const errorText = await response.text();
          } else {
            const responseData = await response.json();
          }
        } catch (error) {
        }
      };

      if (params.id === 'ethnicity') {
        saveAnswerInBackground();
      } else if (params.id === 'education') {
        saveAnswerInBackground();
      } else if (params.id === 'diet') {
        saveAnswerInBackground();
      } else if (params.id === '6') {
        saveAnswerInBackground();
      } else if (params.id === '8') {
        saveAnswerInBackground();
      } else if (params.id === '9') {
        saveAnswerInBackground();
      } else {
        // For other questions, save synchronously as before
      const response = await fetch(getApiUrl(API_ENDPOINTS.ANSWERS), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userAnswer)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save answer');
        }
      }

      // Check if we're in profile context or coming from questions page
      const contextParam = searchParams.get('context');
      const fromQuestionsPage = searchParams.get('from_questions_page');
      if (contextParam === 'profile') {
        // Navigate back to profile questions page when in profile context
        router.push('/profile/questions');
      } else if (fromQuestionsPage === 'true') {
        // Return to questions page with refresh flag
        router.push('/questions?refresh=true');
      } else {
        // Normal onboarding flow
        // For ethnicity questions, go back to ethnicity page; for education questions, go back to education page; for diet questions, go back to diet page; for next questions, go back to next question page; otherwise go to dashboard
        if (params.id === 'ethnicity') {
          // Save answered ethnicity to localStorage for immediate UI feedback
          const answeredEthnicitiesKey = getUserStorageKey('answeredEthnicities');
          const answeredEthnicitiesData = answeredEthnicitiesKey
            ? localStorage.getItem(answeredEthnicitiesKey)
            : null;
          let answeredEthnicities = [];
          if (answeredEthnicitiesData) {
            try {
              answeredEthnicities = JSON.parse(answeredEthnicitiesData);
            } catch (error) {
              answeredEthnicities = [];
            }
          }
          
          const ethnicityParam = searchParams.get('ethnicity');
          if (ethnicityParam && !answeredEthnicities.includes(ethnicityParam)) {
            answeredEthnicities.push(ethnicityParam);
            if (answeredEthnicitiesKey) {
              localStorage.setItem(answeredEthnicitiesKey, JSON.stringify(answeredEthnicities));
            }
          }

          const params = new URLSearchParams({
            user_id: userId
          });
          router.push(`/auth/ethnicity?${params.toString()}`);
        } else if (params.id === 'education') {
          
          // Save answered education to localStorage for immediate UI feedback
          const answeredEducationsKey = getUserStorageKey('answeredEducations');
          const answeredEducationsData = answeredEducationsKey
            ? localStorage.getItem(answeredEducationsKey)
            : null;
          let answeredEducations = [];
          if (answeredEducationsData) {
            try {
              answeredEducations = JSON.parse(answeredEducationsData);
            } catch (error) {
              answeredEducations = [];
            }
          }
          
          const educationParam = searchParams.get('education');
          if (educationParam && !answeredEducations.includes(educationParam)) {
            answeredEducations.push(educationParam);
            if (answeredEducationsKey) {
              localStorage.setItem(answeredEducationsKey, JSON.stringify(answeredEducations));
            }
          }

          const params = new URLSearchParams({
            user_id: userId
          });
          router.push(`/auth/education?${params.toString()}`);
        } else if (params.id === 'diet') {
          
          // Save answered diet to localStorage for immediate UI feedback
          const answeredDietsKey = getUserStorageKey('answeredDiets');
          const answeredDietsData = answeredDietsKey
            ? localStorage.getItem(answeredDietsKey)
            : null;
          let answeredDiets = [];
          if (answeredDietsData) {
            try {
              answeredDiets = JSON.parse(answeredDietsData);
            } catch (error) {
              answeredDiets = [];
            }
          }
          
          const dietParam = searchParams.get('diet');
          if (dietParam && !answeredDiets.includes(dietParam)) {
            answeredDiets.push(dietParam);
            if (answeredDietsKey) {
              localStorage.setItem(answeredDietsKey, JSON.stringify(answeredDiets));
            }
          }

          const params = new URLSearchParams({
            user_id: userId
          });
          router.push(`/auth/diet?${params.toString()}`);
        } else if (params.id === '6') {
          // Track question 6 as answered for introcard routing
          try {
            const lsKey = `onboarding_answered_numbers_${userId}`;
            const existing: number[] = JSON.parse(localStorage.getItem(lsKey) || '[]');
            if (!existing.includes(6)) { existing.push(6); localStorage.setItem(lsKey, JSON.stringify(existing)); }
          } catch {}

          // Navigate to habits page (next in onboarding flow)
          posthog.capture('onboarding_step_completed', { step: 'exercise', question_number: 6 });
          const params = new URLSearchParams({
            user_id: userId
          });
          router.push(`/auth/habits?${params.toString()}`);
        } else if (params.id === '8') {
          // Track question 8 as answered for introcard routing
          try {
            const lsKey = `onboarding_answered_numbers_${userId}`;
            const existing: number[] = JSON.parse(localStorage.getItem(lsKey) || '[]');
            if (!existing.includes(8)) { existing.push(8); localStorage.setItem(lsKey, JSON.stringify(existing)); }
          } catch {}

          // Navigate to politics page (next in onboarding flow)
          posthog.capture('onboarding_step_completed', { step: 'religion', question_number: 8 });
          const params = new URLSearchParams({
            user_id: userId
          });
          router.push(`/auth/question/9?${params.toString()}`);
        } else if (params.id === '9') {
          // Track question 9 as answered for introcard routing
          try {
            const lsKey = `onboarding_answered_numbers_${userId}`;
            const existing: number[] = JSON.parse(localStorage.getItem(lsKey) || '[]');
            if (!existing.includes(9)) { existing.push(9); localStorage.setItem(lsKey, JSON.stringify(existing)); }
          } catch {}

          // Navigate to kids page (next in onboarding flow)
          posthog.capture('onboarding_step_completed', { step: 'politics', question_number: 9 });
          const params = new URLSearchParams({
            user_id: userId
          });
          router.push(`/auth/kids?${params.toString()}`);
        } else if (params.id === 'next-question') {
          const params = new URLSearchParams({
            user_id: userId
          });

          // If we have habits questions loaded, pass them to avoid re-fetching
          if (habitsQuestions.length > 0) {
            params.set('questions', JSON.stringify(habitsQuestions));
          }

          router.push(`/auth/habits?${params.toString()}`);
        } else {
          router.push('/dashboard');
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save answer');
    } finally {
      setLoading(false);
    }
  };

  const formatEthnicityLabel = (ethnicity: string | null): string => {
    if (!ethnicity) return 'ANSWER';
    
    const labels: { [key: string]: string } = {
      'white': 'WHITE',
      'black': 'BLACK',
      'pacific_islander': 'PACIFIC ISLANDER',
      'native_american': 'NATIVE AMERICAN',
      'hispanic_latino': 'HISPANIC/LATINO',
      'asian': 'ASIAN',
      'other': 'OTHER'
    };
    
    return labels[ethnicity] || ethnicity.toUpperCase();
  };

  const handleBack = () => {
    // Check if we're in profile context or coming from questions page
    const contextParam = searchParams.get('context');
    const fromQuestionsPage = searchParams.get('from_questions_page');

    if (contextParam === 'profile') {
      // Navigate back to profile questions page
      router.push('/profile/questions');
    } else if (fromQuestionsPage === 'true') {
      // Return to questions page
      router.push('/questions');
    } else {
      // Normal onboarding flow
      const urlParams = new URLSearchParams({
        user_id: userId,
        refresh: 'true'  // Add refresh parameter to trigger answered questions check
      });

      if (params.id === 'next-question' || params.id === '6') {
        // Question 6 (exercise) goes back to question 5 (diet)
        router.push(`/auth/diet?${urlParams.toString()}`);
      } else if (params.id === 'diet') {
        router.push(`/auth/education?${urlParams.toString()}`);
      } else if (params.id === 'education') {
        router.push(`/auth/ethnicity?${urlParams.toString()}`);
      } else if (params.id === '8') {
        // Question 8 (religion) goes back to question 7 (habits)
        router.push(`/auth/habits?${urlParams.toString()}`);
      } else if (params.id === '9') {
        // Question 9 (politics) goes back to question 8 (religion)
        router.push(`/auth/question/8?${urlParams.toString()}`);
      } else {
        router.push(`/auth/ethnicity?${urlParams.toString()}`);
      }
    }
  };

  if (loadingQuestion) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#672DB7] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading question...</p>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Question not found</p>
          <button 
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-black text-white rounded-md"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const rowLabel =
    params.id === 'ethnicity' ? formatEthnicityLabel(searchParams.get('ethnicity')) :
    params.id === 'education' ? getEducationDisplayName(searchParams.get('education') || '').toUpperCase() :
    params.id === 'diet' ? getDietDisplayName(searchParams.get('diet') || '').toUpperCase() :
    params.id === '8' ? 'RELIGION' :
    params.id === '9' ? 'LEFT' :
    (question?.question_name || 'ANSWER').toUpperCase();

  const showProgress =
    searchParams.get('context') !== 'profile' && searchParams.get('from_questions_page') !== 'true';
  const lookingOtaAllowed = questionAllowsLookingOta(question);
  const meOtaAllowed = Boolean(question.open_to_all_me);
  // Mandatory questions (1–10) split into several named rows — FEMALE/MALE, ALCOHOL/
  // TOBACCO — so each row needs its caption. Everything above 10 is a single row whose
  // caption just repeats the heading, so the row caption is dropped.
  const hideQuestionRowLabel = Number(question.question_number) > 10;

  return (
    <OnboardingShell
      progressPercent={showProgress ? getProgressPercentage() : null}
      onBack={handleBack}
      onNext={handleNext}
      nextLabel={searchParams.get('from_questions_page') === 'true' ? 'Save' : 'Next'}
      loadingLabel="Saving..."
      loading={loading}
      questionNote={answerNote}
      onQuestionNoteChange={setAnswerNote}
    >
      <div className="mx-auto w-full min-w-0 max-w-[100%] sm:max-w-[640px] md:max-w-[630px] lg:max-w-[792px]">
        <OnboardingTitle
          step={
            params.id === 'ethnicity' ? `${question?.question_number || 3}. Ethnicity` :
            params.id === 'education' ? '4. Education' :
            params.id === 'diet' ? `${question?.question_number || 5}. Diet` :
            params.id === '6' ? '6. Exercise' :
            params.id === '8' ? '8. Religion' :
            params.id === '9' ? '9. Politics' :
            params.id === 'next-question' ? `${question?.question_number || 6}. ${question?.question_name || 'Next Question'}` :
            question?.question_number ? `${question.question_number}. ${question.group_name || question.question_name}` : 'Loading...'
          }
          question={
            params.id === '8' ? 'How often do you practice religion?' :
            params.id === '9' ? 'How important is politics in your life?' :
            params.id === 'education' ? 'What is your highest level of education?' :
            question?.text || 'What ethnicity do you identify with?'
          }
        >
          {/* Share Answer and Required switches - Only show for non-mandatory questions (question_number > 10) */}
          {question && question.question_number > 10 && (
            <div className="mb-4 flex w-full items-center justify-between gap-3 sm:mb-8">
              {/* Required For Match - Left */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setMeRequired(!meRequired)}
                  className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none"
                  style={{ backgroundColor: meRequired ? '#000000' : '#ADADAD' }}
                >
                  <span
                    className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
                    style={{ transform: meRequired ? 'translateX(20px)' : 'translateX(2px)' }}
                  />
                </button>
                <span className="text-xs text-black sm:text-sm">Required For Match</span>
              </div>

              {/* Share Answer - Right */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setMeShare(!meShare)}
                  className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none"
                  style={{ backgroundColor: meShare ? '#000000' : '#ADADAD' }}
                >
                  <span
                    className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
                    style={{ transform: meShare ? 'translateX(20px)' : 'translateX(2px)' }}
                  />
                </button>
                <span className="text-xs text-black sm:text-sm">Share Answer</span>
              </div>
            </div>
          )}
        </OnboardingTitle>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded border border-red-400 bg-red-100 p-3 text-red-700">
            {error}
          </div>
        )}

        {/* Looking For Section */}
        <div className="mb-2 sm:mb-6">
          <h3 className="-mb-2 text-center text-lg font-bold text-black sm:mb-1 sm:text-2xl">
            Them
          </h3>

          <AnswerScaleHeader labels={scaleLabels} showOta={lookingOtaAllowed} className="mb-2" />

          <div className="space-y-1 sm:space-y-3">
            <AnswerSliderRow
              label={rowLabel}
              hideRowLabel={hideQuestionRowLabel}
              labels={scaleLabels}
              value={lookingForAnswer}
              onChange={(value) => handleSliderChange('lookingForAnswer', value)}
              showOta={lookingOtaAllowed}
              otaChecked={openToAll.lookingForOpen}
              onOtaToggle={() => handleOpenToAllToggle('lookingForOpen')}
              showExclude
              excludedValues={excludedAnswerValues}
              allowedExclusionValues={allowedExclusionValues}
              blockedExclusionValues={blockedExclusionValues}
              onExcludedValuesChange={(values) =>
                setExcludedAnswerValues(normalizeExcludedValues(values, allowedExclusionValues, blockedExclusionValues))
              }
            />

            <div className="hidden sm:block">
              <AnswerSliderRow
                label="IMPORTANCE"
                labels={IMPORTANCE_LABELS}
                value={importance.lookingFor}
                onChange={(value) => setImportance(prev => ({ ...prev, lookingFor: value }))}
                isImportance
                showActiveLabelBelow
              />
            </div>
          </div>
        </div>

        {/* Me Section */}
        <div className="mb-2 pt-1 sm:mb-6 sm:pt-8">
          <h3 className="-mb-2 text-center text-lg font-bold sm:mb-1 sm:text-2xl">Me</h3>

          <AnswerScaleHeader labels={scaleLabels} showOta={meOtaAllowed} className="mb-2" />

          <AnswerSliderRow
            label={rowLabel}
            hideRowLabel={hideQuestionRowLabel}
            labels={scaleLabels}
            value={meAnswer}
            onChange={(value) => handleSliderChange('meAnswer', value)}
            showOta={meOtaAllowed}
            otaChecked={openToAll.meOpen}
            onOtaToggle={() => handleOpenToAllToggle('meOpen')}
            showNote
            note={answerNote}
            onNoteChange={setAnswerNote}
          />
        </div>

        {/* Importance Section — mobile only; desktop keeps the existing row layout. */}
        <div className="mb-2 pt-1 sm:hidden">
          <h3 className="-mb-2 text-center text-lg font-bold">Importance</h3>

          <AnswerSliderRow
            label="IMPORTANCE"
            labels={IMPORTANCE_LABELS}
            value={importance.lookingFor}
            onChange={(value) => setImportance(prev => ({ ...prev, lookingFor: value }))}
            isImportance
            hideRowLabel
          />
        </div>
      </div>
    </OnboardingShell>
  );
}
