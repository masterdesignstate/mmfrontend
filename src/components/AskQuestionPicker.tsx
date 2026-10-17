'use client';

import { useMemo, useState } from 'react';
import PromptToAnswerButton from '@/components/PromptToAnswerButton';

export interface AskableQuestion {
  questionNumber: number;
  /** Heading the recipient will see, e.g. "8. How often do you drink alcohol?". */
  heading: string;
  /** Extra line for grouped questions, under the short name. */
  subtitle?: string;
  required: boolean;
}

interface AskQuestionPickerProps {
  recipientId: string;
  recipientName: string;
  questions: AskableQuestion[];
  /** False while the profile is still loading the question list. */
  ready: boolean;
  onClose: () => void;
}

/** Search the questions this person hasn't answered and ask them to answer one. */
export default function AskQuestionPicker({
  recipientId,
  recipientName,
  questions,
  ready,
  onClose,
}: AskQuestionPickerProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const ordered = [...questions].sort((a, b) => {
      if (a.required !== b.required) return a.required ? -1 : 1;
      return a.questionNumber - b.questionNumber;
    });
    if (!term) return ordered;
    return ordered.filter(question =>
      [String(question.questionNumber), question.heading, question.subtitle]
        .some(text => (text || '').toLowerCase().includes(term))
    );
  }, [questions, search]);

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label={`Ask ${recipientName} a question`}
        className="flex h-[75vh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h3 className="min-w-0 truncate text-base font-semibold text-gray-900">Ask {recipientName}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-xl leading-none text-gray-400 hover:text-gray-600">×</button>
        </div>
        <div className="px-4 pt-3">
          <input
            type="search"
            autoFocus
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search questions they haven't answered"
            className="block w-full rounded-full border border-gray-300 px-4 py-2 text-sm placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {!ready ? (
            <li className="px-3 py-6 text-center text-sm text-gray-500">Loading questions…</li>
          ) : questions.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-gray-500">{recipientName} has answered every question.</li>
          ) : filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-gray-500">No questions match “{search.trim()}”.</li>
          ) : filtered.map(question => (
            <li key={question.questionNumber} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900">{question.heading}</p>
                {question.subtitle && (
                  <p className="mt-0.5 text-xs text-gray-500">{question.subtitle}</p>
                )}
                {question.required && (
                  <p className="mt-0.5 text-[11px] font-semibold text-[#672DB7]">Required for you</p>
                )}
              </div>
              <PromptToAnswerButton
                variant="ask"
                recipientId={recipientId}
                recipientName={recipientName}
                questionNumber={question.questionNumber}
              />
            </li>
          ))}
        </ul>
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-500">They get a notification that opens this question.</p>
        </div>
      </div>
    </div>
  );
}
