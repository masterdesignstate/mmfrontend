import { useMemo } from 'react';
import useSWR from 'swr';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

const answersFetcher = async (url: string) => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const error = new Error('Failed to fetch answers') as Error & { status: number };
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.results || [];
};

const EMPTY_ANSWERS: never[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useUserAnswers<T = any>(userId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<T[]>(
    userId ? `${getApiUrl(API_ENDPOINTS.ANSWERS)}?user=${userId}&page_size=1000` : null,
    answersFetcher,
    { dedupingInterval: 60000 }
  );
  const answers = useMemo(() => (data || EMPTY_ANSWERS) as T[], [data]);
  return { answers, answersError: error, answersLoading: isLoading, mutateAnswers: mutate };
}
