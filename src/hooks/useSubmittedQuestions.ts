import { useMemo } from 'react';
import useSWR from 'swr';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

interface SubmittedQuestionsResponse<T> {
  results?: T[];
  next?: string | null;
}

const EMPTY_NUMBERS: number[] = [];

/**
 * The questions this user submitted, fetched account-wide.
 *
 * The "Submitted" filter used to read `is_submitted_by_me` off whichever questions the
 * current page happened to have loaded, so a submitted question sitting on any other page
 * did not match and the filter came back empty. The backend answers this directly via
 * `?submitted_by=`, so ask it once for the whole set — the same shape as
 * `useAnsweredQuestions`, which the answered/unanswered filters already rely on.
 *
 * Returns the full rows, not just their numbers: the list renders `Question` objects, and
 * matching a number whose row is not loaded produces a match that cannot be displayed.
 *
 * `include_unapproved` keeps a question visible to its author while it waits for approval.
 */
export function useSubmittedQuestions<T extends { question_number: number | null }>(
  userId: string | null
) {
  const { data, isLoading, mutate } = useSWR<SubmittedQuestionsResponse<T>>(
    userId
      ? `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?submitted_by=${encodeURIComponent(userId)}&include_unapproved=true&page_size=1000`
      : null,
    // Short window: a question the user just submitted should show up without a hard reload.
    { dedupingInterval: 5000 }
  );

  // Memoised on the response rather than rebuilt per render: these feed the filter effect's
  // dependencies, and a fresh identity each render would re-trigger it forever.
  const submittedQuestions = useMemo<T[]>(() => data?.results ?? [], [data]);

  const submittedQuestionNumbers = useMemo(() => {
    if (!submittedQuestions.length) return EMPTY_NUMBERS;
    return Array.from(
      new Set(
        submittedQuestions
          .map(question => Number(question.question_number))
          // A question still awaiting approval may not have a number yet.
          .filter(questionNumber => Number.isFinite(questionNumber))
      )
    );
  }, [submittedQuestions]);

  return {
    submittedQuestions,
    submittedQuestionNumbers,
    submittedLoading: isLoading,
    mutateSubmitted: mutate,
  };
}
