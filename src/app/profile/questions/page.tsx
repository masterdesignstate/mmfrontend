'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

interface Question {
  id: string;
  question_name: string;
  question_number: number;
  group_number?: number;
  text: string;
  open_to_all_me: boolean;
  open_to_all_looking_for: boolean;
}

interface UserAnswer {
  id: string;
  question: Question;
  me_answer: number;
  looking_for_answer: number;
}

export default function QuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [showMenu, setShowMenu] = useState(false);

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

        // Fetch questions for the first 10 question numbers
        const questionsPromises = [];
        for (let i = 1; i <= 10; i++) {
          questionsPromises.push(
            fetch(`${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=${i}`)
              .then(res => res.json())
              .then(data => data.results || [])
          );
        }

        const allQuestionsArrays = await Promise.all(questionsPromises);
        const allQuestions = allQuestionsArrays.flat();
        
        // Sort by question_number and group_number
        allQuestions.sort((a, b) => {
          if (a.question_number !== b.question_number) {
            return a.question_number - b.question_number;
          }
          return (a.group_number || 0) - (b.group_number || 0);
        });
        
        setQuestions(allQuestions);

        // Fetch user answers
        const answersResponse = await fetch(
          `${getApiUrl(API_ENDPOINTS.ANSWERS)}?user=${storedUserId}`,
          {
            credentials: 'include',
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

  // Group questions by question_number
  const groupedQuestions = questions.reduce((acc, question) => {
    if (!acc[question.question_number]) {
      acc[question.question_number] = [];
    }
    acc[question.question_number].push(question);
    return acc;
  }, {} as Record<number, Question[]>);

  // Get answer count for a question number (count unique users who answered at least one question in this group)
  const getAnswerCount = (questionNumber: number): number => {
    const relevantAnswers = userAnswers.filter(
      answer => answer.question.question_number === questionNumber
    );
    
    // For now, return a mock count since we need to implement proper user counting
    // This would ideally be fetched from backend as a count of unique users who answered this question
    const mockCounts: Record<number, number> = {
      1: 99, 2: 99, 3: 78, 4: 75, 5: 70, 6: 65, 7: 60, 8: 55, 9: 52, 10: 42
    };
    
    return mockCounts[questionNumber] || 0;
  };

  // Question display names for the list (matching the actual onboarding page titles)
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

  const handleQuestionClick = (questionNumber: number) => {
    // Store questions and answers in sessionStorage to avoid refetching while preventing URL issues
    sessionStorage.setItem('questionsData', JSON.stringify(questions));
    sessionStorage.setItem('userAnswersData', JSON.stringify(userAnswers));
    sessionStorage.setItem('questionsDataTimestamp', Date.now().toString());
    
    router.push(`/profile/questions/${questionNumber}`);
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
          
          <button className="ml-4 px-4 py-3 border border-gray-300 rounded-full text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <svg className="w-4 h-4 mr-1 inline text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
            </svg>
            Filter
          </button>
          
          <button className="ml-2 px-4 py-3 border border-gray-300 rounded-full text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <svg className="w-4 h-4 mr-1 inline text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            Sort
          </button>
        </div>
        
        <div className="absolute right-4">
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
                <div className="block w-full text-left px-4 py-2 text-sm text-gray-700 bg-gray-100">
                  Questions
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-6 max-w-6xl mx-auto">
        {/* Title and Ask Button */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Questions</h1>
            <p className="text-gray-600">Showing {Object.keys(groupedQuestions).length} questions</p>
          </div>
          <button className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium">
            Ask a Question
          </button>
        </div>

        {/* Questions List */}
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((questionNumber) => {
            const questionGroups = groupedQuestions[questionNumber] || [];
            const answerCount = getAnswerCount(questionNumber);
            const displayName = questionDisplayNames[questionNumber] || `Question ${questionNumber}`;

            return (
              <div
                key={questionNumber}
                onClick={() => handleQuestionClick(questionNumber)}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-start">
                    <span className="text-sm text-gray-500 mr-3">{questionNumber}.</span>
                    <span className="text-gray-900 flex-1">{displayName}</span>
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

        {/* Pagination */}
        <div className="flex justify-center items-center space-x-4 mt-8">
          <button className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center text-sm font-medium">
            1
          </button>
          <button className="w-8 h-8 text-gray-600 flex items-center justify-center text-sm hover:text-black">
            2
          </button>
          <button className="w-8 h-8 text-gray-600 flex items-center justify-center text-sm hover:text-black">
            3
          </button>
          <button className="w-8 h-8 text-gray-600 flex items-center justify-center text-sm hover:text-black">
            4
          </button>
          <span className="text-gray-400">...</span>
          <button className="w-8 h-8 text-gray-600 flex items-center justify-center text-sm hover:text-black">
            15
          </button>
          <button className="text-gray-600 hover:text-black">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}