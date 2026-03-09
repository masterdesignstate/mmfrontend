import useSWR from 'swr';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

const pageQuestionsFetcher = async (url: string) => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to fetch page questions');
  const data = await res.json();
  return data.results || [];
};

export function usePageQuestions(questionNumbers: number[]) {
  const params = questionNumbers.map(n => `question_number=${n}`).join('&');
  const url = questionNumbers.length > 0
    ? `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?${params}&page_size=200`
    : null;

  const { data, error, isLoading } = useSWR(url, pageQuestionsFetcher, {
    dedupingInterval: 30000,
    keepPreviousData: true,
  });

  return { questions: data || [], questionsError: error, questionsLoading: isLoading };
}
