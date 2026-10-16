'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ExclusionControl from '@/components/ExclusionControl';
import InfoTip from '@/components/InfoTip';
import { apiService, type AnswerExclusion } from '@/services/api';
import { getQuestionHeading } from '@/utils/questionDisplay';

interface ExcludedQuestionsSectionProps {
  userId: string;
  /** Unsaved edits, keyed by answer id. The filter panel saves them on Apply. */
  drafts: Record<string, number[]>;
  onDraftChange: (answerId: string, values: number[]) => void;
}

const valueLabel = (row: AnswerExclusion, value: number) => {
  const text = row.value_labels[String(value)]?.trim();
  return text ? `${value} · ${text}` : String(value);
};

/** Rows of one question that has several (Ethnicity's options, say) need their own names. */
const rowCaption = (row: AnswerExclusion, rows: AnswerExclusion[]) => {
  const siblings = rows.filter(other => other.question.question_number === row.question.question_number);
  return siblings.length > 1 || row.question.question_type === 'grouped' ? row.question.question_name : '';
};

/**
 * The filter panel's "Exclude" section: every question where the viewer excluded answer
 * values, what is excluded, and a picker to change it.
 */
export default function ExcludedQuestionsSection({ userId, drafts, onDraftChange }: ExcludedQuestionsSectionProps) {
  const [rows, setRows] = useState<AnswerExclusion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    apiService.getAnswerExclusions(userId)
      .then(data => { if (!cancelled) setRows(data); })
      .catch(() => { if (!cancelled) setError('Could not load your exclusions.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  return (
    <div className="mb-8 rounded-2xl ring-1 ring-purple-200/70 bg-gradient-to-br from-purple-50/60 to-white p-4 sm:p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-900 text-white shadow-[0_2px_6px_-1px_rgba(124,58,237,0.5)]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </span>
        <h3 className="text-base font-semibold bg-gradient-to-r from-purple-700 to-purple-900 bg-clip-text text-transparent">Exclude</h3>
        <InfoTip label="About exclusions">
          People whose own answer is one of your excluded values won&apos;t appear in your results. Changes are saved when you apply filters.
        </InfoTip>
      </div>

      {loading ? (
        <p className="text-sm text-purple-900/60">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-purple-900/70">
          You haven&apos;t excluded any answers yet. Use <span className="font-semibold">Exclude</span> on a question&apos;s Them slider to hide people who answered a certain way.{' '}
          <Link href="/questions?filter=answered" className="font-semibold text-[#672DB7] hover:underline">Go to my answers</Link>
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map(row => {
            const values = drafts[row.answer_id] ?? row.excluded_answer_values;
            const caption = rowCaption(row, rows);
            const changed = row.answer_id in drafts;
            return (
              <li
                key={row.answer_id}
                className="flex items-start justify-between gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-purple-200/70"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/questions/${row.question.question_number}`}
                    className="block text-sm font-semibold text-gray-900 hover:text-[#672DB7]"
                  >
                    {getQuestionHeading(row.question.question_number, row.question)}
                  </Link>
                  {caption && (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{caption}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {values.length > 0 ? values.map(value => (
                      <span key={value} className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-[#672DB7] ring-1 ring-purple-200">
                        {valueLabel(row, value)}
                      </span>
                    )) : (
                      <span className="text-xs text-gray-500">Nothing excluded</span>
                    )}
                    {changed && <span className="text-xs italic text-gray-400">unsaved</span>}
                  </div>
                </div>
                <ExclusionControl
                  values={values}
                  allowedValues={row.allowed_values}
                  blockedValues={row.blocked_values}
                  onChange={next => onDraftChange(row.answer_id, next)}
                  buttonLabel="Edit"
                  title="Exclude"
                  ariaLabel={`Edit excluded answers for ${getQuestionHeading(row.question.question_number, row.question)}`}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
