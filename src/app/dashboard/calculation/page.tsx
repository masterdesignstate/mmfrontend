'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import type { ApiUser, UserAnswer, Question } from '@/services/api';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

type MatchStatus = 'match' | 'mismatch' | 'open' | 'not_answered';

interface DirectionalResult {
  questionNumber: number;
  questionId: string;
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
  notAnsweredBy?: string; // name of user who hasn't answered
}

interface ControlsState {
  adjust: number;
  exponent: number;
  ota: number;
}

interface MissingQuestion {
  id: string;
  questionNumber: number;
  text: string;
  missingUser: string; // name of the user who hasn't answered
}

interface RequiredCompatResult {
  percentage1: number;
  percentage2: number;
  overall: number;
  mutualCount: number;
  totalRequired: number;
  p1Answered: number;
  p2Answered: number;
  p1Completeness: number;
  p2Completeness: number;
  missingQuestions: MissingQuestion[];
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
  const [savedControls, setSavedControls] = useState<ControlsState>({ adjust: 5.0, exponent: 2.0, ota: 0.5 });
  const [controlsLoaded, setControlsLoaded] = useState(false);
  const [controlsError, setControlsError] = useState<string | null>(null);
  const [p1RequiredIds, setP1RequiredIds] = useState<Set<string>>(new Set());
  const [p2RequiredIds, setP2RequiredIds] = useState<Set<string>>(new Set());
  const [p1RequiredResult, setP1RequiredResult] = useState<RequiredCompatResult | null>(null);
  const [p2RequiredResult, setP2RequiredResult] = useState<RequiredCompatResult | null>(null);
  const [showRequired, setShowRequired] = useState(false);
  const [requiredScope, setRequiredScope] = useState<'p1' | 'p2'>('p1');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const questionsData = await apiService.getQuestions();
        setQuestions(questionsData);
      } catch (error) {
        console.error('Error fetching questions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchControlsFromServer = async () => {
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.CONTROLS_CURRENT), {
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch controls: ${response.status}`);
      }

      const data = await response.json();
      const fetched = {
        adjust: Number(data.adjust ?? 5.0),
        exponent: Number(data.exponent ?? 2.0),
        ota: Number(data.ota ?? 0.5),
      };
      setControls(fetched);
      setSavedControls(fetched);
      setControlsError(null);
    } catch (error) {
      console.error('Error fetching controls:', error);
      const defaults = { adjust: 5.0, exponent: 2.0, ota: 0.5 };
      setControls(defaults);
      setSavedControls(defaults);
      setControlsError('Using default controls because the configured values could not be loaded.');
    } finally {
      setControlsLoaded(true);
    }
  };

  useEffect(() => {
    fetchControlsFromServer();
  }, []);

  // Search users function
  const searchUsers = async (query: string, excludeIds: string[] = []): Promise<ApiUser[]> => {
    if (!query || query.trim().length < 2) return [];
    try {
      const users = await apiService.searchUsers(query, 8);
      return users.filter(user => !excludeIds.includes(user.id)).slice(0, 8);
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  };

  const handlePerson1Search = async (query: string) => {
    setPerson1Search(query);
    if (query.trim().length >= 2) {
      const results = await searchUsers(query, person2 ? [person2] : []);
      setPerson1Results(results);
    } else {
      setPerson1Results([]);
    }
  };

  const handlePerson2Search = async (query: string) => {
    setPerson2Search(query);
    if (query.trim().length >= 2) {
      const results = await searchUsers(query, person1 ? [person1] : []);
      setPerson2Results(results);
    } else {
      setPerson2Results([]);
    }
  };

  const selectPerson1 = (user: ApiUser) => {
    setPerson1(user.id);
    setPerson1Search(`${user.first_name} ${user.last_name} (${user.username})`);
    setPerson1Results([]);
  };

  const selectPerson2 = (user: ApiUser) => {
    setPerson2(user.id);
    setPerson2Search(`${user.first_name} ${user.last_name} (${user.username})`);
    setPerson2Results([]);
  };

  // Fetch user answers and required question IDs when person changes
  useEffect(() => {
    let cancelled = false;

    const fetchAllUserData = async () => {
      const tasks: Array<{ userId: string; setReqIds: (ids: Set<string>) => void }> = [];
      if (person1) tasks.push({ userId: person1, setReqIds: setP1RequiredIds });
      if (person2) tasks.push({ userId: person2, setReqIds: setP2RequiredIds });
      if (tasks.length === 0) return;

      setLoadingAnswers(true);
      try {
        await Promise.all(tasks.map(async ({ userId, setReqIds }) => {
          const [answers, reqIds] = await Promise.all([
            userAnswers[userId] ? Promise.resolve(userAnswers[userId]) : apiService.getUserAnswers(userId),
            apiService.getRequiredQuestionIds(userId),
          ]);
          if (cancelled) return;
          if (!userAnswers[userId]) {
            setUserAnswers(prev => ({ ...prev, [userId]: answers }));
          }
          setReqIds(new Set(reqIds.map(id => String(id).toLowerCase())));
        }));
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        if (!cancelled) setLoadingAnswers(false);
      }
    };

    fetchAllUserData();
    return () => { cancelled = true; };
  }, [person1, person2]);

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

  // Compute compatibility scores for a subset of mutual questions
  const computeSubsetScores = (
    mutualQuestions: Question[],
    person1AnswerMap: Map<string, UserAnswer>,
    person2AnswerMap: Map<string, UserAnswer>,
  ) => {
    let totalScoreA = 0, totalMaxA = 0, totalScoreB = 0, totalMaxB = 0;

    for (const question of mutualQuestions) {
      const p1Answer = person1AnswerMap.get(question.id)!;
      const p2Answer = person2AnswerMap.get(question.id)!;
      const { directionA, directionB } = computeQuestionScores(p1Answer, p2Answer);
      totalScoreA += directionA.score;
      totalMaxA += directionA.max;
      totalScoreB += directionB.score;
      totalMaxB += directionB.max;
    }

    const pct1Raw = totalMaxA > 0 ? (totalScoreA / totalMaxA) * 100 : 0;
    const pct2Raw = totalMaxB > 0 ? (totalScoreB / totalMaxB) * 100 : 0;
    const pct1 = Number.isFinite(pct1Raw) ? parseFloat(pct1Raw.toFixed(2)) : 0;
    const pct2 = Number.isFinite(pct2Raw) ? parseFloat(pct2Raw.toFixed(2)) : 0;
    const overallRaw = pct1 > 0 && pct2 > 0 ? Math.sqrt(pct1 * pct2) : 0;
    const overall = Number.isFinite(overallRaw) ? parseFloat(overallRaw.toFixed(2)) : 0;

    return { percentage1: pct1, percentage2: pct2, overall };
  };

  const calculateCompatibility = async () => {
    if (!person1 || !person2 || !controlsLoaded) return;

    setCalculating(true);

    try {
      // Refetch answers and required IDs fresh each time
      const [p1Answers, p2Answers, p1ReqIds, p2ReqIds] = await Promise.all([
        apiService.getUserAnswers(person1),
        apiService.getUserAnswers(person2),
        apiService.getRequiredQuestionIds(person1),
        apiService.getRequiredQuestionIds(person2),
      ]);

      // Update state with fresh data
      setUserAnswers(prev => ({ ...prev, [person1]: p1Answers, [person2]: p2Answers }));
      const freshP1RequiredIds = new Set(p1ReqIds.map(id => String(id).toLowerCase()));
      const freshP2RequiredIds = new Set(p2ReqIds.map(id => String(id).toLowerCase()));
      setP1RequiredIds(freshP1RequiredIds);
      setP2RequiredIds(freshP2RequiredIds);

      const person1Answers = p1Answers;
      const person2Answers = p2Answers;

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
        setP1RequiredResult(null);
        setP2RequiredResult(null);
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
          questionId: question.id,
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
          questionId: question.id,
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

      // Add "not answered" rows for required questions that only one user answered
      // P1's required that P2 hasn't answered
      const mutualIds = new Set(mutualQuestions.map(q => q.id));
      for (const question of questions) {
        if (mutualIds.has(question.id)) continue;
        const qIdLower = question.id.toLowerCase();
        const questionNumber = question.question_number ?? 0;

        // P1 required, P1 answered, P2 didn't answer → show in P1's table as "P2 not answered"
        if (freshP1RequiredIds.has(qIdLower) && person1AnswerMap.has(question.id) && !person2AnswerMap.has(question.id)) {
          const p1Answer = person1AnswerMap.get(question.id)!;
          results1.push({
            questionNumber,
            questionId: question.id,
            question: question.text,
            preferenceValue: p1Answer.looking_for_answer,
            preferenceOpen: Boolean(p1Answer.looking_for_open_to_all) || p1Answer.looking_for_answer === 6,
            importance: getImportanceLevel(p1Answer.looking_for_importance, p1Answer.looking_for_multiplier),
            importanceFactor: mapImportanceToFactor(getImportanceLevel(p1Answer.looking_for_importance, p1Answer.looking_for_multiplier)),
            counterpartValue: 0,
            counterpartOpen: false,
            score: 0,
            maxScore: 0,
            delta: null,
            status: 'not_answered',
            notAnsweredBy: p2Name,
          });
        }

        // P2 required, P2 answered, P1 didn't answer → show in P2's table as "P1 not answered"
        if (freshP2RequiredIds.has(qIdLower) && person2AnswerMap.has(question.id) && !person1AnswerMap.has(question.id)) {
          const p2Answer = person2AnswerMap.get(question.id)!;
          results2.push({
            questionNumber,
            questionId: question.id,
            question: question.text,
            preferenceValue: p2Answer.looking_for_answer,
            preferenceOpen: Boolean(p2Answer.looking_for_open_to_all) || p2Answer.looking_for_answer === 6,
            importance: getImportanceLevel(p2Answer.looking_for_importance, p2Answer.looking_for_multiplier),
            importanceFactor: mapImportanceToFactor(getImportanceLevel(p2Answer.looking_for_importance, p2Answer.looking_for_multiplier)),
            counterpartValue: 0,
            counterpartOpen: false,
            score: 0,
            maxScore: 0,
            delta: null,
            status: 'not_answered',
            notAnsweredBy: p1Name,
          });
        }
      }

      setCalculationResults1(results1);
      setCalculationResults2(results2);
      setCompatibilityPercentage1(percentage1);
      setCompatibilityPercentage2(percentage2);
      setOverallCompatibility(overall);

      // Required compatibility: P1's required questions
      if (freshP1RequiredIds.size > 0) {
        const p1ReqMutual = mutualQuestions.filter(q => freshP1RequiredIds.has(q.id.toLowerCase()));
        const scores = computeSubsetScores(p1ReqMutual, person1AnswerMap, person2AnswerMap);
        // Completeness: of P1's required (answered by P1), what % did P2 answer?
        const p1ReqAnsweredByP1 = questions.filter(q => freshP1RequiredIds.has(q.id.toLowerCase()) && person1AnswerMap.has(q.id));
        const p2AnsweredP1Req = p1ReqAnsweredByP1.filter(q => person2AnswerMap.has(q.id));
        const p2Completeness = p1ReqAnsweredByP1.length > 0 ? p2AnsweredP1Req.length / p1ReqAnsweredByP1.length : 1.0;
        const p1Completeness = 1.0;
        // Missing: P1's required questions that P2 hasn't answered (but P1 has)
        const p2MissingP1Req = p1ReqAnsweredByP1
          .filter(q => !person2AnswerMap.has(q.id))
          .map(q => ({ id: q.id, questionNumber: q.question_number ?? 0, text: q.text, missingUser: p2Name }));
        setP1RequiredResult({
          ...scores,
          mutualCount: p1ReqMutual.length,
          totalRequired: freshP1RequiredIds.size,
          p1Answered: p1ReqAnsweredByP1.length,
          p2Answered: p2AnsweredP1Req.length,
          p1Completeness,
          p2Completeness,
          missingQuestions: p2MissingP1Req,
        });
      } else {
        setP1RequiredResult(null);
      }

      // Required compatibility: P2's required questions
      if (freshP2RequiredIds.size > 0) {
        const p2ReqMutual = mutualQuestions.filter(q => freshP2RequiredIds.has(q.id.toLowerCase()));
        const scores = computeSubsetScores(p2ReqMutual, person1AnswerMap, person2AnswerMap);
        // Completeness: of P2's required (answered by P2), what % did P1 answer?
        const p2ReqAnsweredByP2 = questions.filter(q => freshP2RequiredIds.has(q.id.toLowerCase()) && person2AnswerMap.has(q.id));
        const p1AnsweredP2Req = p2ReqAnsweredByP2.filter(q => person1AnswerMap.has(q.id));
        const p1Completeness = p2ReqAnsweredByP2.length > 0 ? p1AnsweredP2Req.length / p2ReqAnsweredByP2.length : 1.0;
        const p2Completeness = 1.0;
        // Missing: P2's required questions that P1 hasn't answered (but P2 has)
        const p1MissingP2Req = p2ReqAnsweredByP2
          .filter(q => !person1AnswerMap.has(q.id))
          .map(q => ({ id: q.id, questionNumber: q.question_number ?? 0, text: q.text, missingUser: p1Name }));
        setP2RequiredResult({
          ...scores,
          mutualCount: p2ReqMutual.length,
          totalRequired: freshP2RequiredIds.size,
          p1Answered: p1AnsweredP2Req.length,
          p2Answered: p2ReqAnsweredByP2.length,
          p1Completeness,
          p2Completeness,
          missingQuestions: p1MissingP2Req,
        });
      } else {
        setP2RequiredResult(null);
      }

      setShowResults(true);
    } finally {
      setCalculating(false);
    }
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

  const controlsModified = controls.adjust !== savedControls.adjust ||
    controls.exponent !== savedControls.exponent ||
    controls.ota !== savedControls.ota;

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

  const renderResultTable = (
    results: DirectionalResult[],
    perspectiveName: string,
    totalScore: number,
    totalMax: number,
    requiredIds: Set<string>,
    otherRequiredIds: Set<string>,
    personLabel: string,
    otherLabel: string,
  ) => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          {perspectiveName}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Compatibility calculation from {perspectiveName}&apos;s perspective
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Q#
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Req
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Question
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Answer (Me)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                OTA (Me)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Importance (Factor)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Answer (Them)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                OTA (Them)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Value
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Max
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Delta
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {results.map((result, index) => {
              const isP1Req = requiredIds.has(result.questionId.toLowerCase());
              const isP2Req = otherRequiredIds.has(result.questionId.toLowerCase());
              const isNotAnswered = result.status === 'not_answered';
              return (
                <tr key={index} className={isNotAnswered ? 'bg-red-50' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {result.questionNumber}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-xs">
                    <div className="flex gap-1">
                      {isP1Req && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">
                          {personLabel}
                        </span>
                      )}
                      {isP2Req && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                          {otherLabel}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 whitespace-normal break-words max-w-xs">
                    {result.question}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {displayAnswerValue(result.preferenceValue, result.preferenceOpen)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {result.preferenceOpen ? 'Yes' : 'No'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {result.importance} ({formatFactor(result.importanceFactor)})
                  </td>
                  {isNotAnswered ? (
                    <td colSpan={5} className="px-4 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                      Not answered by {result.notAnsweredBy}
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {displayAnswerValue(result.counterpartValue, result.counterpartOpen)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.counterpartOpen ? 'Yes' : 'No'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatScore(result.score)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatScore(result.maxScore)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDelta(result.delta)}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {/* Summary Row */}
            <tr className="bg-gray-50 font-medium">
              <td className="px-4 py-4 text-sm text-gray-900">Summary</td>
              <td className="px-4 py-4 text-sm text-gray-900">-</td>
              <td className="px-4 py-4 text-sm text-gray-900">-</td>
              <td className="px-4 py-4 text-sm text-gray-900">-</td>
              <td className="px-4 py-4 text-sm text-gray-900">-</td>
              <td className="px-4 py-4 text-sm text-gray-900">-</td>
              <td className="px-4 py-4 text-sm text-gray-900">-</td>
              <td className="px-4 py-4 text-sm text-gray-900">-</td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                Total: {formatScore(totalScore)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                Total: {formatScore(totalMax)}
              </td>
              <td className="px-4 py-4 text-sm text-gray-900">-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const p1Name = person1 ? getPersonName(person1) : 'P1';
  const p2Name = person2 ? getPersonName(person2) : 'P2';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Individual Calculation</h1>
        <p className="text-gray-600 mt-2">Calculate compatibility between two users</p>
      </div>

      {/* Person Selection & Controls */}
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

        {/* Editable Controls */}
        <div className="mt-6 border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Algorithm Controls</h3>
            {controlsModified && (
              <button
                onClick={() => setControls({ ...savedControls })}
                className="text-xs text-[#672DB7] hover:underline cursor-pointer"
              >
                Reset to Saved
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Adjust</label>
              <input
                type="number"
                step="0.1"
                value={controls.adjust}
                onChange={(e) => setControls(prev => ({ ...prev, adjust: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white text-gray-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Exponent</label>
              <input
                type="number"
                step="0.1"
                value={controls.exponent}
                onChange={(e) => setControls(prev => ({ ...prev, exponent: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white text-gray-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">OTA</label>
              <input
                type="number"
                step="0.1"
                value={controls.ota}
                onChange={(e) => setControls(prev => ({ ...prev, ota: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white text-gray-900 text-sm"
              />
            </div>
          </div>
          {controlsModified && (
            <p className="mt-2 text-xs text-amber-600">
              Controls modified locally. Saved values: Adjust {formatScore(savedControls.adjust)}, Exponent {formatScore(savedControls.exponent)}, OTA {formatScore(savedControls.ota)}
            </p>
          )}
          {controlsError && (
            <p className="mt-2 text-xs text-red-500">{controlsError}</p>
          )}
        </div>

        {/* Calculate Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={calculateCompatibility}
            disabled={!person1 || !person2 || calculating || !controlsLoaded || loadingAnswers}
            className="bg-[#672DB7] text-white px-8 py-3 rounded-lg hover:bg-[#5a259f] transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loadingAnswers ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Loading User Data...
              </>
            ) : !controlsLoaded ? (
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
      </div>

      {/* Overall Compatibility summary */}
      {showResults && (() => {
        const activeResult = showRequired
          ? (requiredScope === 'p1' ? p1RequiredResult : p2RequiredResult)
          : null;
        const scopeOwner = requiredScope === 'p1' ? p1Name : p2Name;
        const scopeOther = requiredScope === 'p1' ? p2Name : p1Name;

        return (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-4 mb-2">
                <h3 className="text-xl font-semibold text-gray-900">
                  {showRequired ? 'Required Compatibility' : 'Overall Compatibility'}
                </h3>
                <label className="inline-flex items-center cursor-pointer">
                  <span className="text-sm text-gray-600 mr-2">Required Only</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={showRequired}
                      onChange={(e) => setShowRequired(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#672DB7] rounded-full peer peer-checked:bg-[#672DB7] transition-colors"></div>
                    <div className="absolute left-[2px] top-[2px] bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-full"></div>
                  </div>
                </label>
              </div>

              {showRequired && (
                <div className="flex justify-center gap-2 mb-4">
                  <button
                    onClick={() => setRequiredScope('p1')}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors cursor-pointer ${
                      requiredScope === 'p1'
                        ? 'bg-green-100 border-green-300 text-green-800 font-medium'
                        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p1Name}&apos;s Required
                  </button>
                  <button
                    onClick={() => setRequiredScope('p2')}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors cursor-pointer ${
                      requiredScope === 'p2'
                        ? 'bg-blue-100 border-blue-300 text-blue-800 font-medium'
                        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p2Name}&apos;s Required
                  </button>
                </div>
              )}

              {!showRequired ? (
                <>
                  <div className="text-4xl font-extrabold text-[#672DB7] mb-4">{formatPercent(overallCompatibility)}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-3 rounded border border-gray-200">
                      <div className="text-sm text-gray-600">{p1Name} &rarr; {p2Name}</div>
                      <div className="text-2xl font-semibold text-green-600">{formatPercent(compatibilityPercentage1)}</div>
                    </div>
                    <div className="p-3 rounded border border-gray-200">
                      <div className="text-sm text-gray-600">{p2Name} &rarr; {p1Name}</div>
                      <div className="text-2xl font-semibold text-blue-600">{formatPercent(compatibilityPercentage2)}</div>
                    </div>
                    <div className="p-3 rounded border border-gray-200">
                      <div className="text-sm text-gray-600">Mutual Questions</div>
                      <div className="text-2xl font-semibold text-gray-900">{calculationResults1.filter(r => r.status !== 'not_answered').length}</div>
                    </div>
                  </div>
                </>
              ) : activeResult ? (
                <>
                  <div className="text-4xl font-extrabold text-[#672DB7] mb-4">{formatPercent(activeResult.overall)}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="p-3 rounded border border-gray-200">
                      <div className="text-sm text-gray-600">{p1Name} &rarr; {p2Name}</div>
                      <div className="text-2xl font-semibold text-green-600">{formatPercent(activeResult.percentage1)}</div>
                    </div>
                    <div className="p-3 rounded border border-gray-200">
                      <div className="text-sm text-gray-600">{p2Name} &rarr; {p1Name}</div>
                      <div className="text-2xl font-semibold text-blue-600">{formatPercent(activeResult.percentage2)}</div>
                    </div>
                    <div className="p-3 rounded border border-gray-200">
                      <div className="text-sm text-gray-600">Mutual / Total Required</div>
                      <div className="text-2xl font-semibold text-gray-900">{activeResult.mutualCount} / {activeResult.totalRequired}</div>
                    </div>
                    <div className={`p-3 rounded border ${activeResult.p2Completeness < 1.0 || activeResult.p1Completeness < 1.0 ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
                      <div className="text-sm text-gray-600">Completeness</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {scopeOther}: {requiredScope === 'p1' ? activeResult.p2Answered : activeResult.p1Answered}/{requiredScope === 'p1' ? activeResult.p1Answered : activeResult.p2Answered}
                        {' '}({formatPercent((requiredScope === 'p1' ? activeResult.p2Completeness : activeResult.p1Completeness) * 100)})
                      </div>
                    </div>
                  </div>
                  {activeResult.missingQuestions.length > 0 && (
                    <div className="mt-4 text-left border-t border-red-200 pt-3">
                      <div className="text-sm text-red-600 font-medium mb-2">
                        Not answered by {activeResult.missingQuestions[0].missingUser} ({activeResult.missingQuestions.length})
                      </div>
                      <ul className="space-y-1">
                        {activeResult.missingQuestions.map(q => (
                          <li key={q.id} className="text-sm text-gray-700 flex items-start gap-1">
                            <span className="text-red-400 mt-0.5">&#x2022;</span>
                            <span>Q#{q.questionNumber}: {q.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500">No required questions set for {scopeOwner}</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Required Compatibility (side-by-side, hidden when toggle ON) */}
      {showResults && !showRequired && (p1RequiredResult || p2RequiredResult) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Required Compatibility</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* P1's Required */}
            <div className="border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">
                {p1Name}&apos;s Required
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({p1RequiredIds.size} questions)
                </span>
              </h4>
              {p1RequiredResult ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-600">{p1Name} &rarr; {p2Name}:</div>
                    <div className="font-semibold text-green-600">{formatPercent(p1RequiredResult.percentage1)}</div>
                    <div className="text-gray-600">{p2Name} &rarr; {p1Name}:</div>
                    <div className="font-semibold text-blue-600">{formatPercent(p1RequiredResult.percentage2)}</div>
                    <div className="text-gray-600">Overall:</div>
                    <div className="font-semibold text-[#672DB7]">{formatPercent(p1RequiredResult.overall)}</div>
                    <div className="text-gray-600">Mutual questions:</div>
                    <div className="font-semibold">{p1RequiredResult.mutualCount}</div>
                  </div>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="text-xs text-gray-500 mb-1">Completeness</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-gray-600">{p2Name} answered:</div>
                      <div className="font-medium">
                        {p1RequiredResult.p2Answered}/{p1RequiredResult.p1Answered}
                        {' '}({formatPercent(p1RequiredResult.p2Completeness * 100)})
                      </div>
                    </div>
                  </div>
                  {p1RequiredResult.missingQuestions.length > 0 && (
                    <div className="border-t border-red-200 pt-2 mt-2">
                      <div className="text-xs text-red-600 font-medium mb-1">
                        Not answered by {p2Name} ({p1RequiredResult.missingQuestions.length})
                      </div>
                      <ul className="space-y-1">
                        {p1RequiredResult.missingQuestions.map(q => (
                          <li key={q.id} className="text-xs text-gray-700 flex items-start gap-1">
                            <span className="text-red-400 mt-0.5">&#x2022;</span>
                            <span>Q#{q.questionNumber}: {q.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No required questions set</p>
              )}
            </div>

            {/* P2's Required */}
            <div className="border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">
                {p2Name}&apos;s Required
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({p2RequiredIds.size} questions)
                </span>
              </h4>
              {p2RequiredResult ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-600">{p1Name} &rarr; {p2Name}:</div>
                    <div className="font-semibold text-green-600">{formatPercent(p2RequiredResult.percentage1)}</div>
                    <div className="text-gray-600">{p2Name} &rarr; {p1Name}:</div>
                    <div className="font-semibold text-blue-600">{formatPercent(p2RequiredResult.percentage2)}</div>
                    <div className="text-gray-600">Overall:</div>
                    <div className="font-semibold text-[#672DB7]">{formatPercent(p2RequiredResult.overall)}</div>
                    <div className="text-gray-600">Mutual questions:</div>
                    <div className="font-semibold">{p2RequiredResult.mutualCount}</div>
                  </div>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="text-xs text-gray-500 mb-1">Completeness</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-gray-600">{p1Name} answered:</div>
                      <div className="font-medium">
                        {p2RequiredResult.p1Answered}/{p2RequiredResult.p2Answered}
                        {' '}({formatPercent(p2RequiredResult.p1Completeness * 100)})
                      </div>
                    </div>
                  </div>
                  {p2RequiredResult.missingQuestions.length > 0 && (
                    <div className="border-t border-red-200 pt-2 mt-2">
                      <div className="text-xs text-red-600 font-medium mb-1">
                        Not answered by {p1Name} ({p2RequiredResult.missingQuestions.length})
                      </div>
                      <ul className="space-y-1">
                        {p2RequiredResult.missingQuestions.map(q => (
                          <li key={q.id} className="text-xs text-gray-700 flex items-start gap-1">
                            <span className="text-red-400 mt-0.5">&#x2022;</span>
                            <span>Q#{q.questionNumber}: {q.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No required questions set</p>
              )}
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
              Loading User Data
            </h3>
            <p className="text-sm text-gray-600">
              Fetching answers and required questions for selected users...
            </p>
          </div>
        </div>
      )}

      {/* Calculation Results Tables */}
      {showResults && (() => {
        const activeRequiredIds = showRequired
          ? (requiredScope === 'p1' ? p1RequiredIds : p2RequiredIds)
          : null;

        const displayResults1 = activeRequiredIds
          ? calculationResults1.filter(r => activeRequiredIds.has(r.questionId.toLowerCase()))
          : calculationResults1;
        const displayResults2 = activeRequiredIds
          ? calculationResults2.filter(r => activeRequiredIds.has(r.questionId.toLowerCase()))
          : calculationResults2;

        const answered1 = displayResults1.filter(r => r.status !== 'not_answered');
        const answered2 = displayResults2.filter(r => r.status !== 'not_answered');
        const dScore1 = answered1.reduce((s, r) => s + r.score, 0);
        const dMax1 = answered1.reduce((s, r) => s + r.maxScore, 0);
        const dScore2 = answered2.reduce((s, r) => s + r.score, 0);
        const dMax2 = answered2.reduce((s, r) => s + r.maxScore, 0);

        return (
          <>
            {renderResultTable(
              displayResults1, p1Name, dScore1, dMax1,
              p1RequiredIds, p2RequiredIds, 'P1', 'P2'
            )}
            {renderResultTable(
              displayResults2, p2Name, dScore2, dMax2,
              p2RequiredIds, p1RequiredIds, 'P2', 'P1'
            )}
          </>
        );
      })()}
    </div>
  );
}
