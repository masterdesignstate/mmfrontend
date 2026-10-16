'use client';

import { useState } from 'react';
import posthog from 'posthog-js';
import { apiService } from '@/services/api';

type PromptState = 'idle' | 'sending' | 'sent' | 'error';

interface PromptToAnswerButtonProps {
  recipientId: string;
  recipientName: string;
  questionNumber: number;
  /** `compact` fits inside a question-list row; `full` is a standalone call to action. */
  variant?: 'compact' | 'full';
}

/** Sends `recipientId` a notification asking them to answer this question. */
export default function PromptToAnswerButton({
  recipientId,
  recipientName,
  questionNumber,
  variant = 'compact',
}: PromptToAnswerButtonProps) {
  const [state, setState] = useState<PromptState>('idle');
  const [error, setError] = useState('');

  const send = async (event: React.MouseEvent) => {
    // Rows that host this button are clickable themselves.
    event.stopPropagation();
    if (state === 'sending' || state === 'sent') return;
    const senderId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;
    if (!senderId) return;
    setState('sending');
    setError('');
    try {
      await apiService.promptQuestion(senderId, recipientId, questionNumber);
      posthog.capture('question_prompt_sent', { question_number: questionNumber });
      setState('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send.');
      setState('error');
    }
  };

  const label = state === 'sent'
    ? 'Asked'
    : state === 'sending'
      ? 'Asking…'
      : variant === 'full'
        ? `Ask ${recipientName} to answer`
        : 'Ask to answer';

  const sizing = variant === 'full'
    ? 'px-5 py-2.5 text-sm'
    : 'px-2.5 py-1 text-[11px] sm:text-xs';

  return (
    <span className={`inline-flex flex-col ${variant === 'full' ? 'items-center' : 'items-end'}`}>
      <button
        type="button"
        onClick={send}
        disabled={state === 'sending' || state === 'sent'}
        title={state === 'sent' ? `${recipientName} will get a notification` : `Ask ${recipientName} to answer this question`}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold transition-colors ${sizing} ${
          state === 'sent'
            ? 'cursor-default bg-purple-50 text-[#672DB7] ring-1 ring-purple-200'
            : 'cursor-pointer bg-[#672DB7] text-white hover:bg-[#5a26a0] disabled:opacity-70'
        }`}
      >
        {state === 'sent' ? (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        )}
        {label}
      </button>
      {state === 'error' && error && (
        <span className="mt-1 max-w-[200px] text-right text-[11px] text-red-600">{error}</span>
      )}
    </span>
  );
}
