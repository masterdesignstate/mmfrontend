import useSWR from 'swr';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

interface AnsweredQuestionsResponse {
  answered_question_numbers: number[];
}

const EMPTY_NUMBERS: number[] = [];

export function useAnsweredQuestions(userId: string | null) {
  const { data, isLoading, mutate } = useSWR<AnsweredQuestionsResponse>(
    userId ? `${getApiUrl(API_ENDPOINTS.ANSWERS)}my_answered_questions/?user=${userId}` : null,
    { dedupingInterval: 60000 }
  );
  return {
    answeredQuestionNumbers: data?.answered_question_numbers ?? EMPTY_NUMBERS,
    answeredLoading: isLoading,
    mutateAnswered: mutate,
  };
}
