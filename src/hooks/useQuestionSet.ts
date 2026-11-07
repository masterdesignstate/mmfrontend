import { useMemo } from 'react';
import useSWR from 'swr';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

interface QuestionSetResponse<T> {
  results?: T[];
}

const EMPTY_QUESTIONS: never[] = [];
const EMPTY_NUMBERS: number[] = [];

/** One response page is not the whole set once a tag matches more than the page size. */
async function fetchAllQuestionPages<T>(url: string): Promise<QuestionSetResponse<T>> {
  const results: T[] = [];
  let next: string | null = url;
  for (let page = 0; page < 20 && next; page += 1) {
    const res: Response = await fetch(next, { headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) {
      const error = new Error('API request failed') as Error & { status: number };
      error.status = res.status;
      throw error;
    }
    const data: { results?: T[]; next?: unknown } = await res.json();
    results.push(...(data.results || []));
    next = typeof data.next === 'string' ? data.next : null;
  }
  return { results };
}

/**
 * Every question matching a server-side flag, independent of the page currently on screen.
 *
 * The questions list loads ten question numbers at a time, and the client-side filters were
 * evaluated only against that slice — so "Mandatory" reported 10 of 10 when there are 14,
 * silently dropping everything that happened to live on a later page. The backend can answer
 * these directly (`is_mandatory`, `is_required_for_match`), so ask it for the whole set.
 *
 * Pass `null` to skip the request entirely when the filter is off.
 */
export function useQuestionSet<T extends { question_number: number | null }>(query: string | null) {
  const { data, isLoading } = useSWR<QuestionSetResponse<T>>(
    query ? `${getApiUrl(API_ENDPOINTS.QUESTIONS)}?${query}&page_size=1000` : null,
    (url: string) => fetchAllQuestionPages<T>(url),
    { dedupingInterval: 60000, keepPreviousData: false }
  );

  // Memoised on the response: these feed filter effect dependencies, and a new array
  // identity each render would re-trigger them endlessly.
  const questions = useMemo<T[]>(() => data?.results ?? EMPTY_QUESTIONS, [data]);

  const questionNumbers = useMemo(() => {
    if (!questions.length) return EMPTY_NUMBERS;
    return Array.from(
      new Set(
        questions
          .map(question => Number(question.question_number))
          // A question awaiting approval has no number yet.
          .filter(questionNumber => Number.isFinite(questionNumber))
      )
    );
  }, [questions]);

  return { questions, questionNumbers, isLoading };
}
