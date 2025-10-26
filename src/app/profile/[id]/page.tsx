'use client';

import React, { useState, useEffect } from 'react';
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

        // Fetch user and answers in parallel
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
          throw new Error('User not found');
        }

        if (!answersResponse.ok) {
          throw new Error('Failed to fetch user answers');
        }

        const [userData, answersData] = await Promise.all([
          userResponse.json(),
          answersResponse.json()
        ]);

        const answers = answersData.results || [];

        // Cache the data
        sessionStorage.setItem(cacheKey, JSON.stringify({ user: userData, answers }));
        sessionStorage.setItem(`${cacheKey}_timestamp`, now.toString());

        setUser(userData);
        setUserAnswers(answers);

      } catch (error) {
        console.error('Error fetching profile:', error);
        setError(error instanceof Error ? error.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  // Fetch tags for this user
  useEffect(() => {
    const fetchTags = async () => {
      const currentUserId = localStorage.getItem('user_id');
      if (!currentUserId || !userId) return;

      try {
        const response = await fetch(
          `${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/user_tags/?user_id=${currentUserId}&result_user_id=${userId}`,
          {
 
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setSelectedTags(data.tags || []);
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
        return haveLabels[answer[answerType] as keyof typeof haveLabels] || null;
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

    // Diet icon (question_number === 5, highest value)
    const dietAnswer = getHighestAnswer(5);
    if (dietAnswer) {
      const dietLabel = dietAnswer.question.question_name || '';
      const normalizedLabel = dietLabel.toLowerCase();
      const dietGroup = dietAnswer.question.group_number;

      const isPescatarian = (dietGroup === 2) || normalizedLabel.includes('pesca');
      const isPlantBased = (dietGroup === 1) || normalizedLabel.includes('vegan') || normalizedLabel.includes('vegetarian');

      let dietIcon = '/assets/carnivore.png';
      if (isPescatarian) {
        dietIcon = '/assets/fish.png';
      } else if (isPlantBased) {
        dietIcon = '/assets/leaf.png';
      }

      icons.push({
        image: dietIcon,
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

    // Religion icon (question_number === 8, highest value)
    const religionAnswer = getHighestAnswer(8);
    if (religionAnswer) {
      icons.push({
        image: '/assets/prayin.png',
        label: religionAnswer.question.question_name || '',
        show: true
      });
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

  // Helper function to get the current action button icon based on tag state
  const getActionButtonIcon = () => {
    if (selectedTags.includes('like')) {
      return '/assets/purple-match.png';
    } else if (selectedTags.includes('approve')) {
      return '/assets/purple-like.png';
    } else {
      return '/assets/purple-check.png';
    }
  };

  // Helper function to get the action button alt text
  const getActionButtonAlt = () => {
    if (selectedTags.includes('like')) {
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
    if (selectedTags.includes('like')) {
      action = 'reset'; // Remove like tag (go back to no tags)
    } else if (selectedTags.includes('approve')) {
      action = 'approve_to_like'; // Remove approve, add like
    } else {
      action = 'add_approve'; // Add approve tag
    }

    // Update UI optimistically
    let newSelectedTags = [...selectedTags];
    
    switch (action) {
      case 'reset':
        newSelectedTags = newSelectedTags.filter(tag => tag !== 'like');
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
        case 'reset':
          await toggleTagAPI('Like');
          break;
        case 'approve_to_like':
          await toggleTagAPI('Approve');
          await toggleTagAPI('Like');
          break;
        case 'add_approve':
          await toggleTagAPI('Approve');
          break;
      }
    } catch (error) {
      // Revert on error
      setSelectedTags(selectedTags);
      console.error('Error updating progression:', error);
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
                className="hover:scale-105 transition-transform"
              >
                <Image
                  src="/assets/purple-hide.png"
                  alt="Hide"
                  width={48}
                  height={48}
                />
              </button>
              <button 
                onClick={() => handleActionButtonClick()}
                className="hover:scale-105 transition-transform"
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
              onClick={() => handleActionButtonClick()}
              className="bg-black text-white px-6 py-2 rounded-full font-medium hover:bg-gray-800 transition-colors flex-shrink-0"
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
          <h3 className="text-xl font-bold mb-4">Bio</h3>
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
    </div>
  );
}
