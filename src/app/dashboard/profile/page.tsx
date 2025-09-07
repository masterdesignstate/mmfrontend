'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Fetch user profile and answers
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Get user ID from localStorage
        const userId = localStorage.getItem('user_id');
        if (!userId) {
          setError('User ID not found');
          return;
        }

        // Fetch user profile
        const userResponse = await fetch(`${getApiUrl('/users')}/${userId}/`);
        if (!userResponse.ok) {
          throw new Error('Failed to fetch user profile');
        }
        const userData = await userResponse.json();
        setUser(userData);

        // Fetch user answers
        const answersResponse = await fetch(`${getApiUrl(API_ENDPOINTS.ANSWERS)}?user=${userId}`);
        if (!answersResponse.ok) {
          throw new Error('Failed to fetch user answers');
        }
        const answersData = await answersResponse.json();
        setUserAnswers(answersData.results || []);

      } catch (error) {
        console.error('Error fetching profile:', error);
        setError(error instanceof Error ? error.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Helper function to get answer value for specific question
  const getAnswerValue = (questionNumber: number, groupNumber?: number, answerType: 'me_answer' | 'looking_for_answer' = 'me_answer') => {
    const answer = userAnswers.find(a => 
      a.question.question_number === questionNumber && 
      (groupNumber === undefined || a.question.group_number === groupNumber)
    );
    return answer ? answer[answerType] : null;
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
      const isVegan = dietAnswer.question.question_name === 'Vegan' || dietAnswer.question.question_name === 'Vegetarian';
      icons.push({
        image: isVegan ? '/assets/leaf.png' : '/assets/carnivore.png',
        label: dietAnswer.question.question_name || '',
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

    // Have Children icon (question_number === 10, group_number === 1)
    const haveChildrenValue = getAnswerValue(10, 1);
    if (haveChildrenValue) {
      const labels = { 1: "Don't have children", 5: "Have children" };
      icons.push({
        image: '/assets/pacifier.png',
        label: labels[haveChildrenValue as keyof typeof labels] || '',
        show: true
      });
    }

    // Want Children icon (question_number === 10, group_number === 2)
    const wantChildrenValue = getAnswerValue(10, 2);
    if (wantChildrenValue) {
      const labels = { 1: "Don't want kids", 2: "Not sure", 3: "Not right now", 4: "Maybe", 5: "Want kids" };
      icons.push({
        image: '/assets/pacifier.png',
        label: labels[wantChildrenValue as keyof typeof labels] || '',
        show: true
      });
    }

    return icons.filter(icon => icon.show);
  };

  // Slider component for gender and looking for sections
  const SliderDisplay = ({ value, max = 5 }: { value: number | null; max?: number }) => {
    if (!value) return <div className="w-full h-5 bg-gray-200 rounded-full" />;
    
    const percentage = ((value - 1) / (max - 1)) * 100;
    
    return (
      <div className="w-full h-5 relative flex items-center">
        <div className="w-full h-5 bg-gray-200 rounded-full relative">
          <div 
            className="absolute top-1/2 transform -translate-y-1/2 w-7 h-7 bg-[#672DB7] border border-gray-300 rounded-full flex items-center justify-center text-sm font-semibold text-white shadow-sm z-10"
            style={{
              left: value === 1 ? '0px' : value === max ? 'calc(100% - 28px)' : `calc(${percentage}% - 14px)`
            }}
          >
            {value}
          </div>
        </div>
        <span className="absolute left-2 text-xs text-gray-500 z-0">1</span>
        <span className="absolute right-2 text-xs text-gray-500 z-0">{max}</span>
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
  const displayName = user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username;

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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5 5-5m-5 5H9m6 0H3" />
          </svg>
        </button>
      </div>

      {/* Profile Content */}
      <div className="max-w-2xl mx-auto px-6 py-4">
        {/* Profile Photo and Name */}
        <div className="relative mb-6">
          <div className="w-full h-96 bg-gradient-to-b from-orange-400 to-orange-600 rounded-2xl overflow-hidden relative">
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
              <h1 className="text-2xl font-bold text-white mb-1">
                {displayName}{user.age ? `, ${user.age}` : ''}
              </h1>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4 mt-4">
            <button className="px-6 py-2 bg-black text-white rounded-full font-medium">
              Answers
            </button>
            <button className="px-6 py-2 bg-red-500 text-white rounded-full font-medium">
              Matches
            </button>
            <button className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-full font-medium">
              Edit
            </button>
          </div>
        </div>

        {/* Profile Icons */}
        {profileIcons.length > 0 && (
          <div className="flex justify-center space-x-6 mb-8">
            {profileIcons.map((icon, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="w-12 h-12 mb-2">
                  <Image
                    src={icon.image}
                    alt={icon.label}
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </div>
                <span className="text-xs text-gray-600 text-center">{icon.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* User Info */}
        <div className="grid grid-cols-2 gap-4 mb-8 text-center">
          <div>
            <h3 className="font-semibold">Username</h3>
            <p className="text-gray-600">{user.username}</p>
          </div>
          <div>
            <h3 className="font-semibold">City</h3>
            <p className="text-gray-600">{user.live || 'Austin'}</p>
          </div>
          <div>
            <h3 className="font-semibold">Tag line</h3>
            <p className="text-gray-600">Carpe Diem</p>
          </div>
          <div>
            <h3 className="font-semibold">Height</h3>
            <p className="text-gray-600">{user.height ? `${Math.floor(user.height / 12)}'${user.height % 12}"` : `5'3"`}</p>
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <div className="mb-8">
            <h3 className="font-semibold mb-2">Bio</h3>
            <p className="text-gray-600">{user.bio}</p>
          </div>
        )}

        {/* My Gender Section */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">My Gender</h3>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold mb-2 text-center">Me</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">FEMALE</span>
                    <span className="text-sm text-gray-600">{getAnswerValue(2, 2) || 3}</span>
                  </div>
                  <SliderDisplay value={getAnswerValue(2, 2)} />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">MALE</span>
                    <span className="text-sm text-gray-600">{getAnswerValue(2, 1) || 3}</span>
                  </div>
                  <SliderDisplay value={getAnswerValue(2, 1)} />
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-center" style={{ color: '#672DB7' }}>Them</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">FEMALE</span>
                    <span className="text-sm text-gray-600">{getAnswerValue(2, 2, 'looking_for_answer') || 3}</span>
                  </div>
                  <SliderDisplay value={getAnswerValue(2, 2, 'looking_for_answer')} />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">MALE</span>
                    <span className="text-sm text-gray-600">{getAnswerValue(2, 1, 'looking_for_answer') || 3}</span>
                  </div>
                  <SliderDisplay value={getAnswerValue(2, 1, 'looking_for_answer')} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* I'm Looking For Section */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">I'm Looking For</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">FRIEND</span>
                <span className="text-sm text-gray-600">{getAnswerValue(1, 1, 'looking_for_answer') || 3}</span>
              </div>
              <SliderDisplay value={getAnswerValue(1, 1, 'looking_for_answer')} />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">HOOK UP</span>
                <span className="text-sm text-gray-600">{getAnswerValue(1, 2, 'looking_for_answer') || 3}</span>
              </div>
              <SliderDisplay value={getAnswerValue(1, 2, 'looking_for_answer')} />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">DATE</span>
                <span className="text-sm text-gray-600">{getAnswerValue(1, 3, 'looking_for_answer') || 3}</span>
              </div>
              <SliderDisplay value={getAnswerValue(1, 3, 'looking_for_answer')} />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">LIFE PARTNER</span>
                <span className="text-sm text-gray-600">{getAnswerValue(1, 4, 'looking_for_answer') || 3}</span>
              </div>
              <SliderDisplay value={getAnswerValue(1, 4, 'looking_for_answer')} />
            </div>
          </div>
        </div>

        {/* Tags Section */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">Tags</h3>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm">Approve</span>
            <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm">Hot</span>
            <span className="px-3 py-1 border border-gray-300 text-gray-700 rounded-full text-sm">Maybe</span>
            <span className="px-3 py-1 border border-gray-300 text-gray-700 rounded-full text-sm">Save</span>
            <span className="px-3 py-1 border border-gray-300 text-gray-700 rounded-full text-sm">Hide</span>
            <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm">Like</span>
          </div>
        </div>
      </div>
    </div>
  );
}