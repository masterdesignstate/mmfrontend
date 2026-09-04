import { useMemo } from 'react';
import useSWR from 'swr';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

interface SubmittedQuestionsResponse {
  results?: Array<{ question_number: number | null }>;
  next?: string | null;
}

const EMPTY_NUMBERS: number[] = [];

/**
 * Question numbers the user submitted themselves.
 *
 * The "Submitted" filter used to read `is_submitted_by_me` off whichever questions the
 * current page happened to have loaded, so a submitted question on any other page simply
 * did not match and the filter usually came back empty. The backend can answer this
 * directly via `?submitted_by=`, so ask it once for the whole set — the same shape as
 * `useAnsweredQuestions`, which the answered/unanswered filters already rely on.
 */
export function useSubmittedQuestions(userId: string | null) {
  const { data, isLoading, mutate } = useSWR<SubmittedQuestionsResponse>(
    userId
      ? `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?submitted_by=${encodeURIComponent(userId)}&include_unapproved=true&page_size=1000`
      : null,
    { dedupingInterval: 60000 }
  );

  // Memoised on the response, not rebuilt per render: this array is a dependency of the
  // filter effect, and a fresh identity each render would re-trigger it forever.
  const submittedQuestionNumbers = useMemo(() => {
    if (!data?.results) return EMPTY_NUMBERS;
    return Array.from(
      new Set(
        data.results
          .map(question => Number(question.question_number))
          // Questions still awaiting approval have no number yet.
          .filter(questionNumber => Number.isFinite(questionNumber))
      )
    );
  }, [data]);

  return {
    submittedQuestionNumbers,
    submittedLoading: isLoading,
    mutateSubmitted: mutate,
  };
}
