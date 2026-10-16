'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ExclusionControl from '@/components/ExclusionControl';
import InfoTip from '@/components/InfoTip';
import { apiService, type AnswerExclusion } from '@/services/api';
import { getQuestionHeading, getQuestionSubtitle } from '@/utils/questionDisplay';

interface ExcludedQuestionsSectionProps {
  userId: string;
  /** Unsaved edits, keyed by answer id. The filter panel saves them on Apply. */
  drafts: Record<string, number[]>;
  onDraftChange: (answerId: string, values: number[]) => void;
}

function FilterLinesIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={`shrink-0 ${className}`} viewBox="0 0 16 16" fill="none">
      <path d="M3 4.5h10M5 8h6M7 11.5h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Rows of one question that has several (Ethnicity's options, say) need their own names. */
const rowCaption = (row: AnswerExclusion, rows: AnswerExclusion[]) => {
  const siblings = rows.filter(other => other.question.question_number === row.question.question_number);
  return siblings.length > 1 || row.question.question_type === 'grouped' ? row.question.question_name : '';
};

const valuesSummary = (row: AnswerExclusion, values: number[]) =>
  values.map(value => row.value_labels[String(value)]?.trim() || String(value)).join(', ');

/**
 * The filter panel's "Exclude" section: the questions the viewer excludes answers on, as
 * chips whose filter button picks the values, plus a searchable picker to add more.
 * Only answered questions are offered, since an exclusion is stored on the viewer's answer.
 */
export default function ExcludedQuestionsSection({ userId, drafts, onDraftChange }: ExcludedQuestionsSectionProps) {
  const [rows, setRows] = useState<AnswerExclusion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    apiService.getAnswerExclusions(userId, true)
      .then(data => { if (!cancelled) setRows(data); })
      .catch(() => { if (!cancelled) setError('Could not load your exclusions.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  const valuesFor = (row: AnswerExclusion) => drafts[row.answer_id] ?? row.excluded_answer_values;
  const activeRows = rows.filter(row =>
    !removedIds.includes(row.answer_id)
    && (row.excluded_answer_values.length > 0 || row.answer_id in drafts || addedIds.includes(row.answer_id))
  );
  const activeIds = new Set(activeRows.map(row => row.answer_id));

  const remove = (row: AnswerExclusion) => {
    setAddedIds(prev => prev.filter(id => id !== row.answer_id));
    setRemovedIds(prev => [...prev, row.answer_id]);
    if (row.excluded_answer_values.length > 0 || row.answer_id in drafts) onDraftChange(row.answer_id, []);
  };

  return (
    <div className="mb-8 rounded-2xl ring-1 ring-purple-200/70 bg-gradient-to-br from-purple-50/60 to-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-900 text-white shadow-[0_2px_6px_-1px_rgba(124,58,237,0.5)]">
            <FilterLinesIcon className="h-4 w-4" />
          </span>
          <h4 className="text-sm sm:text-base font-semibold bg-gradient-to-r from-purple-700 to-purple-900 bg-clip-text text-transparent">Exclude</h4>
          <InfoTip label="About exclusions">
            People whose own answer is one of your excluded values won&apos;t appear in your results. Changes are saved when you apply filters.
          </InfoTip>
        </div>
        {!loading && !error && activeRows.length > 0 && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#672DB7] ring-1 ring-purple-200 hover:ring-purple-400"
          >
            + Add question
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-purple-900/60">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : activeRows.length === 0 ? (
        <div className="rounded-xl bg-white/70 px-4 py-4 text-center ring-1 ring-purple-200/60">
          <p className="text-sm font-medium text-gray-800">You haven&apos;t excluded any questions yet.</p>
          <p className="mt-1 text-xs text-gray-500">Pick a question, then choose the answers you don&apos;t want to see.</p>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={rows.length === 0}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-purple-600 to-purple-900 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
          >
            <FilterLinesIcon />
            Choose questions
          </button>
          {rows.length === 0 && (
            <p className="mt-2 text-xs text-gray-500">
              Answer a question first.{' '}
              <Link href="/questions" className="font-semibold text-[#672DB7] hover:underline">Go to questions</Link>
            </p>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {activeRows.map(row => {
            const values = valuesFor(row);
            const caption = rowCaption(row, rows);
            const heading = getQuestionHeading(row.question.question_number, row.question);
            return (
              <li
                key={row.answer_id}
                className="flex items-center gap-2 rounded-2xl bg-white py-2 pl-3.5 pr-1.5 ring-1 ring-purple-200/70"
              >
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">
                    {heading}
                    {caption && <span className="font-medium text-gray-500"> · {caption}</span>}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {values.length > 0 ? `Hiding ${valuesSummary(row, values)}` : 'Tap Exclude to pick answers'}
                    {row.answer_id in drafts && <span className="italic text-gray-400"> · unsaved</span>}
                  </p>
                </div>
                <ExclusionControl
                  values={values}
                  allowedValues={row.allowed_values}
                  blockedValues={row.blocked_values}
                  onChange={next => onDraftChange(row.answer_id, next)}
                  buttonLabel={values.length > 0 ? 'Edit' : 'Exclude'}
                  title="Exclude"
                  ariaLabel={`Choose excluded answers for ${heading}`}
                />
                <button
                  type="button"
                  onClick={() => remove(row)}
                  aria-label={`Stop excluding on ${heading}`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {pickerOpen && (
        <ExcludeQuestionPicker
          rows={rows}
          activeIds={activeIds}
          onClose={() => setPickerOpen(false)}
          onAdd={ids => {
            setRemovedIds(prev => prev.filter(id => !ids.includes(id)));
            setAddedIds(prev => [...prev, ...ids.filter(id => !prev.includes(id))]);
          }}
        />
      )}
    </div>
  );
}

function ExcludeQuestionPicker({ rows, activeIds, onClose, onAdd }: {
  rows: AnswerExclusion[];
  activeIds: Set<string>;
  onClose: () => void;
  onAdd: (answerIds: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(row => {
      const q = row.question;
      return [getQuestionHeading(q.question_number, q), q.question_name, q.group_name, q.text, String(q.question_number)]
        .some(text => (text || '').toLowerCase().includes(term));
    });
  }, [rows, search]);

  const toggle = (id: string) =>
    setPicked(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));

  const done = () => {
    onAdd(picked);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Choose questions to exclude"
        className="flex h-[75vh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h3 className="text-base font-semibold text-gray-900">Choose questions</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-xl leading-none text-gray-400 hover:text-gray-600">×</button>
        </div>
        <div className="px-4 pt-3">
          <input
            type="search"
            autoFocus
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search your answered questions"
            className="block w-full rounded-full border border-gray-300 px-4 py-2 text-sm placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-gray-500">No answered questions match “{search.trim()}”.</li>
          ) : filtered.map(row => {
            const q = row.question;
            const already = activeIds.has(row.answer_id);
            const selected = already || picked.includes(row.answer_id);
            const caption = rowCaption(row, rows);
            const subtitle = getQuestionSubtitle(q.question_number, q);
            return (
              <li key={row.answer_id}>
                <button
                  type="button"
                  disabled={already}
                  onClick={() => toggle(row.answer_id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    selected ? 'bg-purple-50' : 'hover:bg-gray-50'
                  } disabled:cursor-default`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-900">
                      {getQuestionHeading(q.question_number, q)}
                      {caption && <span className="font-medium text-gray-500"> · {caption}</span>}
                    </span>
                    {subtitle && <span className="block truncate text-xs text-gray-500">{subtitle}</span>}
                  </span>
                  {already ? (
                    <span className="shrink-0 text-xs font-medium text-gray-400">Added</span>
                  ) : (
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-white ${
                        selected ? 'border-[#672DB7] bg-[#672DB7]' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {selected && (
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-500">Only questions you&apos;ve answered can be excluded.</p>
          <button
            type="button"
            onClick={done}
            disabled={picked.length === 0}
            className="shrink-0 rounded-full bg-black px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Add{picked.length > 0 ? ` (${picked.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
