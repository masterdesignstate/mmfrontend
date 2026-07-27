'use client';

import { useCallback, useEffect, useState } from 'react';

import CharCounter from '@/components/CharCounter';
import { isOverLimit, overLimitMessage } from '@/utils/textLimits';
import { MAX_ANSWER_NOTE_CHARS } from '@/services/api';

export const NOTE_MAX_LENGTH = MAX_ANSWER_NOTE_CHARS;

interface NoteControlProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  buttonLabel?: string;
  title?: string;
  ariaLabel?: string;
  helpText?: string;
  disabled?: boolean;
}

/**
 * Note button for the Me answer, sized to match ExclusionControl so it can drop into
 * the same grid cell (icon-only 28px circle on mobile, 88px pill from `sm:` up).
 * Unlike ExclusionControl's inline popover this opens a centered modal.
 */
export default function NoteControl({
  value,
  onChange,
  className = '',
  buttonLabel = 'Note',
  title = 'Add a note',
  ariaLabel = 'Add a note to this answer',
  helpText = 'Explain your answer or add context. Who can see it is controlled by Note Visibility in Settings.',
  disabled = false,
}: NoteControlProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const hasNote = (value || '').trim().length > 0;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [close, open]);

  const openModal = () => {
    if (disabled) return;
    setDraft(value || '');
    setOpen(true);
  };

  const overLimit = isOverLimit(draft, NOTE_MAX_LENGTH);

  const save = () => {
    if (overLimit) return;
    onChange(draft.trim());
    setOpen(false);
  };

  return (
    <div className={`relative flex justify-center ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={openModal}
        disabled={disabled}
        className={`inline-flex h-7 w-7 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-0 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[88px] sm:px-2.5 ${
          hasNote
            ? 'border-[#672DB7] bg-[#672DB7] text-white shadow-sm'
            : 'border-gray-300 bg-white text-gray-700 hover:border-[#672DB7] hover:bg-purple-50 hover:text-[#672DB7]'
        }`}
      >
        <svg
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M11.2 2.3a1.4 1.4 0 0 1 2 2L6.5 11l-2.6.7.7-2.6 6.6-6.8Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M2.8 13.8h10.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">{buttonLabel}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 text-left shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="cursor-pointer text-xl leading-none text-gray-400 hover:text-gray-900"
              >
                &times;
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-500">{helpText}</p>

            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type your note..."
              rows={4}
              aria-invalid={overLimit}
              className={`w-full resize-none rounded-xl border p-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 ${
                overLimit
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-[#672DB7] focus:ring-[#672DB7]'
              }`}
            />

            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-red-600">
                {overLimit ? overLimitMessage('Notes', NOTE_MAX_LENGTH) : ''}
              </span>
              <CharCounter value={draft} max={NOTE_MAX_LENGTH} />
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={close}
                className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={overLimit}
                className="cursor-pointer rounded-lg bg-[#672DB7] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#5a26a0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
