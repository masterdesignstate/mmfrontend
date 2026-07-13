'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_EXCLUSION_VALUES, normalizeExcludedValues } from '@/utils/exclusionValues';

interface ExclusionControlProps {
  values: number[];
  onChange: (values: number[]) => void;
  allowedValues?: number[];
  blockedValues?: number[];
  className?: string;
  buttonLabel?: string;
  title?: string;
  ariaLabel?: string;
  helpText?: string;
  disabled?: boolean;
}

export default function ExclusionControl({
  values,
  onChange,
  allowedValues = DEFAULT_EXCLUSION_VALUES,
  blockedValues = [],
  className = '',
  buttonLabel = 'Exclude',
  title = 'Exclude',
  ariaLabel = 'Exclude answer values',
  helpText = 'Hide people from your results when their answer to this question is one of these values.',
  disabled = false,
}: ExclusionControlProps) {
  const [open, setOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [legendPinned, setLegendPinned] = useState(false);
  const [draftValues, setDraftValues] = useState<number[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<number[]>([]);
  const allowedValuesKey = allowedValues.join(',');
  const blockedValuesKey = blockedValues.join(',');
  const exclusionValues = useMemo(
    () => normalizeExcludedValues(allowedValuesKey.split(',').map(Number)),
    [allowedValuesKey]
  );
  const blockedExclusionValues = useMemo(
    () => normalizeExcludedValues(blockedValuesKey.split(',').map(Number), exclusionValues),
    [blockedValuesKey, exclusionValues]
  );
  const selected = normalizeExcludedValues(values, exclusionValues, blockedExclusionValues);
  const activeValues = open ? draftValues : selected;

  const commitAndClose = useCallback(() => {
    onChange(normalizeExcludedValues(draftRef.current, exclusionValues, blockedExclusionValues));
    setOpen(false);
    setLegendOpen(false);
    setLegendPinned(false);
  }, [blockedExclusionValues, exclusionValues, onChange]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        commitAndClose();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [commitAndClose, open]);

  useEffect(() => {
    draftRef.current = draftValues;
  }, [draftValues]);

  useEffect(() => {
    if (!open) return;
    setDraftValues(prev => normalizeExcludedValues(prev, exclusionValues, blockedExclusionValues));
  }, [blockedExclusionValues, exclusionValues, open]);

  const toggleValue = (value: number) => {
    if (blockedExclusionValues.includes(value)) return;
    setDraftValues(prev => (
      prev.includes(value)
        ? prev.filter(item => item !== value)
        : [...prev, value].sort((a, b) => a - b)
    ));
  };

  const toggleOpen = () => {
    if (disabled) return;
    if (open) {
      commitAndClose();
      return;
    }
    const initialDraft = [...selected];
    draftRef.current = initialDraft;
    setDraftValues(initialDraft);
    setOpen(true);
  };

  if (exclusionValues.length === 0) {
    return <div className={`h-7 w-7 sm:w-[88px] ${className}`} aria-hidden />;
  }

  return (
    <div ref={rootRef} className={`relative flex justify-center ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={toggleOpen}
        disabled={disabled}
        className={`inline-flex h-7 w-7 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-0 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[88px] sm:px-2.5 ${
          selected.length > 0
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
            d="M3 4.5h10M5 8h6M7 11.5h2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        <span className="hidden sm:inline">{buttonLabel}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-9 z-50 w-64 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-lg"
          onPointerDownCapture={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <span className="text-sm font-semibold text-black">{title}</span>
              <span className="relative">
                <button
                  type="button"
                  aria-label={`What does ${title.toLowerCase()} mean?`}
                  aria-expanded={legendOpen}
                  onClick={() => {
                    setLegendPinned(prev => !prev);
                    setLegendOpen(prev => !prev);
                  }}
                  onMouseEnter={() => setLegendOpen(true)}
                  onMouseLeave={() => {
                    if (!legendPinned) setLegendOpen(false);
                  }}
                  onFocus={() => setLegendOpen(true)}
                  onBlur={() => {
                    if (!legendPinned) setLegendOpen(false);
                  }}
                  className="mt-0.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-gray-300 text-[10px] text-gray-500"
                >
                  ?
                </button>
                {legendOpen && (
                  <span className="absolute left-1/2 top-6 z-[60] w-52 -translate-x-1/2 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-xs leading-snug text-gray-600 shadow-lg">
                    {helpText}
                  </span>
                )}
              </span>
              <span className="sr-only">
                {helpText}
              </span>
            </div>
            <button
              type="button"
              onClick={commitAndClose}
              className="cursor-pointer text-xs font-semibold text-[#672DB7]"
            >
              Done
            </button>
          </div>
          <div className="mb-3 flex gap-2">
            {exclusionValues.map(value => {
              const isSelected = activeValues.includes(value);
              const isBlocked = blockedExclusionValues.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  disabled={isBlocked}
                  title={isBlocked ? 'This is your answer' : undefined}
                  onClick={() => toggleValue(value)}
                  className={`h-8 w-8 cursor-pointer rounded-full border text-sm font-semibold transition-colors ${
                    isBlocked
                      ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-300'
                      : isSelected
                      ? 'border-[#672DB7] bg-[#672DB7] text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-[#672DB7] hover:text-[#672DB7]'
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {activeValues.length > 0 ? `${activeValues.length} selected` : 'None selected'}
            </span>
            <button
              type="button"
              onClick={() => setDraftValues([])}
              disabled={activeValues.length === 0}
              className="cursor-pointer text-xs font-medium text-gray-500 disabled:cursor-default disabled:text-gray-300"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
