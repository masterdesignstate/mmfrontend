'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import type { ApiUser, UserAnswer, Question } from '@/services/api';

// Type definition for calculation result
interface CalculationResult {
  question: string;
  p1Me: number;
  p2Me: number;
  p1LookingFor: number;
  p2LookingFor: number;
  p1Multiplier: number;
  delta: number;
  adj: number;
  max: number;
}

export default function CalculationPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer[]>>({});
  const [person1, setPerson1] = useState<string>('');
  const [person2, setPerson2] = useState<string>('');
  const [person1Search, setPerson1Search] = useState('');
  const [person2Search, setPerson2Search] = useState('');
  const [person1Results, setPerson1Results] = useState<ApiUser[]>([]);
  const [person2Results, setPerson2Results] = useState<ApiUser[]>([]);
  const [calculationResults1, setCalculationResults1] = useState<CalculationResult[]>([]);
  const [calculationResults2, setCalculationResults2] = useState<CalculationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [compatibilityPercentage1, setCompatibilityPercentage1] = useState(0);
  const [compatibilityPercentage2, setCompatibilityPercentage2] = useState(0);
  const [overallCompatibility, setOverallCompatibility] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('Fetching questions only...');
        const questionsData = await apiService.getQuestions();
        
        console.log('Fetched questions:', questionsData.length);
        console.log('=== QUESTION SUMMARY ===');
        console.log('Total questions fetched:', questionsData.length);
        
        setQuestions(questionsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Search users function
  const searchUsers = async (query: string, excludeIds: string[] = []): Promise<ApiUser[]> => {
    console.log('searchUsers called with query:', query, 'excludeIds:', excludeIds);
    if (!query || query.trim().length < 2) return [];
    
    try {
      console.log('Calling API search...');
      const users = await apiService.searchUsers(query);
      console.log('API search results:', users.length, users);
      
      // Filter out excluded IDs
      const filtered = users.filter(user => !excludeIds.includes(user.id));
      console.log('After excluding IDs:', filtered.length);
      return filtered;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  };

  // Handle person 1 search
  const handlePerson1Search = async (query: string) => {
    console.log('Person 1 search triggered with query:', query);
    setPerson1Search(query);
    if (query.trim().length >= 2) {
      console.log('Searching for users...');
      const results = await searchUsers(query, person2 ? [person2] : []);
      console.log('Person 1 search results:', results);
      setPerson1Results(results);
    } else {
      console.log('Query too short, clearing results');
      setPerson1Results([]);
    }
  };

  // Handle person 2 search
  const handlePerson2Search = async (query: string) => {
    console.log('Person 2 search triggered with query:', query);
    setPerson2Search(query);
    if (query.trim().length >= 2) {
      console.log('Searching for users...');
      const results = await searchUsers(query, person1 ? [person1] : []);
      console.log('Person 2 search results:', results);
      setPerson2Results(results);
    } else {
      console.log('Query too short, clearing results');
      setPerson2Results([]);
    }
  };

  // Select person 1
  const selectPerson1 = (user: ApiUser) => {
    setPerson1(user.id);
    setPerson1Search(`${user.first_name} ${user.last_name} (${user.username})`);
    setPerson1Results([]);
  };

  // Select person 2
  const selectPerson2 = (user: ApiUser) => {
    setPerson2(user.id);
    setPerson2Search(`${user.first_name} ${user.last_name} (${user.username})`);
    setPerson2Results([]);
  };

  // Fetch user answers when person changes
  useEffect(() => {
    const fetchAnswers = async (userId: string) => {
      if (!userId) return;
      
      try {
        const answers = await apiService.getUserAnswers(userId);
        setUserAnswers(prev => ({ ...prev, [userId]: answers }));
      } catch (error) {
        console.error('Error fetching user answers:', error);
      }
    };

    if (person1 && !userAnswers[person1]) {
      fetchAnswers(person1);
    }
    if (person2 && !userAnswers[person2]) {
      fetchAnswers(person2);
    }
  }, [person1, person2, userAnswers]);

  const calculateCompatibility = () => {
    if (!person1 || !person2) return;

    setCalculating(true);
    
    const person1Answers = userAnswers[person1] || [];
    const person2Answers = userAnswers[person2] || [];

    console.log('=== CALCULATION DEBUG ===');
    console.log('Person 1 Answers:', person1Answers.length);
    console.log('Person 2 Answers:', person2Answers.length);
    console.log('Questions:', questions.length);
    
    // Create maps for lookup
    const person1AnswerMap = new Map(person1Answers.map(answer => [answer.question.id, answer]));
    const person2AnswerMap = new Map(person2Answers.map(answer => [answer.question.id, answer]));
    
    // Find common questions
    const commonQuestions = questions.filter(q => 
      person1AnswerMap.has(q.id) && person2AnswerMap.has(q.id)
    );
    
    console.log('Common question IDs:', commonQuestions.length);
    
    // Calculate from Person 1's perspective (Person 1's Looking For vs Person 2's Me)
    const results1: CalculationResult[] = commonQuestions.map(question => {
      const p1Answer = person1AnswerMap.get(question.id)!;
      const p2Answer = person2AnswerMap.get(question.id)!;
      
      const delta = Math.abs(p1Answer.looking_for_answer - p2Answer.me_answer);
      const max = 4 * p1Answer.looking_for_multiplier;
      const adj = Math.max(0, max - (delta * p1Answer.looking_for_multiplier));
      
      return {
        question: question.text,
        p1Me: p1Answer.me_answer,
        p2Me: p2Answer.me_answer,
        p1LookingFor: p1Answer.looking_for_answer,
        p2LookingFor: p2Answer.looking_for_answer,
        p1Multiplier: p1Answer.looking_for_multiplier,
        delta,
        adj,
        max
      };
    });
    
    // Calculate from Person 2's perspective (Person 2's Looking For vs Person 1's Me)
    const results2: CalculationResult[] = commonQuestions.map(question => {
      const p1Answer = person1AnswerMap.get(question.id)!;
      const p2Answer = person2AnswerMap.get(question.id)!;
      
      const delta = Math.abs(p2Answer.looking_for_answer - p1Answer.me_answer);
      const max = 4 * p2Answer.looking_for_multiplier;
      const adj = Math.max(0, max - (delta * p2Answer.looking_for_multiplier));
      
      return {
        question: question.text,
        p1Me: p1Answer.me_answer,
        p2Me: p2Answer.me_answer,
        p1LookingFor: p1Answer.looking_for_answer,
        p2LookingFor: p2Answer.looking_for_answer,
        p1Multiplier: p2Answer.looking_for_multiplier,
        delta,
        adj,
        max
      };
    });
    
    // Calculate compatibility percentages
    const totalAdj1 = results1.reduce((sum, r) => sum + r.adj, 0);
    const totalMax1 = results1.reduce((sum, r) => sum + r.max, 0);
    const percentage1 = totalMax1 > 0 ? Math.round((totalAdj1 / totalMax1) * 100) : 0;
    
    const totalAdj2 = results2.reduce((sum, r) => sum + r.adj, 0);
    const totalMax2 = results2.reduce((sum, r) => sum + r.max, 0);
    const percentage2 = totalMax2 > 0 ? Math.round((totalAdj2 / totalMax2) * 100) : 0;
    
    // Calculate overall compatibility (average of both percentages)
    const overall = Math.round((percentage1 + percentage2) / 2);
    
    // Set results
    setCalculationResults1(results1);
    setCalculationResults2(results2);
    setCompatibilityPercentage1(percentage1);
    setCompatibilityPercentage2(percentage2);
    setOverallCompatibility(overall);
    setShowResults(true);
    setCalculating(false);
    
    console.log('Calculation complete!', {
      results1: results1.length,
      results2: results2.length,
      percentage1,
      percentage2,
      overall
    });
  };

  const getPersonName = (id: string) => {
    if (id === person1 && person1Search) {
      const match = person1Search.match(/^(.+?)\s*\(/);
      return match ? match[1].trim() : person1Search;
    }
    if (id === person2 && person2Search) {
      const match = person2Search.match(/^(.+?)\s*\(/);
      return match ? match[1].trim() : person2Search;
    }
    return `User ${id.slice(0, 8)}...`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-[#672DB7] mb-4"></i>
          <p className="text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Individual Calculation</h1>
        <p className="text-gray-600 mt-2">Calculate compatibility between two users</p>
      </div>

      {/* Person Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Person 1 Selection */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Person 1
            </label>
            <input
              type="text"
              value={person1Search}
              onChange={(e) => handlePerson1Search(e.target.value)}
              placeholder="Search by name, username, or email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white text-gray-900"
            />
            {person1Results.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {person1Results.map(user => (
                  <button
                    key={user.id}
                    onClick={() => selectPerson1(user)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none cursor-pointer"
                  >
                    <div className="font-medium">{user.first_name} {user.last_name}</div>
                    <div className="text-sm text-gray-500">@{user.username} • {user.email}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Person 2 Selection */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Person 2
            </label>
            <input
              type="text"
              value={person2Search}
              onChange={(e) => handlePerson2Search(e.target.value)}
              placeholder="Search by name, username, or email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white text-gray-900"
            />
            {person2Results.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {person2Results.map(user => (
                  <button
                    key={user.id}
                    onClick={() => selectPerson2(user)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none cursor-pointer"
                  >
                    <div className="font-medium">{user.first_name} {user.last_name}</div>
                    <div className="text-sm text-gray-500">@{user.username} • {user.email}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Calculate Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={calculateCompatibility}
            disabled={!person1 || !person2 || calculating}
            className="bg-[#672DB7] text-white px-8 py-3 rounded-lg hover:bg-[#5a259f] transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {calculating ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Calculating...
              </>
            ) : (
              <>
                <i className="fas fa-calculator mr-2"></i>
                Calculate Compatibility
              </>
            )}
          </button>
        </div>
      </div>

      {/* Debug Information */}
      {(person1 || person2) && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Debug Information:</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Total Questions: {questions.length}</p>
            {person1 && (
              <p>Person 1 ({getPersonName(person1)}) Answers: {userAnswers[person1]?.length || 0}</p>
            )}
            {person2 && (
              <p>Person 2 ({getPersonName(person2)}) Answers: {userAnswers[person2]?.length || 0}</p>
            )}
            {person1 && person2 && (
              <p>Common Questions: {questions.filter(q => 
                userAnswers[person1]?.some(a => a.question.id === q.id) && 
                userAnswers[person2]?.some(a => a.question.id === q.id)
              ).length}</p>
            )}
          </div>
        </div>
      )}

      {/* Calculation Results */}
      {showResults && (
        <>
          {/* Person 1's Perspective */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {getPersonName(person1)}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Compatibility calculation from {getPersonName(person1)}&apos;s perspective
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Question
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      P1→Me Answer Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      P2→Me Answer Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      P1→Looking For Multiplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Delta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Adj
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Max
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {calculationResults1.map((result, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        <div className="truncate">{result.question}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.p1LookingFor}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.p2Me}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.p1Multiplier}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.delta}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.adj}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.max}
                      </td>
                    </tr>
                  ))}
                  {/* Summary Row */}
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      Summary
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Total Adj: {calculationResults1.reduce((sum, r) => sum + r.adj, 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Total Max: {calculationResults1.reduce((sum, r) => sum + r.max, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Compatibility Result */}
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {getPersonName(person2)}&apos;s compatibility w.r.t {getPersonName(person1)}: {compatibilityPercentage1}%
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Based on {calculationResults1.length} questions
                </p>
              </div>
            </div>
          </div>

          {/* Person 2's Perspective */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {getPersonName(person2)}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Compatibility calculation from {getPersonName(person2)}&apos;s perspective
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Question
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      P2→Looking For Answer Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      P1→Self Answer Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      P2→Looking For Multiplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Delta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Adj
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Max
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {calculationResults2.map((result, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        <div className="truncate">{result.question}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.p2LookingFor}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.p1Me}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.p1Multiplier}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.delta}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.adj}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.max}
                      </td>
                    </tr>
                  ))}
                  {/* Summary Row */}
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      Summary
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Total Adj: {calculationResults2.reduce((sum, r) => sum + r.adj, 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Total Max: {calculationResults2.reduce((sum, r) => sum + r.max, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Compatibility Result */}
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {getPersonName(person1)}&apos;s compatibility w.r.t {getPersonName(person2)}: {compatibilityPercentage2}%
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Based on {calculationResults2.length} questions
                </p>
              </div>
            </div>
          </div>

          {/* Overall Compatibility */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Overall Compatibility
              </h3>
              <div className="text-3xl font-bold text-[#672DB7] mb-2">
                {overallCompatibility}%
              </div>
              <p className="text-sm text-gray-600">
                Average compatibility between {getPersonName(person1)} and {getPersonName(person2)}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 