'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
import HamburgerMenu from '@/components/HamburgerMenu';

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
    answers: Array<{ value: string; answer_text: string }>;
    open_to_all_me: boolean;
    open_to_all_looking_for: boolean;
  } | null>(null);

  // Question answer states
  const [meAnswer, setMeAnswer] = useState(3);
  const [lookingForAnswer, setLookingForAnswer] = useState(3);
  const [importance, setImportance] = useState({
    me: 1,
    lookingFor: 3
  });
  const [openToAll, setOpenToAll] = useState({
    meOpen: false,
    lookingForOpen: false
  });
  const [meShare, setMeShare] = useState(true);
  const [meRequired, setMeRequired] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [error, setError] = useState<string>('');

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

  // Helper function to render ALL answer labels at the top
  const renderTopLabels = () => {
    // For ethnicity questions, always show LESS and MORE
    if (params.id === 'ethnicity') {
      return (
        <div className="flex justify-between text-xs text-gray-500">
          <span>LESS</span>
          <span>MORE</span>
        </div>
      );
    }
    
    // For education questions, show NONE, SOME, COMPLETED
    if (params.id === 'education') {
      return (
        <div className="relative text-xs text-gray-500 w-full" style={{ height: '14px' }}>
          <span className="absolute text-left" style={{ left: '0' }}>NONE</span>
          <span className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>SOME</span>
          <span className="absolute text-right" style={{ right: '0' }}>COMPLETED</span>
        </div>
      );
    }
    
    // For diet questions, show NO and YES
    if (params.id === 'diet') {
      return (
        <div className="flex justify-between text-xs text-gray-500">
          <span>NO</span>
          <span>YES</span>
        </div>
      );
    }
    
    // For religion questions, show NEVER, RARELY, SOMETIMES, REGULARLY, DAILY
    if (params.id === '8') {
      return (
        <div className="relative text-xs text-gray-500 w-full" style={{ height: '14px' }}>
          <span className="absolute" style={{ left: '14px', transform: 'translateX(-50%)' }}>NEVER</span>
          <span className="absolute" style={{ left: '25%', transform: 'translateX(-50%)' }}>RARELY</span>
          <span className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>SOMETIMES</span>
          <span className="absolute" style={{ left: '75%', transform: 'translateX(-50%)' }}>REGULARLY</span>
          <span className="absolute" style={{ left: 'calc(100% - 14px)', transform: 'translateX(-50%)' }}>DAILY</span>
        </div>
      );
    }
    
    // For politics questions, show UNINVOLVED, OBSERVANT, ACTIVE, FERVENT, RADICAL
    if (params.id === '9') {
      return (
        <div className="relative text-xs text-gray-500 w-full" style={{ height: '14px' }}>
          <span className="absolute" style={{ left: '14px', transform: 'translateX(-50%)' }}>UNINVOLVED</span>
          <span className="absolute" style={{ left: '25%', transform: 'translateX(-50%)' }}>OBSERVANT</span>
          <span className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>ACTIVE</span>
          <span className="absolute" style={{ left: '75%', transform: 'translateX(-50%)' }}>FERVENT</span>
          <span className="absolute" style={{ left: 'calc(100% - 14px)', transform: 'translateX(-50%)' }}>RADICAL</span>
        </div>
      );
    }
    
    if (!question?.answers || question.answers.length === 0) {
      return (
        <div className="flex justify-between text-xs text-gray-500">
          <span>LESS</span>
          <span>MORE</span>
        </div>
      );
    }
    
    const sortedAnswers = question.answers.sort((a, b) => parseInt(a.value) - parseInt(b.value));
    
    return (
      <div className="relative text-xs text-gray-500 w-full" style={{ height: '14px' }}>
        {sortedAnswers.map((answer, index) => {
          const value = parseInt(answer.value);
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
              {answer.answer_text.toUpperCase()}
            </span>
          );
        })}
      </div>
    );
  };

  const ToggleControl = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <label className="flex items-center cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <div className={`block w-11 h-6 rounded-full ${checked ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
        <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${checked ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
      </div>
    </label>
  );

  
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
    
    console.log('🔍 Question Page Load - URL Params:', {
      userIdParam,
      ethnicityParam,
      educationParam,
      dietParam,
      nextQuestionParam,
      questionNumberParam,
      questionDataParam: questionDataParam ? 'present' : 'missing',
      questionId
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
    
    // Handle special case for ethnicity questions - HARDCODED DATA
    if (questionId === 'ethnicity' && ethnicityParam && questionNumberParam) {
      // Hardcoded question IDs from Django database (question_number=3)
      const questionIds = {
        White: 'ee193abd-92ab-4808-8d18-40eef117142c',        // Group 1: White
        Black: '99b0deb7-8d11-4e89-8b08-e48bb7cffa9a',        // Group 2: Black
        Hawaiian: '2ef95f1a-3b2f-48f5-adb6-1c31d89ed904',     // Group 3: Hawaiian
        Native: '473dd873-c249-4426-a1f0-7368d5604888',       // Group 4: Native
        Hispanic: 'ee1136e8-d7fa-4d5f-905b-09d3e85f38a7',    // Group 5: Hispanic
        Asian: 'a135b6e5-7b85-4122-9218-d0093881646c'         // Group 6: Asian
      };

      // Get ethnicity display name
      const getEthnicityDisplayName = (ethnicity: string) => {
        const displayNames = {
          White: 'White',
          Black: 'Black or African Descent',
          Hawaiian: 'Native Hawaiian or Other Pacific Islander',
          Native: 'Native American',
          Hispanic: 'Hispanic/Latino',
          Asian: 'Asian'
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
        answers: [{ value: '1', answer_text: '1' }, { value: '2', answer_text: '2' }, { value: '3', answer_text: '3' }, { value: '4', answer_text: '4' }, { value: '5', answer_text: '5' }],
        open_to_all_me: false,
        open_to_all_looking_for: true
      };

      console.log('📋 Using hardcoded ethnicity question data:', hardcodedQuestion);
      setQuestion(hardcodedQuestion);
    } else if (questionId === 'education' && educationParam && questionNumberParam) {
      console.log('🎓 Handling education question:', educationParam);
      
      // Create hardcoded question object for education
      const hardcodedQuestion = {
        id: educationQuestionIds[educationParam as keyof typeof educationQuestionIds],
        question_name: educationParam,
        question_number: parseInt(questionNumberParam),
        group_name: 'Education',
        text: `How much of ${getEducationDisplayName(educationParam)} degree have you completed?`,
        answers: [
          { value: '1', answer_text: 'LESS' },
          { value: '2', answer_text: '2' },
          { value: '3', answer_text: 'SOME' },
          { value: '4', answer_text: '4' },
          { value: '5', answer_text: 'MORE' }
        ],
        open_to_all_me: false,
        open_to_all_looking_for: true
      };
      
      console.log('📋 Using hardcoded education question data:', hardcodedQuestion);
      setQuestion(hardcodedQuestion);
    } else if (questionId === 'diet' && dietParam && questionNumberParam) {
      console.log('🥗 Handling diet question:', dietParam);
      
      // Create hardcoded question object for diet
      const hardcodedQuestion = {
        id: dietQuestionIds[dietParam as keyof typeof dietQuestionIds],
        question_name: dietParam,
        question_number: parseInt(questionNumberParam),
        group_name: 'Diet',
        text: `Do you identify as a ${getDietDisplayName(dietParam).toLowerCase()}?`,
        answers: [
          { value: '1', answer_text: 'NO' },
          { value: '2', answer_text: '2' },
          { value: '3', answer_text: '3' },
          { value: '4', answer_text: '4' },
          { value: '5', answer_text: 'YES' }
        ],
        open_to_all_me: false,
        open_to_all_looking_for: true
      };
      
      console.log('📋 Using hardcoded diet question data:', hardcodedQuestion);
      setQuestion(hardcodedQuestion);
      
      // Set initial slider values to 5 (YES) for diet questions
      setMeAnswer(5);
      setLookingForAnswer(5);
    } else if (questionId === '6') {
      console.log('🏃 Handling exercise question');
      
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
      
      console.log('📋 Using hardcoded exercise question data:', hardcodedQuestion);
      setQuestion(hardcodedQuestion);
    } else if (questionId === '8') {
      console.log('🙏 Handling religion question - HARDCODED LOGIC TRIGGERED');
      console.log('🙏 questionId:', questionId);
      console.log('🙏 This should show immediately without any delay');
      
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
      
      console.log('📋 Using hardcoded religion question data:', hardcodedQuestion);
      setQuestion(hardcodedQuestion);
    } else if (questionId === '9') {
      console.log('🗳️ Handling politics question - HARDCODED LOGIC TRIGGERED');
      console.log('🗳️ questionId:', questionId);
      console.log('🗳️ This should show immediately without any delay');
      
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
      
      console.log('📋 Using hardcoded politics question data:', hardcodedQuestion);
      setQuestion(hardcodedQuestion);
    } else if (questionId === 'next-question' && nextQuestionParam && questionNumberParam) {
      console.log('🔍 Handling next-question with params:', { nextQuestionParam, questionNumberParam });
      console.log('⚠️ THIS IS THE PROBLEM - next-question logic is being triggered instead of hardcoded religion logic');
      // Use passed question data if available, otherwise fetch
      if (questionDataParam) {
        try {
          const parsedQuestionData = JSON.parse(questionDataParam);
          console.log('📋 Using passed next question data:', parsedQuestionData);
          setQuestion(parsedQuestionData);
        } catch (error) {
          console.error('❌ Error parsing passed next question data:', error);
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
          console.log('📋 Using passed question data for ID:', questionId, parsedQuestionData);
          setQuestion(parsedQuestionData);
        } catch (error) {
          console.error('❌ Error parsing passed question data:', error);
          fetchQuestion(questionId);
        }
      } else {
        fetchQuestion(questionId);
      }
    }
  }, [params.id, searchParams]);

  // Fetch habits questions in background when userId is available
  useEffect(() => {
    if (userId) {
      fetchHabitsQuestions();
    }
  }, [userId]);

  const fetchQuestion = async (questionId: string) => {
    console.log('🚀 Fetching question:', questionId);
    setLoadingQuestion(true);
    try {
      const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}${questionId}/`;
      console.log('🌐 Fetching from URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Question data:', data);
        setQuestion(data);
      } else {
        console.error('❌ Failed to fetch question. Status:', response.status);
        setError('Failed to load question');
      }
    } catch (error: unknown) {
      console.error('❌ Error fetching question:', error);
      setError('Failed to load question');
    } finally {
      setLoadingQuestion(false);
    }
  };

  const fetchEthnicityQuestion = async (ethnicity: string, questionNumber: number) => {
    console.log('🚀 Fetching ethnicity question for:', ethnicity, 'question number:', questionNumber);
    setLoadingQuestion(true);
    try {
      // Fetch all ethnicity questions and find the specific one
      const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=${questionNumber}`;
      console.log('🌐 Fetching from URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Ethnicity question data:', data);
        if (data.results && data.results.length > 0) {
          // Find the specific ethnicity question by matching the ethnicity name exactly
          const specificQuestion = data.results.find((q: { question_name: string }) => 
            q.question_name === ethnicity
          );
          
          if (specificQuestion) {
            setQuestion(specificQuestion);
            console.log('✅ Found specific ethnicity question:', specificQuestion.question_name);
          } else {
            console.error('❌ No matching ethnicity question found for:', ethnicity);
            setError(`No ethnicity question found for ${ethnicity}`);
          }
        } else {
          setError(`No ethnicity question ${questionNumber} found`);
        }
      } else {
        console.error('❌ Failed to fetch ethnicity question. Status:', response.status);
        setError('Failed to load ethnicity question');
      }
    } catch (error: unknown) {
      console.error('❌ Error fetching ethnicity question:', error);
      setError('Failed to load ethnicity question');
    } finally {
      setLoadingQuestion(false);
    }
  };

  const fetchEducationQuestion = async (education: string, questionNumber: number) => {
    console.log('🚀 Fetching education question for:', education, 'question number:', questionNumber);
    setLoadingQuestion(true);
    try {
      // Fetch all education questions and find the specific one
      const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=${questionNumber}`;
      console.log('🌐 Fetching from URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Education question data:', data);
        if (data.results && data.results.length > 0) {
          // Find the specific education question by matching the education name exactly
          const specificQuestion = data.results.find((q: { question_name: string }) => 
            q.question_name === education
          );
          
          if (specificQuestion) {
            setQuestion(specificQuestion);
            console.log('✅ Found specific education question:', specificQuestion.question_name);
          } else {
            console.error('❌ No matching education question found for:', education);
            setError(`No education question found for ${education}`);
          }
        } else {
          setError(`No education question ${questionNumber} found`);
        }
      } else {
        console.error('❌ Failed to fetch education question. Status:', response.status);
        setError('Failed to load education question');
      }
    } catch (error: unknown) {
      console.error('❌ Error fetching education question:', error);
      setError('Failed to load education question');
    } finally {
      setLoadingQuestion(false);
    }
  };

  const fetchDietQuestion = async (diet: string, questionNumber: number) => {
    console.log('🚀 Fetching diet question for:', diet, 'question number:', questionNumber);
    setLoadingQuestion(true);
    try {
      // Fetch all diet questions and find the specific one
      const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=${questionNumber}`;
      console.log('🌐 Fetching from URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Diet question data:', data);
        if (data.results && data.results.length > 0) {
          // Find the specific diet question by matching the diet name exactly
          const specificQuestion = data.results.find((q: { question_name: string }) => 
            q.question_name === diet
          );
          
          if (specificQuestion) {
            setQuestion(specificQuestion);
            console.log('✅ Found specific diet question:', specificQuestion.question_name);
          } else {
            console.error('❌ No matching diet question found for:', diet);
            setError(`No diet question found for ${diet}`);
          }
        } else {
          setError(`No diet question ${questionNumber} found`);
        }
      } else {
        console.error('❌ Failed to fetch diet question. Status:', response.status);
        setError('Failed to load diet question');
      }
    } catch (error: unknown) {
      console.error('❌ Error fetching diet question:', error);
      setError('Failed to load diet question');
    } finally {
      setLoadingQuestion(false);
    }
  };

  const fetchNextQuestion = async (nextQuestion: string, questionNumber: number) => {
    console.log('🚀 Fetching next question for:', nextQuestion, 'question number:', questionNumber);
    setLoadingQuestion(true);
    try {
      // Fetch all next questions and find the specific one
      const apiUrl = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=${questionNumber}`;
      console.log('🌐 Fetching from URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Next question data:', data);
        if (data.results && data.results.length > 0) {
          // Find the specific next question by matching the question name exactly
          const specificQuestion = data.results.find((q: { question_name: string }) => 
            q.question_name === nextQuestion
          );
          
          if (specificQuestion) {
            setQuestion(specificQuestion);
            console.log('✅ Found specific next question:', specificQuestion.question_name);
          } else {
            console.error('❌ No matching next question found for:', nextQuestion);
            setError(`No next question found for ${nextQuestion}`);
          }
        } else {
          setError(`No next question ${questionNumber} found`);
        }
      } else {
        console.error('❌ Failed to fetch next question. Status:', response.status);
        setError('Failed to load next question');
      }
    } catch (error: unknown) {
      console.error('❌ Error fetching next question:', error);
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
    console.log('🚀 handleNext called');
    console.log('🚀 params.id:', params.id);
    console.log('🚀 userId:', userId);
    console.log('🚀 question:', question);
    
    if (!userId || !question) {
      console.log('❌ Missing userId or question:', { userId, question });
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
        console.log('✅ Immediately saved question to localStorage:', question.id);
      }

      // Prepare user answer
      const userAnswer = {
        user_id: userId,
        question_id: question.id,
        me_answer: openToAll.meOpen ? 6 : meAnswer,
        me_open_to_all: openToAll.meOpen,
        me_importance: meRequired ? 5 : importance.me,
        me_share: meShare,
        looking_for_answer: openToAll.lookingForOpen ? 6 : lookingForAnswer,
        looking_for_open_to_all: openToAll.lookingForOpen,
        looking_for_importance: importance.lookingFor,
        looking_for_share: true
      };

      console.log('📊 Constructed userAnswer:', userAnswer);

      // For ethnicity questions, save in background without blocking UI
      const saveAnswerInBackground = async () => {
        try {
          console.log('🚀 Starting to save answer to backend...');
          console.log('📊 User answer:', userAnswer);

          const response = await fetch(getApiUrl(API_ENDPOINTS.ANSWERS), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userAnswer)
          });

          console.log('📡 Response status:', response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API request failed:', response.status, errorText);
          } else {
            const responseData = await response.json();
            console.log('✅ API request successful:', responseData);
          }

          console.log('✅ Answer processed');
        } catch (error) {
          console.error('❌ Error saving answer to backend:', error);
        }
      };

      if (params.id === 'ethnicity') {
        console.log('🌎 Ethnicity question detected - starting background save...');
        saveAnswerInBackground();
      } else if (params.id === 'education') {
        console.log('🎓 Education question detected - starting background save...');
        saveAnswerInBackground();
      } else if (params.id === 'diet') {
        console.log('🥗 Diet question detected - starting background save...');
        saveAnswerInBackground();
      } else if (params.id === '6') {
        console.log('🏃 Exercise question detected - starting background save...');
        saveAnswerInBackground();
      } else if (params.id === '8') {
        console.log('🙏 Religion question detected - starting background save...');
        saveAnswerInBackground();
      } else if (params.id === '9') {
        console.log('🗳️ Politics question detected - starting background save...');
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

      console.log('🔍 Navigation context check:', { contextParam, fromQuestionsPage });

      if (contextParam === 'profile') {
        // Navigate back to profile questions page when in profile context
        console.log('📋 Navigating to profile questions page');
        router.push('/profile/questions');
      } else if (fromQuestionsPage === 'true') {
        // Return to questions page with refresh flag
        console.log('📋 Navigating to questions page with refresh');
        router.push('/questions?refresh=true');
      } else {
        // Normal onboarding flow
        console.log('🎯 Normal onboarding flow - checking question type...');
        
        // For ethnicity questions, go back to ethnicity page; for education questions, go back to education page; for diet questions, go back to diet page; for next questions, go back to next question page; otherwise go to dashboard
        if (params.id === 'ethnicity') {
          console.log('🎯 Ethnicity question - navigating back to ethnicity page');
          
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
              console.error('❌ Error parsing answered ethnicities:', error);
              answeredEthnicities = [];
            }
          }
          
          const ethnicityParam = searchParams.get('ethnicity');
          if (ethnicityParam && !answeredEthnicities.includes(ethnicityParam)) {
            answeredEthnicities.push(ethnicityParam);
            if (answeredEthnicitiesKey) {
              localStorage.setItem(answeredEthnicitiesKey, JSON.stringify(answeredEthnicities));
            }
            console.log('✅ Saved answered ethnicity to localStorage:', ethnicityParam);
          }

          const params = new URLSearchParams({
            user_id: userId
          });
          console.log('🎯 Navigating to ethnicity page with params:', params.toString());
          router.push(`/auth/ethnicity?${params.toString()}`);
        } else if (params.id === 'education') {
          console.log('🎓 Education navigation triggered');
          console.log('🎓 userId:', userId);
          console.log('🎓 educationParam:', searchParams.get('education'));
          
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
              console.error('❌ Error parsing answered educations:', error);
              answeredEducations = [];
            }
          }
          
          const educationParam = searchParams.get('education');
          if (educationParam && !answeredEducations.includes(educationParam)) {
            answeredEducations.push(educationParam);
            if (answeredEducationsKey) {
              localStorage.setItem(answeredEducationsKey, JSON.stringify(answeredEducations));
            }
            console.log('✅ Saved answered education to localStorage:', educationParam);
          }

          const params = new URLSearchParams({
            user_id: userId
          });
          console.log('🎓 Navigating to education page with params:', params.toString());
          router.push(`/auth/education?${params.toString()}`);
          console.log('🎓 Navigation command executed');
        } else if (params.id === 'diet') {
          console.log('🥗 Diet navigation triggered');
          console.log('🥗 userId:', userId);
          console.log('🥗 dietParam:', searchParams.get('diet'));
          
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
              console.error('❌ Error parsing answered diets:', error);
              answeredDiets = [];
            }
          }
          
          const dietParam = searchParams.get('diet');
          if (dietParam && !answeredDiets.includes(dietParam)) {
            answeredDiets.push(dietParam);
            if (answeredDietsKey) {
              localStorage.setItem(answeredDietsKey, JSON.stringify(answeredDiets));
            }
            console.log('✅ Saved answered diet to localStorage:', dietParam);
          }

          const params = new URLSearchParams({
            user_id: userId
          });
          console.log('🥗 Navigating to diet page with params:', params.toString());
          router.push(`/auth/diet?${params.toString()}`);
          console.log('🥗 Navigation command executed');
        } else if (params.id === '6') {
          console.log('🏃 Exercise navigation triggered');
          console.log('🏃 userId:', userId);
          
          // Navigate to habits page (next in onboarding flow)
          const params = new URLSearchParams({
            user_id: userId
          });
          console.log('🏃 Navigating to habits page with params:', params.toString());
          router.push(`/auth/habits?${params.toString()}`);
          console.log('🏃 Navigation command executed');
        } else if (params.id === '8') {
          console.log('🙏 Religion navigation triggered');
          console.log('🙏 userId:', userId);
          
          // Navigate to politics page (next in onboarding flow)
          const params = new URLSearchParams({
            user_id: userId
          });
          console.log('🙏 Navigating to politics page with params:', params.toString());
          router.push(`/auth/question/9?${params.toString()}`);
          console.log('🙏 Navigation command executed');
        } else if (params.id === '9') {
          console.log('🗳️ Politics navigation triggered');
          console.log('🗳️ userId:', userId);
          
          // Navigate to kids page (next in onboarding flow)
          const params = new URLSearchParams({
            user_id: userId
          });
          console.log('🗳️ Navigating to kids page with params:', params.toString());
          router.push(`/auth/kids?${params.toString()}`);
          console.log('🗳️ Navigation command executed');
        } else if (params.id === 'next-question') {
          console.log('➡️ Next question - navigating to habits page');
          const params = new URLSearchParams({
            user_id: userId
          });

          // If we have habits questions loaded, pass them to avoid re-fetching
          if (habitsQuestions.length > 0) {
            params.set('questions', JSON.stringify(habitsQuestions));
            console.log('📋 Passing pre-loaded habits questions to habits page');
          }

          router.push(`/auth/habits?${params.toString()}`);
        } else {
          console.log('🏠 Default navigation - going to dashboard');
          router.push('/dashboard');
        }
      }
    } catch (error) {
      console.error('Error saving question answer:', error);
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
      'asian': 'ASIAN'
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

  const SliderComponent = ({ 
    value, 
    onChange,
    isOpenToAll = false,
    isImportance = false
  }: { 
    value: number; 
    onChange: (value: number) => void; 
    isOpenToAll?: boolean;
    isImportance?: boolean;
  }) => {
    const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isOpenToAll) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      
      // Skip position restrictions for importance sliders
      if (isImportance) {
        // Importance sliders always use full 1-5 range
        const newValue = Math.round(percentage * 4) + 1; // 1-5 range
        onChange(Math.max(1, Math.min(5, newValue)));
      } else if (params.id === 'education') {
        // For education questions, only allow positions 1, 3, 5
        if (percentage < 0.25) {
          onChange(1);
        } else if (percentage < 0.75) {
          onChange(3);
        } else {
          onChange(5);
        }
      } else if (params.id === 'diet') {
        // For diet questions, only allow positions 1, 5
        if (percentage < 0.5) {
          onChange(1);
        } else {
          onChange(5);
        }
      } else {
        // Default behavior for other question types
        const newValue = Math.round(percentage * 4) + 1; // 1-5 range
        onChange(Math.max(1, Math.min(5, newValue)));
      }
    };

    const handleSliderDrag = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.buttons === 1 && !isOpenToAll) { // Left mouse button
        handleSliderClick(e);
      }
    };

    const handleMouseDown = () => {
      document.body.style.userSelect = 'none';
      window.getSelection()?.removeAllRanges();
    };

    const handleMouseUp = () => {
      document.body.style.userSelect = '';
    };

    const handleMouseLeave = () => {
      document.body.style.userSelect = '';
    };

    const handleDragStart = (e: React.DragEvent) => {
      e.preventDefault();
    };

    return (
      <div className="w-full h-5 relative flex items-center select-none"
        style={{ userSelect: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDragStart={handleDragStart}
      >
          {!isOpenToAll && <span className="absolute left-2 text-xs text-gray-500 pointer-events-none z-10">1</span>}
          
          {/* Middle label for education questions */}
          {!isOpenToAll && params.id === 'education' && (
            <span className="absolute left-1/2 transform -translate-x-1/2 text-xs text-gray-500 pointer-events-none z-10">3</span>
          )}
          
          {/* Custom Slider Track */}
        <div 
          className="slider-track w-full h-5 rounded-[20px] relative cursor-pointer transition-all duration-200 border"
            style={{
              width: '100%',
              backgroundColor: isOpenToAll ? '#672DB7' : '#F5F5F5',
              borderColor: isOpenToAll ? '#672DB7' : '#ADADAD'
            }}
            onClick={handleSliderClick}
            onMouseMove={handleSliderDrag}
            onMouseDown={handleSliderDrag}
            onDragStart={handleDragStart}
          />
          
          {/* Slider Thumb - OUTSIDE the track container */}
          {!isOpenToAll && (
            <div 
              className="absolute top-1/2 transform -translate-y-1/2 w-7 h-7 border border-gray-300 rounded-full flex items-center justify-center text-sm font-semibold z-30 cursor-pointer"
              style={{
                backgroundColor: isImportance ? 'white' : '#672DB7',
                boxShadow: isImportance ? '0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.12)',
                left: isImportance
                  ? (value === 1 ? '0px' : value === 5 ? 'calc(100% - 28px)' : `calc(${((value - 1) / 4) * 100}% - 14px)`)
                  : params.id === 'education' 
                  ? (value === 1 ? '0px' : value === 3 ? 'calc(50% - 14px)' : 'calc(100% - 28px)')
                  : params.id === 'diet'
                  ? (value === 1 ? '0px' : 'calc(100% - 28px)')
                  : (value === 1 ? '0px' : value === 5 ? 'calc(100% - 28px)' : `calc(${((value - 1) / 4) * 100}% - 14px)`)
              }}
              onDragStart={handleDragStart}
            >
              <span style={{ color: isImportance ? '#672DB7' : 'white' }}>{value}</span>
            </div>
          )}
          
          {!isOpenToAll && (
            <span className="absolute right-2 text-xs text-gray-500 pointer-events-none z-10">
              {params.id === 'education' ? '5' : '5'}
            </span>
          )}
      </div>
    );
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

  if (loadingQuestion) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
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
        <HamburgerMenu />
      </div>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 py-6">
        <div className="w-full max-w-4xl">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">
              {params.id === 'ethnicity' ? `${question?.question_number || 3}. Ethnicity` : 
               params.id === 'education' ? '4. Education' :
               params.id === 'diet' ? `${question?.question_number || 5}. Diet` :
               params.id === '6' ? '6. Exercise' :
               params.id === '8' ? '8. Religion' :
               params.id === '9' ? '9. Politics' :
               params.id === 'next-question' ? `${question?.question_number || 6}. ${question?.question_name || 'Next Question'}` :
               question?.question_number ? `${question.question_number}. ${question.group_name || question.question_name}` : 'Loading...'}
            </h1>
            <div className="inline-block">
              <p className="text-3xl font-bold text-black mb-4">
                {params.id === '8' ? 'How often do you practice religion?' :
                 params.id === '9' ? 'How important is politics in your life?' :
                 params.id === 'education' ? 'What is your highest level of education?' :
                 question?.text || 'What ethnicity do you identify with?'}
              </p>
              
              {/* Share Answer and Required switches - Only show for non-mandatory questions (question_number > 10) */}
              {question && question.question_number > 10 && (
                <div className="flex items-center justify-between w-full mb-8">
              {/* Required For Match - Left */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMeRequired(!meRequired)}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                  style={{ backgroundColor: meRequired ? '#000000' : '#ADADAD' }}
                >
                  <span
                    className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
                    style={{ transform: meRequired ? 'translateX(20px)' : 'translateX(2px)' }}
                  />
                </button>
                <span className="text-sm text-black">Required For Match</span>
              </div>

              {/* Share Answer - Right */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMeShare(!meShare)}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                  style={{ backgroundColor: meShare ? '#000000' : '#ADADAD' }}
                >
                  <span
                    className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
                    style={{ transform: meShare ? 'translateX(20px)' : 'translateX(2px)' }}
                  />
                </button>
                <span className="text-sm text-black">Share Answer</span>
              </div>
            </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Looking For Section */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-center mb-1" style={{ color: '#672DB7' }}>Them</h3>
            
            {/* NEVER, VERY OFTEN, and OTA labels below Looking For header */}
            <div
              className="grid items-center justify-center mx-auto w-full max-w-[640px] mb-2 mobile-grid-labels"
              style={{
                gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                columnGap: 'clamp(12px, 5vw, 24px)'
              }}
            >
              <div></div> {/* Empty placeholder for label column */}
{renderTopLabels()}
              <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
                {question?.open_to_all_looking_for ? 'OTA' : ''}
              </div>
            </div>
            
            {/* Grid container for perfect alignment */}
            <div
              className="grid items-center justify-center mx-auto w-full max-w-[640px] mobile-grid-rows"
              style={{
                gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                columnGap: 'clamp(12px, 5vw, 24px)',
                rowGap: 'clamp(16px, 4vw, 28px)'
              }}
            >
              
              {/* Question Slider Row */}
              <div className="text-xs font-semibold text-gray-400 mobile-label">
                {params.id === 'ethnicity' ? formatEthnicityLabel(searchParams.get('ethnicity')) : 
                 params.id === 'education' ? getEducationDisplayName(searchParams.get('education') || '').toUpperCase() :
                 params.id === 'diet' ? getDietDisplayName(searchParams.get('diet') || '').toUpperCase() :
                 params.id === '8' ? 'RELIGION' :
                 params.id === '9' ? 'LEFT' :
                 (question?.question_name || 'ANSWER').toUpperCase()}
              </div>
              <div className="relative">
                <SliderComponent
                  value={lookingForAnswer}
                  onChange={(value) => handleSliderChange('lookingForAnswer', value)}
                  isOpenToAll={openToAll.lookingForOpen}
                  isImportance={false}
                />
              </div>
              <div className="hidden sm:flex justify-center">
                {/* Only show switch if question has open_to_all_looking_for enabled */}
                {question.open_to_all_looking_for ? (
                  <ToggleControl
                    checked={openToAll.lookingForOpen}
                    onChange={() => handleOpenToAllToggle('lookingForOpen')}
                  />
                ) : (
                  <div className="w-11 h-6"></div>
                )}
              </div>
              {question.open_to_all_looking_for && (
                <div className="sm:hidden col-span-2 flex justify-end">
                  <ToggleControl
                    checked={openToAll.lookingForOpen}
                    onChange={() => handleOpenToAllToggle('lookingForOpen')}
                  />
                </div>
              )}

              {/* IMPORTANCE Slider Row */}
              <div className="text-xs font-semibold text-gray-400 mobile-label">IMPORTANCE</div>
              <div className="relative">
                <SliderComponent
                  value={importance.lookingFor}
                  onChange={(value) => setImportance(prev => ({ ...prev, lookingFor: value }))}
                  isOpenToAll={false}
                  isImportance={true}
                />
              </div>
              <div className="w-11 h-6"></div>
              
            </div>


            {/* Importance labels below Looking For section - centered and dynamic */}
            <div
              className="grid items-center justify-center mx-auto w-full max-w-[640px] mt-2"
              style={{
                gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                columnGap: 'clamp(12px, 5vw, 24px)'
              }}
            >
              <div></div> {/* Empty placeholder for label column */}
              <div className="relative text-xs text-gray-500 w-full">
                {/* Only show the label for the current importance value */}
                {importance.lookingFor === 1 && (
                  <span className="absolute" style={{ left: '14px', transform: 'translateX(-50%)' }}>TRIVIAL</span>
                )}
                {importance.lookingFor === 2 && (
                  <span className="absolute" style={{ left: '25%', transform: 'translateX(-50%)' }}>MINOR</span>
                )}
                {importance.lookingFor === 3 && (
                  <span className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>AVERAGE</span>
                )}
                {importance.lookingFor === 4 && (
                  <span className="absolute" style={{ left: '75%', transform: 'translateX(-50%)' }}>SIGNIFICANT</span>
                )}
                {importance.lookingFor === 5 && (
                  <span className="absolute" style={{ left: 'calc(100% - 14px)', transform: 'translateX(-50%)' }}>ESSENTIAL</span>
                )}
              </div>
              <div></div> {/* Empty placeholder for switch column */}
            </div>
          </div>

          {/* Me Section */}
          <div className="mb-6 pt-8">
            <h3 className="text-2xl font-bold text-center mb-1">Me</h3>
            
            {/* NEVER, VERY OFTEN, and OTA labels below Me header */}
            <div
              className="grid items-center justify-center mx-auto w-full max-w-[640px] mb-2 mobile-grid-labels"
              style={{
                gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                columnGap: 'clamp(12px, 5vw, 24px)'
              }}
            >
              <div></div> {/* Empty placeholder for label column */}
{renderTopLabels()}
              <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
                {question?.open_to_all_me ? 'OTA' : ''}
              </div>
            </div>
            
            {/* Grid container for perfect alignment */}
            <div
              className="grid items-center justify-center mx-auto w-full max-w-[640px] mobile-grid-rows"
              style={{
                gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                columnGap: 'clamp(12px, 5vw, 24px)',
                rowGap: 'clamp(16px, 4vw, 28px)'
              }}
            >
              
              {/* Question Slider Row */}
              <div className="text-xs font-semibold text-gray-400 mobile-label">
                {params.id === 'ethnicity' ? formatEthnicityLabel(searchParams.get('ethnicity')) : 
                 params.id === 'education' ? getEducationDisplayName(searchParams.get('education') || '').toUpperCase() :
                 params.id === 'diet' ? getDietDisplayName(searchParams.get('diet') || '').toUpperCase() :
                 params.id === '8' ? 'RELIGION' :
                 params.id === '9' ? 'LEFT' :
                 (question?.question_name || 'ANSWER').toUpperCase()}
              </div>
              <div className="relative">
                <SliderComponent
                  value={meAnswer}
                  onChange={(value) => handleSliderChange('meAnswer', value)}
                  isOpenToAll={openToAll.meOpen}
                  isImportance={false}
                />
              </div>
              <div className="hidden sm:flex justify-center">
                {/* Only show switch if question has open_to_all_me enabled */}
                {question.open_to_all_me ? (
                  <ToggleControl
                    checked={openToAll.meOpen}
                    onChange={() => handleOpenToAllToggle('meOpen')}
                  />
                ) : (
                  <div className="w-11 h-6"></div> // Empty placeholder to maintain grid alignment
                )}
              </div>
              {question.open_to_all_me && (
                <div className="sm:hidden col-span-2 flex justify-end">
                  <ToggleControl
                    checked={openToAll.meOpen}
                    onChange={() => handleOpenToAllToggle('meOpen')}
                  />
                </div>
              )}
              
            </div>

          </div>
        </div>
      </main>

      {/* Footer with Progress and Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        {/* Progress Bar - Only show in onboarding context, not profile or questions page context */}
        {searchParams.get('context') !== 'profile' && searchParams.get('from_questions_page') !== 'true' && (
          <div className="w-full h-1 bg-gray-200">
            <div className="h-full bg-black" style={{ width: `${getProgressPercentage()}%` }}></div>
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
                Saving...
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
