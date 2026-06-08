'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const EXCLUSION_VALUES = [1, 2, 3, 4, 5];

interface ExclusionControlProps {
  values: number[];
  onChange: (values: number[]) => void;
  className?: string;
}

export default function ExclusionControl({ values, onChange, className = '' }: ExclusionControlProps) {
  const [open, setOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [legendPinned, setLegendPinned] = useState(false);
  const [draftValues, setDraftValues] = useState<number[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<number[]>([]);
  const selected = values.filter(value => EXCLUSION_VALUES.includes(value));
  const activeValues = open ? draftValues : selected;

  const commitAndClose = useCallback(() => {
    onChange(draftRef.current);
    setOpen(false);
    setLegendOpen(false);
    setLegendPinned(false);
  }, [onChange]);

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

  const toggleValue = (value: number) => {
    setDraftValues(prev => (
      prev.includes(value)
        ? prev.filter(item => item !== value)
        : [...prev, value].sort((a, b) => a - b)
    ));
  };

  const toggleOpen = () => {
    if (open) {
      commitAndClose();
      return;
    }
    const initialDraft = [...selected];
    draftRef.current = initialDraft;
    setDraftValues(initialDraft);
    setOpen(true);
  };

  return (
    <div ref={rootRef} className={`relative flex justify-center ${className}`}>
      <button
        type="button"
        aria-label="Exclude answer values"
        title="Exclude answer values"
        onClick={toggleOpen}
        className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border transition-colors ${
          selected.length > 0
            ? 'border-[#672DB7] bg-[#672DB7] text-white'
            : 'border-[#ADADAD] bg-white text-gray-600 hover:border-[#672DB7] hover:text-[#672DB7]'
        }`}
      >
        <span className="relative h-4 w-4 rounded-full border-2 border-current">
          <span className="absolute left-1/2 top-1/2 h-0.5 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-current" />
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-9 z-50 w-60 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-lg"
          onPointerDownCapture={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-black">Exclude</span>
              <span className="relative">
                <button
                  type="button"
                  aria-label="What does exclude mean?"
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
                  className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-gray-300 text-[10px] text-gray-500"
                >
                  ?
                </button>
                {legendOpen && (
                  <span className="absolute left-1/2 top-6 z-[60] w-52 -translate-x-1/2 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-xs leading-snug text-gray-600 shadow-lg">
                    Hide people from your results when their answer to this question is one of these values.
                  </span>
                )}
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
            {EXCLUSION_VALUES.map(value => {
              const isSelected = activeValues.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleValue(value)}
                  className={`h-8 w-8 cursor-pointer rounded-full border text-sm font-semibold transition-colors ${
                    isSelected
                      ? 'border-[#672DB7] bg-[#672DB7] text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-[#672DB7] hover:text-[#672DB7]'
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setDraftValues([])}
            disabled={activeValues.length === 0}
            className="cursor-pointer text-xs font-medium text-gray-500 disabled:cursor-default disabled:text-gray-300"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
