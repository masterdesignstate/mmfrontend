'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showMenu, setShowMenu] = useState(false);

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

        // Try to fetch current user profile using the 'me' endpoint first
        let userData;
        try {
          const userResponse = await fetch(`${getApiUrl(API_ENDPOINTS.USERS_ME)}`, {
            credentials: 'include',  // Include session cookies
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (userResponse.ok) {
            userData = await userResponse.json();
          } else {
            throw new Error('Me endpoint not available');
          }
        } catch (meError) {
          console.warn('Failed to use /users/me/ endpoint, falling back to direct user ID:', meError);
          
          // Clear localStorage if user ID is invalid and redirect to login
          if (!userId) {
            console.error('No user ID available, redirecting to login');
            router.push('/auth/login');
            return;
          }
          
          // Fallback: fetch user by ID
          const userByIdResponse = await fetch(`${getApiUrl(API_ENDPOINTS.USERS)}${userId}/`, {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!userByIdResponse.ok) {
            console.error('User not found, clearing localStorage and redirecting to login');
            localStorage.removeItem('user_id');
            router.push('/auth/login');
            return;
          }
          userData = await userByIdResponse.json();
        }
        
        setUser(userData);

        // Fetch user answers
        const answersResponse = await fetch(`${getApiUrl(API_ENDPOINTS.ANSWERS)}?user=${userId}`, {
          credentials: 'include',  // Include session cookies
          headers: {
            'Content-Type': 'application/json',
          },
        });
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
    
    // Debug for question 1 (I'm Looking For section)
    if (questionNumber === 1) {
      console.log(`🔍 Looking for Q${questionNumber} G${groupNumber} (${answerType}):`, {
        found: !!answer,
        value: answer ? answer[answerType] : null,
        question: answer?.question.question_name,
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

  // Helper function to format height from centimeters to feet and inches
  const formatHeight = (heightCm: number | null | undefined): string => {
    if (!heightCm) return `5'3"`;
    
    // Convert cm to inches
    const totalInches = Math.round(heightCm / 2.54);
    
    // Calculate feet and inches
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    
    return `${feet}'${inches}"`;
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

    // Have Children icon (question_number === 10, group_number === 2) - HAVE is second on page
    const haveChildrenValue = getAnswerValue(10, 2);
    if (haveChildrenValue && (haveChildrenValue === 1 || haveChildrenValue === 5)) {
      const labels = { 
        1: "Don't have kids",  // NO = 1
        5: "Have kids"         // YES = 5
      };
      icons.push({
        image: '/assets/pacifier.png',
        label: labels[haveChildrenValue as keyof typeof labels] || '',
        show: true
      });
    }

    // Want Children icon (question_number === 10, group_number === 1) - WANT is first on page
    const wantChildrenValue = getAnswerValue(10, 1);
    if (wantChildrenValue) {
      const labels = { 
        1: "Don't want kids", 
        2: "Probably not", 
        3: "Maybe want kids", 
        4: "Probably want", 
        5: "Want kids" 
      };
      icons.push({
        image: '/assets/pacifier.png',
        label: labels[wantChildrenValue as keyof typeof labels] || '',
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
        <div className="relative">
          <button 
            className="p-2 cursor-pointer"
            onClick={() => setShowMenu(!showMenu)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
              <button
                onClick={() => {
                  router.push('/profile/questions');
                  setShowMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Questions
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-80 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Profile</h1>
            
            <nav className="space-y-4">
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  {user.profile_photo ? (
                    <Image
                      src={user.profile_photo}
                      alt={displayName}
                      width={32}
                      height={32}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-b from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-gray-900 font-medium">About me</span>
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
              
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                <Image
                  src="/assets/answered.png"
                  alt="Answers"
                  width={32}
                  height={32}
                />
                <span className="text-gray-700">Answers</span>
              </div>
              
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                <Image
                  src="/assets/heart.png"
                  alt="Matches"
                  width={32}
                  height={32}
                />
                <span className="text-gray-700">Matches</span>
              </div>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 lg:max-w-4xl lg:mx-auto px-6 py-4">
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

            {/* Mobile Action Buttons - only show on mobile */}
            <div className="flex justify-end space-x-3 mt-4 lg:hidden">
              <button className="px-4 py-1.5 bg-black text-white rounded-full text-sm font-medium">
                Answers
              </button>
              <button className="px-4 py-1.5 bg-black text-white rounded-full text-sm font-medium">
                Matches
              </button>
              <button
                onClick={() => router.push('/profile/edit')}
                className="px-4 py-1.5 border border-black text-gray-700 rounded-full text-sm font-medium"
              >
                Edit
              </button>
            </div>
          </div>

          {/* Profile Icons - horizontal layout with containers */}
          {profileIcons.length > 0 && (
            <div className="flex justify-start flex-wrap gap-3 mb-6">
              {profileIcons.map((icon, index) => (
                <div key={index} className="flex items-center bg-[#F3F3F3] rounded-full px-4 py-1">
                  <div className="w-7 h-7 mr-3">
                    <Image
                      src={icon.image}
                      alt={icon.label}
                      width={icon.image.includes('drink.png') ? 25 : 28}
                      height={icon.image.includes('drink.png') ? 25 : 28}
                      className="object-contain"
                    />
                  </div>
                  <span className="text-base text-black font-medium">{icon.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* User Info - responsive layout */}
          <div className="grid grid-cols-2 gap-4 sm:flex sm:items-center sm:space-x-12 lg:space-x-24 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">Username</h3>
              <p className="text-gray-600">{user.username}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">City</h3>
              <p className="text-gray-600">{user.live || 'Austin'}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Tag line</h3>
              <p className="text-gray-600">{user.tagline || 'Carpe Diem'}</p>
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
            <h3 className="text-xl font-bold mb-4">My Gender</h3>
            
            {/* Me Section */}
            <div className="mb-6">
              <div className="max-w-md">
                {/* Me label centered above sliders */}
                <div className="flex justify-center mb-2">
                  <h4 className="font-semibold text-lg">Me</h4>
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

            {/* Them Section */}
            <div className="mb-6">
              <div className="max-w-md">
                {/* Them label centered above sliders */}
                <div className="flex justify-center mb-2">
                  <h4 className="font-semibold text-lg" style={{ color: '#672DB7' }}>Them</h4>
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
            <h3 className="text-xl font-bold mb-4">I'm Looking For</h3>
            
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
                      value={getAnswerValue(1, 1, 'looking_for_answer') || 3}
                      onChange={() => {}}
                      isOpenToAll={getAnswerValue(1, 1, 'looking_for_answer') === 6}
                    />
                  </div>
                </div>
                
                {/* HOOK UP Slider Row */}
                <div className="flex items-center gap-4">
                  <div className="text-xs font-semibold text-gray-400 w-20">HOOK UP</div>
                  <div className="flex-1">
                    <SliderComponent
                      value={getAnswerValue(1, 2, 'looking_for_answer') || 3}
                      onChange={() => {}}
                      isOpenToAll={getAnswerValue(1, 2, 'looking_for_answer') === 6}
                    />
                  </div>
                </div>
                
                {/* DATE Slider Row */}
                <div className="flex items-center gap-4">
                  <div className="text-xs font-semibold text-gray-400 w-20">DATE</div>
                  <div className="flex-1">
                    <SliderComponent
                      value={getAnswerValue(1, 3, 'looking_for_answer') || 3}
                      onChange={() => {}}
                      isOpenToAll={getAnswerValue(1, 3, 'looking_for_answer') === 6}
                    />
                  </div>
                </div>
                
                {/* LIFE PARTNER Slider Row */}
                <div className="flex items-center gap-4">
                  <div className="text-xs font-semibold text-gray-400 w-20">PARTNER</div>
                  <div className="flex-1">
                    <SliderComponent
                      value={getAnswerValue(1, 4, 'looking_for_answer') || 3}
                      onChange={() => {}}
                      isOpenToAll={getAnswerValue(1, 4, 'looking_for_answer') === 6}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
