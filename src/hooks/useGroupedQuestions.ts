import { useMemo } from 'react';
import useSWR from 'swr';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

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
  return (data.results || []).map((q: GroupedQuestion) => ({
    id: q.id,
    question_name: q.question_name,
    question_number: q.question_number,
    group_number: q.group_number,
  }));
};

export function useGroupedQuestions() {
  // Single request for all four question numbers (backend supports getlist('question_number'))
  const url = `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=3&question_number=4&question_number=5&question_number=11&page_size=100`;

  const { data, error, isLoading } = useSWR(url, groupedQuestionsFetcher, {
    dedupingInterval: 300000,
  });
  const groupedQuestions = useMemo(() => data || ([] as GroupedQuestion[]), [data]);
  return { groupedQuestions, groupedError: error, groupedLoading: isLoading };
}
