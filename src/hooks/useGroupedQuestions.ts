import { useMemo } from 'react';
import useSWR from 'swr';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
import { normalizeEthnicityQuestions } from '@/utils/ethnicityQuestions';
import { GROUPED_QUESTION_NUMBERS } from '@/constants/mandatoryQuestions';

interface GroupedQuestion {
  id: string;
  question_name: string;
  question_number: number;
  group_number?: number;
}

const groupedQuestionsFetcher = async (url: string): Promise<GroupedQuestion[]> => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to fetch grouped questions');
  const data = await res.json();
  const results = (data.results || []) as GroupedQuestion[];
  return normalizeEthnicityQuestions(results).map((q: GroupedQuestion) => ({
    id: q.id,
    question_name: q.question_name,
    question_number: q.question_number,
    group_number: q.group_number,
  }));
};

export function useGroupedQuestions() {
  // Single request for all four question numbers (backend supports getlist('question_number'))
  const groupedParams = GROUPED_QUESTION_NUMBERS.map(n => `question_number=${n}`).join('&');
  const url = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?${groupedParams}&page_size=100`;

  const { data, error, isLoading } = useSWR(url, groupedQuestionsFetcher, {
    dedupingInterval: 300000,
  });
  const groupedQuestions = useMemo(() => data || ([] as GroupedQuestion[]), [data]);
  return { groupedQuestions, groupedError: error, groupedLoading: isLoading };
}
