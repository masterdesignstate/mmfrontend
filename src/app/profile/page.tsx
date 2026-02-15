'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
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

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Always start with loading state to avoid hydration mismatch
  // Client-side cache will be checked in useEffect
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [requiredQuestionsData, setRequiredQuestionsData] = useState<{
    count: number;
  } | null>(null);

  // Fetch user profile and answers
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // PRIORITY 1: Check URL query parameter first (most recent/accurate)
        // PRIORITY 2: Fall back to localStorage (may be stale)
        const urlUserId = searchParams?.get('user_id');
        const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;
        let userId = urlUserId || storedUserId;
        
        // If URL has user_id, update localStorage to keep it in sync
        if (urlUserId && typeof window !== 'undefined') {
          if (urlUserId !== storedUserId) {
            console.log('🔄 Updating localStorage user_id from URL:', urlUserId);
            localStorage.setItem('user_id', urlUserId);
            // Clear any cached data for old user to prevent showing wrong profile
            if (storedUserId) {
              const oldCacheKey = `profile_${storedUserId}`;
              sessionStorage.removeItem(oldCacheKey);
              sessionStorage.removeItem(`${oldCacheKey}_timestamp`);
              console.log('🗑️ Cleared cached profile for old user:', storedUserId);
            }
          }
          userId = urlUserId;
        }
        
        if (!userId) {
          console.log('No user_id found in URL or localStorage, redirecting to login');
          setError('User ID not found');
          router.push('/auth/login');
          return;
        }

        console.log('🔍 Fetching profile for user:', userId, urlUserId ? '(from URL)' : '(from localStorage)');

        // Define cacheKey and now outside the conditional block so they're available for caching later
        const cacheKey = `profile_${userId}`;
        const now = Date.now();

        // Check sessionStorage cache first (2 min TTL) - only on client
        if (typeof window !== 'undefined') {
          const cachedData = sessionStorage.getItem(cacheKey);
          const cacheTimestamp = sessionStorage.getItem(`${cacheKey}_timestamp`);

          if (cachedData && cacheTimestamp && (now - parseInt(cacheTimestamp)) < 120000) { // 2 min cache
            console.log('Using cached profile data');
            const { user: cachedUser, answers: cachedAnswers } = JSON.parse(cachedData);
            setUser(cachedUser);
            setUserAnswers(cachedAnswers);
            setLoading(false);
            return;
          }
        }

        // Fetch user and answers in parallel
        // Use direct user ID endpoint instead of /me/ to avoid session issues
        const [userResponse, answersResponse] = await Promise.all([
          fetch(`${getApiUrl(API_ENDPOINTS.USERS)}${userId}/`, {
     
            headers: {
              'Content-Type': 'application/json',
            },
          }),
          fetch(`${getApiUrl(API_ENDPOINTS.ANSWERS)}?user=${userId}&page_size=100`, {
 
            headers: {
              'Content-Type': 'application/json',
            },
          })
        ]);

        if (!userResponse.ok) {
          console.error('User API failed with status:', userResponse.status);
          if (userResponse.status === 401 || userResponse.status === 403) {
            console.error('Authentication failed, clearing localStorage and redirecting to login');
            localStorage.removeItem('user_id');
            router.push('/auth/login');
          } else {
            throw new Error('Failed to fetch user profile');
          }
          return;
        }

        if (!answersResponse.ok) {
          throw new Error('Failed to fetch user answers');
        }

        const [userData, answersData] = await Promise.all([
          userResponse.json(),
          answersResponse.json()
        ]);

        const answers = answersData.results || [];

        // Calculate required questions data
        let requiredQuestionsData = null;
        try {
          const questionsResponse = await fetch(`${getApiUrl(API_ENDPOINTS.QUESTIONS)}?is_required_for_match=true&page_size=100`, {
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (questionsResponse.ok) {
            const questionsData = await questionsResponse.json();
            const requiredQuestions = questionsData.results || [];
            const totalRequired = requiredQuestions.length;
            
            requiredQuestionsData = {
              count: totalRequired
            };
          }
        } catch (error) {
          console.error('Error fetching required questions:', error);
          // Continue without required questions data if fetch fails
        }

        // Cache the data - only on client
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(cacheKey, JSON.stringify({ user: userData, answers }));
          sessionStorage.setItem(`${cacheKey}_timestamp`, now.toString());
        }

        setUser(userData);
        setUserAnswers(answers);
        setRequiredQuestionsData(requiredQuestionsData);

      } catch (error) {
        console.error('Error fetching profile:', error);
        setError(error instanceof Error ? error.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router, searchParams]);


  // Helper function to get answer value for specific question
  const getAnswerValue = (questionNumber: number, groupNumber?: number, answerType: 'me_answer' | 'looking_for_answer' = 'me_answer') => {
    const answer = userAnswers.find(a =>
      a.question.question_number === questionNumber &&
      (groupNumber === undefined || a.question.group_number === groupNumber)
    );

    // Debug for question 1 (I'm Looking For section)
    if (questionNumber === 1) {
      console.log(`🔍 Relationship Question Q${questionNumber} G${groupNumber} (${answerType}):`, {
        found: !!answer,
        value: answer ? answer[answerType] : null,
        question: answer?.question.question_name,
        me_answer: answer?.me_answer,
        looking_for_answer: answer?.looking_for_answer,
        allQ1Answers: userAnswers.filter(a => a.question.question_number === 1).map(a => ({
          group: a.question.group_number,
          name: a.question.question_name,
          me: a.me_answer,
          looking: a.looking_for_answer
        }))
      });
    }

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

  // Loading text cycling for heart animation loader
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingTextIndex(prev => (prev + 1) % 3);
    }, 1500);
    return () => clearInterval(interval);
  }, [loading]);

  // Check if we should show loading page instead of spinner
  const showLoadingPage = typeof window !== 'undefined' && sessionStorage.getItem('show_loading_page') === 'true';
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(0);
  
  const messages = [
    'Analyzing your preferences',
    'Finding compatible matches',
    'Personalizing your experience',
    'Almost ready'
  ];

  // Clear the flag once profile is loaded (from onboarding flow)
  useEffect(() => {
    if (!loading && showLoadingPage) {
      sessionStorage.removeItem('show_loading_page');
    }
  }, [loading, showLoadingPage]);

  // Loading page UI state management
  useEffect(() => {
    if (!loading || !showLoadingPage) return;

    // Simulate progress from 0 to 100%
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          return 95;
        }
        return prev + 0.5;
      });
    }, 25);

    // Change message every 2000ms (2 seconds)
    const messageInterval = setInterval(() => {
      setMessage(prev => (prev + 1) % messages.length);
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [loading, showLoadingPage, messages.length]);

  // If coming from onboarding (showLoadingPage is true), show loading page UI instead of spinner
  if (loading && showLoadingPage) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-md w-full px-6">
          {/* Logo centered */}
          <div className="flex justify-center mb-16">
            <Image
              src="/assets/mmlogox.png"
              alt="Matchmatical"
              width={120}
              height={120}
              priority
            />
          </div>

          {/* Message with fade transition */}
          <div className="text-center mb-12 min-h-[40px]">
            <p className="text-xl text-gray-700 font-medium" key={message}>
              {messages[message]}
            </p>
          </div>

          {/* Progress indicator - minimalistic dots */}
          <div className="flex justify-center gap-2 mb-8">
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full transition-all duration-300" style={{ 
              opacity: progress > 25 ? 1 : 0.3,
              transform: progress > 25 ? 'scale(1.2)' : 'scale(1)'
            }}></div>
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full transition-all duration-300" style={{ 
              opacity: progress > 50 ? 1 : 0.3,
              transform: progress > 50 ? 'scale(1.2)' : 'scale(1)'
            }}></div>
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full transition-all duration-300" style={{ 
              opacity: progress > 75 ? 1 : 0.3,
              transform: progress > 75 ? 'scale(1.2)' : 'scale(1)'
            }}></div>
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full transition-all duration-300" style={{ 
              opacity: progress > 90 ? 1 : 0.3,
              transform: progress > 90 ? 'scale(1.2)' : 'scale(1)'
            }}></div>
          </div>

          {/* Minimal progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-0.5 overflow-hidden">
            <div
              className="h-full bg-[#672DB7] rounded-full transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // If loading and not from onboarding, show the heart + math symbols loader
  if (loading && !showLoadingPage) {
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
                className="myprofile-math-operator absolute text-xl font-bold"
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
              className="myprofile-heart-pulse relative z-10"
              width="72"
              height="72"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="myprofileHeartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#A855F7" />
                  <stop offset="50%" stopColor="#7C3AED" />
                  <stop offset="100%" stopColor="#672DB7" />
                </linearGradient>
              </defs>
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill="url(#myprofileHeartGradient)"
              />
            </svg>
          </div>

          {/* Cycling loading text */}
          <p className="mt-6 text-lg font-semibold text-gray-700 myprofile-loading-text">
            {loadingTexts[loadingTextIndex]}
          </p>
        </div>

        <style jsx>{`
          @keyframes myprofileHeartPulse {
            0%, 100% { transform: scale(1); }
            15% { transform: scale(1.18); }
            30% { transform: scale(1); }
            45% { transform: scale(1.12); }
            60% { transform: scale(1); }
          }

          @keyframes myprofileOrbit0 { 0% { transform: translate(-50%, -50%) rotate(0deg) translateX(60px) rotate(0deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(360deg) translateX(60px) rotate(-360deg); opacity: 0.5; } }
          @keyframes myprofileOrbit1 { 0% { transform: translate(-50%, -50%) rotate(51deg) translateX(64px) rotate(-51deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(411deg) translateX(64px) rotate(-411deg); opacity: 0.5; } }
          @keyframes myprofileOrbit2 { 0% { transform: translate(-50%, -50%) rotate(103deg) translateX(58px) rotate(-103deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(463deg) translateX(58px) rotate(-463deg); opacity: 0.5; } }
          @keyframes myprofileOrbit3 { 0% { transform: translate(-50%, -50%) rotate(154deg) translateX(66px) rotate(-154deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(514deg) translateX(66px) rotate(-514deg); opacity: 0.5; } }
          @keyframes myprofileOrbit4 { 0% { transform: translate(-50%, -50%) rotate(206deg) translateX(60px) rotate(-206deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(566deg) translateX(60px) rotate(-566deg); opacity: 0.5; } }
          @keyframes myprofileOrbit5 { 0% { transform: translate(-50%, -50%) rotate(257deg) translateX(62px) rotate(-257deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(617deg) translateX(62px) rotate(-617deg); opacity: 0.5; } }
          @keyframes myprofileOrbit6 { 0% { transform: translate(-50%, -50%) rotate(309deg) translateX(58px) rotate(-309deg); opacity: 0.5; } 50% { opacity: 0.9; } 100% { transform: translate(-50%, -50%) rotate(669deg) translateX(58px) rotate(-669deg); opacity: 0.5; } }

          @keyframes myprofileTextFade {
            0%, 100% { opacity: 0; transform: translateY(4px); }
            15%, 85% { opacity: 1; transform: translateY(0); }
          }

          .myprofile-heart-pulse {
            animation: myprofileHeartPulse 1.6s ease-in-out infinite;
          }

          .myprofile-math-operator:nth-child(1) { animation: myprofileOrbit0 3.5s linear infinite both; }
          .myprofile-math-operator:nth-child(2) { animation: myprofileOrbit1 4.0s linear infinite both; }
          .myprofile-math-operator:nth-child(3) { animation: myprofileOrbit2 3.2s linear infinite both; }
          .myprofile-math-operator:nth-child(4) { animation: myprofileOrbit3 3.8s linear infinite both; }
          .myprofile-math-operator:nth-child(5) { animation: myprofileOrbit4 4.2s linear infinite both; }
          .myprofile-math-operator:nth-child(6) { animation: myprofileOrbit5 3.6s linear infinite both; }
          .myprofile-math-operator:nth-child(7) { animation: myprofileOrbit6 3.4s linear infinite both; }

          .myprofile-loading-text {
            animation: myprofileTextFade 1.5s ease-in-out infinite;
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

  if (!user) return null;

  const profileIcons = getProfileIcons();
  // Get the first name only (text before first space)
  const fullName = user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username;
  const displayName = fullName.split(' ')[0]; // Take only the first part before space

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
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

      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-80 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Profile</h1>
            
            <nav className="space-y-4">
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  {user.profile_photo ? (
                    <Image
                      src={user.profile_photo}
                      alt={displayName}
                      width={32}
                      height={32}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-b from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="font-medium text-gray-900">About me</span>
              </div>

              <div
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push('/profile/edit')}
              >
                <Image
                  src="/assets/edit-profile.png"
                  alt="Edit Profile"
                  width={32}
                  height={32}
                />
                <span className="text-gray-700">Edit Profile</span>
              </div>

              <div
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push('/settings')}
              >
                <i className="fas fa-cog text-2xl text-gray-600 w-8 text-center"></i>
                <span className="text-gray-700">Settings</span>
              </div>

            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 lg:max-w-4xl lg:mx-auto px-6 lg:px-12 xl:px-20 py-4">
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
            </div>
            
            {/* Tagline below the profile photo */}
            {user.tagline && (
              <div className="mt-2 text-center">
                <p className="text-gray-700 text-lg">{user.tagline}</p>
              </div>
            )}
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

          {/* Required Questions and Questions Answered Section */}
          {requiredQuestionsData && (
            <div className="mb-8">
              {/* Second Row: Required Questions, Questions Answered - Smaller Cards */}
              <div className="flex gap-3">
                {/* Required Questions */}
                <div className="bg-[#F3F3F3] rounded-xl px-3 py-2 flex-1">
                  <div className="text-sm font-normal text-black capitalize mb-2">
                    Required Questions
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-3xl font-black text-[#672DB7]">
                      {requiredQuestionsData.count}
                    </span>
                  </div>
                </div>

                {/* Questions Answered */}
                <div className="bg-[#F3F3F3] rounded-xl px-3 py-2 flex-1">
                  <div className="text-sm font-normal text-black capitalize mb-2">
                    Questions Answered
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-3xl font-black text-[#672DB7]">
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
              {/* LESS, MORE labels above sliders - aligned with slider start (matching Gender section) */}
              <div className="flex justify-between text-xs text-gray-500 mb-2 ml-16 sm:ml-20">
                <span>LESS</span>
                <span>MORE</span>
              </div>
              
              <div className="space-y-3">
                {/* FRIEND Slider Row */}
                <div className="flex items-center gap-4">
                  <div className="text-xs font-semibold text-gray-400 w-16">FRIEND</div>
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
                  <div className="text-xs font-semibold text-gray-400 w-16">HOOK UP</div>
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
                  <div className="text-xs font-semibold text-gray-400 w-16">DATE</div>
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
                  <div className="text-xs font-semibold text-gray-400 w-16">PARTNER</div>
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
        </div>
      </div>
    </div>
  );
}
