import { useMemo } from 'react';
import useSWR from 'swr';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

const EMPTY_NUMBERS: number[] = [];
const EMPTY_COUNTS: Record<string, number> = {};

export function useQuestionMetadata() {
  const { data, error, isLoading, mutate } = useSWR(
    `${getApiUrl(API_ENDPOINTS.QUESTIONS)}metadata/`,
    {
      dedupingInterval: 60000,
      revalidateOnFocus: true,
    }
  );

  const questionNumbers = useMemo(
    () =>
      data?.distinct_question_numbers
        ? (data.distinct_question_numbers.filter((n: number | null) => n !== null) as number[])
        : EMPTY_NUMBERS,
    [data?.distinct_question_numbers]
  );

  const answerCounts = useMemo(
    () => (data?.answer_counts || EMPTY_COUNTS) as Record<string, number>,
    [data?.answer_counts]
  );

  return {
    questionNumbers,
    totalQuestionGroups: data?.total_question_groups || 0,
    answerCounts,
    metadataError: error,
    metadataLoading: isLoading,
    mutateMetadata: mutate,
  };
}
