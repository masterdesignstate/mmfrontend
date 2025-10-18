'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import type { ApiUser, UserAnswer, Question } from '@/services/api';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

type MatchStatus = 'match' | 'mismatch' | 'open';

interface DirectionalResult {
  questionNumber: number;
  question: string;
  preferenceValue: number;
  preferenceOpen: boolean;
  importance: number;
  importanceFactor: number;
  counterpartValue: number;
  counterpartOpen: boolean;
  score: number;
  maxScore: number;
  delta: number | null;
  status: MatchStatus;
}

interface ControlsState {
  adjust: number;
  exponent: number;
  ota: number;
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
  const [calculationResults1, setCalculationResults1] = useState<DirectionalResult[]>([]);
  const [calculationResults2, setCalculationResults2] = useState<DirectionalResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [compatibilityPercentage1, setCompatibilityPercentage1] = useState(0);
  const [compatibilityPercentage2, setCompatibilityPercentage2] = useState(0);
  const [overallCompatibility, setOverallCompatibility] = useState(0);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [controls, setControls] = useState<ControlsState>({ adjust: 5.0, exponent: 2.0, ota: 0.5 });
  const [controlsLoaded, setControlsLoaded] = useState(false);
  const [controlsError, setControlsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('Fetching questions...');
        const questionsData = await apiService.getQuestions();
        console.log('Fetched questions:', questionsData.length);
        setQuestions(questionsData);
      } catch (error) {
        console.error('Error fetching questions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchControls = async () => {
      try {
        const response = await fetch(getApiUrl(API_ENDPOINTS.CONTROLS_CURRENT), {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch controls: ${response.status}`);
        }

        const data = await response.json();
        setControls({
          adjust: Number(data.adjust ?? 5.0),
          exponent: Number(data.exponent ?? 2.0),
          ota: Number(data.ota ?? 0.5),
        });
        setControlsError(null);
      } catch (error) {
        console.error('Error fetching controls:', error);
        setControls({
          adjust: 5.0,
          exponent: 2.0,
          ota: 0.5,
        });
        setControlsError('Using default controls because the configured values could not be loaded.');
      } finally {
        setControlsLoaded(true);
      }
    };

    fetchControls();
  }, []);

  // Search users function
  const searchUsers = async (query: string, excludeIds: string[] = []): Promise<ApiUser[]> => {
    console.log('searchUsers called with query:', query, 'excludeIds:', excludeIds);
    if (!query || query.trim().length < 2) return [];
    try {
      console.log('Calling API search...');
      const users = await apiService.searchUsers(query, 8);
      console.log('API search results:', users.length, users);
      const filtered = users
        .filter(user => !excludeIds.includes(user.id))
        .slice(0, 8);
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
        setLoadingAnswers(true);
        const answers = await apiService.getUserAnswers(userId);
        setUserAnswers(prev => ({ ...prev, [userId]: answers }));
      } catch (error) {
        console.error('Error fetching user answers:', error);
      } finally {
        setLoadingAnswers(false);
      }
    };

    if (person1 && !userAnswers[person1]) {
      fetchAnswers(person1);
    }
    if (person2 && !userAnswers[person2]) {
      fetchAnswers(person2);
    }
  }, [person1, person2, userAnswers]);

  const resolveQuestionNumber = (question: Question, index: number): number => {
    if (typeof question.question_number === 'number') {
      return question.question_number;
    }
    const parsed = Number.parseInt(question.id, 10);
    return Number.isNaN(parsed) ? index + 1 : parsed;
  };

  const mapImportanceToFactor = (importanceLevel?: number): number => {
    const level = Number.isFinite(Number(importanceLevel)) ? Number(importanceLevel) : 1;
    const exponent = controls.exponent;

    if (level <= 1) return 0;
    if (level === 2) return 0.5;
    if (level === 3) return 1.0;
    if (level >= 4) {
      return 1.0 + Math.pow(level - 3, exponent);
    }
    return 1.0;
  };

  const getImportanceLevel = (primary?: number, fallback?: number): number => {
    const level = primary ?? fallback;
    const numeric = Number(level);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
  };

  // Mirrors backend compatibility_service.calculate_question_score to keep math consistent in the UI
  const computeQuestionScores = (p1Answer: UserAnswer, p2Answer: UserAnswer) => {
    const adjust = controls.adjust;
    const ota = controls.ota;

    const p1ImportanceLevel = getImportanceLevel(
      p1Answer.looking_for_importance,
      p1Answer.looking_for_multiplier
    );
    const p2ImportanceLevel = getImportanceLevel(
      p2Answer.looking_for_importance,
      p2Answer.looking_for_multiplier
    );

    const p1ImportanceFactor = mapImportanceToFactor(p1ImportanceLevel);
    const p2ImportanceFactor = mapImportanceToFactor(p2ImportanceLevel);

    let deltaA: number | null = null;
    let deltaB: number | null = null;

    let scoreA = 0;
    let maxA = 0;
    let statusA: MatchStatus = 'mismatch';

    if (
      Boolean(p1Answer.looking_for_open_to_all) ||
      p1Answer.looking_for_answer === 6 ||
      p2Answer.me_answer === 6
    ) {
      scoreA = adjust * ota;
      maxA = adjust;
      statusA = 'open';
    } else {
      deltaA = Math.abs(p1Answer.looking_for_answer - p2Answer.me_answer);
      const adjA = adjust - deltaA;
      scoreA = Math.max(0, adjA * p1ImportanceFactor);
      maxA = adjust * p1ImportanceFactor;
      statusA = deltaA === 0 ? 'match' : 'mismatch';
    }

    let scoreB = 0;
    let maxB = 0;
    let statusB: MatchStatus = 'mismatch';

    if (
      Boolean(p2Answer.me_open_to_all) ||
      p2Answer.looking_for_answer === 6 ||
      p1Answer.me_answer === 6
    ) {
      scoreB = adjust * ota;
      maxB = adjust;
      statusB = 'open';
    } else {
      deltaB = Math.abs(p2Answer.looking_for_answer - p1Answer.me_answer);
      const adjB = adjust - deltaB;
      scoreB = Math.max(0, adjB * p2ImportanceFactor);
      maxB = adjust * p2ImportanceFactor;
      statusB = deltaB === 0 ? 'match' : 'mismatch';
    }

    return {
      directionA: {
        score: scoreA,
        max: maxA,
        importanceLevel: p1ImportanceLevel,
        importanceFactor: p1ImportanceFactor,
        delta: deltaA,
        status: statusA,
      },
      directionB: {
        score: scoreB,
        max: maxB,
        importanceLevel: p2ImportanceLevel,
        importanceFactor: p2ImportanceFactor,
        delta: deltaB,
        status: statusB,
      },
    };
  };

  const calculateCompatibility = () => {
    if (!person1 || !person2 || !controlsLoaded) return;

    setCalculating(true);

    try {
      const person1Answers = userAnswers[person1] || [];
      const person2Answers = userAnswers[person2] || [];

      const person1AnswerMap = new Map(person1Answers.map(answer => [answer.question.id, answer]));
      const person2AnswerMap = new Map(person2Answers.map(answer => [answer.question.id, answer]));

      const mutualQuestions = questions.filter(
        q => person1AnswerMap.has(q.id) && person2AnswerMap.has(q.id)
      );

      if (mutualQuestions.length === 0) {
        setCalculationResults1([]);
        setCalculationResults2([]);
        setCompatibilityPercentage1(0);
        setCompatibilityPercentage2(0);
        setOverallCompatibility(0);
        setShowResults(true);
        return;
      }

      const results1: DirectionalResult[] = [];
      const results2: DirectionalResult[] = [];

      let totalScoreA = 0;
      let totalMaxA = 0;
      let totalScoreB = 0;
      let totalMaxB = 0;

      mutualQuestions.forEach((question, index) => {
        const p1Answer = person1AnswerMap.get(question.id)!;
        const p2Answer = person2AnswerMap.get(question.id)!;

        const { directionA, directionB } = computeQuestionScores(p1Answer, p2Answer);

        totalScoreA += directionA.score;
        totalMaxA += directionA.max;
        totalScoreB += directionB.score;
        totalMaxB += directionB.max;

        const questionNumber = resolveQuestionNumber(question, index);
        const p1PreferenceOpen =
          Boolean(p1Answer.looking_for_open_to_all) || p1Answer.looking_for_answer === 6;
        const p2PreferenceOpen =
          Boolean(p2Answer.looking_for_open_to_all) || p2Answer.looking_for_answer === 6;
        const p1SelfOpen = Boolean(p1Answer.me_open_to_all) || p1Answer.me_answer === 6;
        const p2SelfOpen = Boolean(p2Answer.me_open_to_all) || p2Answer.me_answer === 6;

        results1.push({
          questionNumber,
          question: question.text,
          preferenceValue: p1Answer.looking_for_answer,
          preferenceOpen: p1PreferenceOpen,
          importance: directionA.importanceLevel,
          importanceFactor: directionA.importanceFactor,
          counterpartValue: p2Answer.me_answer,
          counterpartOpen: p2SelfOpen,
          score: directionA.score,
          maxScore: directionA.max,
          delta: directionA.delta,
          status: directionA.status,
        });

        results2.push({
          questionNumber,
          question: question.text,
          preferenceValue: p2Answer.looking_for_answer,
          preferenceOpen: p2PreferenceOpen,
          importance: directionB.importanceLevel,
          importanceFactor: directionB.importanceFactor,
          counterpartValue: p1Answer.me_answer,
          counterpartOpen: p1SelfOpen,
          score: directionB.score,
          maxScore: directionB.max,
          delta: directionB.delta,
          status: directionB.status,
        });
      });

      const percentage1Raw = totalMaxA > 0 ? (totalScoreA / totalMaxA) * 100 : 0;
      const percentage2Raw = totalMaxB > 0 ? (totalScoreB / totalMaxB) * 100 : 0;

      const percentage1 = Number.isFinite(percentage1Raw)
        ? parseFloat(percentage1Raw.toFixed(2))
        : 0;
      const percentage2 = Number.isFinite(percentage2Raw)
        ? parseFloat(percentage2Raw.toFixed(2))
        : 0;

      const overallRaw =
        percentage1 > 0 && percentage2 > 0
          ? Math.sqrt(percentage1 * percentage2)
          : 0;
      const overall = Number.isFinite(overallRaw) ? parseFloat(overallRaw.toFixed(2)) : 0;

      setCalculationResults1(results1);
      setCalculationResults2(results2);
      setCompatibilityPercentage1(percentage1);
      setCompatibilityPercentage2(percentage2);
      setOverallCompatibility(overall);
      setShowResults(true);
    } finally {
      setCalculating(false);
    }
  };

  const totalScore1 = calculationResults1.reduce((sum, r) => sum + r.score, 0);
  const totalMax1 = calculationResults1.reduce((sum, r) => sum + r.maxScore, 0);
  const totalScore2 = calculationResults2.reduce((sum, r) => sum + r.score, 0);
  const totalMax2 = calculationResults2.reduce((sum, r) => sum + r.maxScore, 0);

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

  const formatScore = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    const rounded = Number(value.toFixed(2));
    return Number.isInteger(rounded) ? `${rounded.toFixed(0)}` : `${rounded}`;
  };

  const formatFactor = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    const formatted = value.toFixed(2);
    return formatted.replace(/\.00$/, '');
  };

  const formatDelta = (value: number | null) => {
    if (value === null || !Number.isFinite(value)) return '—';
    return value.toString();
  };

  const formatPercent = (value: number) => {
    if (!Number.isFinite(value)) return '0%';
    const fixed = value.toFixed(2);
    if (fixed.endsWith('00')) {
      return `${Number.parseInt(fixed, 10)}%`;
    }
    if (fixed.endsWith('0')) {
      return `${Number.parseFloat(fixed).toFixed(1)}%`;
    }
    return `${Number.parseFloat(fixed)}%`;
  };

  const displayAnswerValue = (value: number, isOpen: boolean) => {
    if (isOpen && value === 6) {
      return 'Open (6)';
    }
    return value;
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
              placeholder="Search by name or username..."
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
                    <div className="text-sm text-gray-500">@{user.username}</div>
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
              placeholder="Search by name or username..."
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
                    <div className="text-sm text-gray-500">@{user.username}</div>
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
            disabled={!person1 || !person2 || calculating || !controlsLoaded}
            className="bg-[#672DB7] text-white px-8 py-3 rounded-lg hover:bg-[#5a259f] transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {!controlsLoaded ? (
              <>
                <i className="fas fa-cog fa-spin mr-2"></i>
                Loading Controls...
              </>
            ) : calculating ? (
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
        <div className="mt-4 text-center text-sm text-gray-500 space-y-1">
          {controlsLoaded ? (
            <p>
              Using controls — Adjust: {formatScore(controls.adjust)}, Exponent: {formatScore(controls.exponent)}, OTA: {formatScore(controls.ota)}
            </p>
          ) : (
            <p>Fetching control values…</p>
          )}
          {controlsError && (
            <p className="text-xs text-red-500">{controlsError}</p>
          )}
        </div>
      </div>

      {/* Overall Compatibility summary below inputs */}
      {showResults && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Overall Compatibility</h3>
            <div className="text-4xl font-extrabold text-[#672DB7] mb-4">{formatPercent(overallCompatibility)}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 rounded border border-gray-200">
                <div className="text-sm text-gray-600">{getPersonName(person1)} → {getPersonName(person2)}</div>
                <div className="text-2xl font-semibold text-green-600">{formatPercent(compatibilityPercentage1)}</div>
              </div>
              <div className="p-3 rounded border border-gray-200">
                <div className="text-sm text-gray-600">{getPersonName(person2)} → {getPersonName(person1)}</div>
                <div className="text-2xl font-semibold text-blue-600">{formatPercent(compatibilityPercentage2)}</div>
              </div>
              <div className="p-3 rounded border border-gray-200">
                <div className="text-sm text-gray-600">Total Questions</div>
                <div className="text-2xl font-semibold text-gray-900">{calculationResults1.length}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Screen for User Answers */}
      {loadingAnswers && (
        <div className="mt-4 p-6 bg-white rounded-lg shadow">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
              <i className="fas fa-spinner fa-spin text-3xl text-[#672DB7]"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Loading User Answers
            </h3>
            <p className="text-sm text-gray-600">
              Fetching compatibility data for selected users...
            </p>
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
                      Question No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Question
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Answer (Me)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      OTA (Me)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Importance (Factor)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Answer (Them)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      OTA (Them)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Max
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Delta
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {calculationResults1.map((result, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.questionNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-normal break-words">
                        {result.question}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {displayAnswerValue(result.preferenceValue, result.preferenceOpen)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.preferenceOpen ? 'Yes' : 'No'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.importance} ({formatFactor(result.importanceFactor)})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {displayAnswerValue(result.counterpartValue, result.counterpartOpen)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.counterpartOpen ? 'Yes' : 'No'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatScore(result.score)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatScore(result.maxScore)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDelta(result.delta)}
                      </td>
                    </tr>
                  ))}
                  {/* Summary Row */}
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      Summary
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Total Value: {formatScore(totalScore1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Total Max: {formatScore(totalMax1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Compatibility Result removed for minimalism */}
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
                      Question No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Question
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Answer (Me)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      OTA (Me)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Importance (Factor)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Answer (Them)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      OTA (Them)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Max
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Delta
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {calculationResults2.map((result, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.questionNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-normal break-words">
                        {result.question}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {displayAnswerValue(result.preferenceValue, result.preferenceOpen)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.preferenceOpen ? 'Yes' : 'No'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.importance} ({formatFactor(result.importanceFactor)})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {displayAnswerValue(result.counterpartValue, result.counterpartOpen)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.counterpartOpen ? 'Yes' : 'No'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatScore(result.score)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatScore(result.maxScore)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDelta(result.delta)}
                      </td>
                    </tr>
                  ))}
                  {/* Summary Row */}
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      Summary
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Total Value: {formatScore(totalScore2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Total Max: {formatScore(totalMax2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Compatibility Result removed for minimalism */}
          </div>
            
        </>
      )}
    </div>
  );
} 
