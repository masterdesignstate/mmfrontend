'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TIP_PANEL_CLASSES, tipArrowClasses } from '@/components/InfoTip';
import { useDismissOnOutside } from '@/hooks/useDismissOnOutside';
import { DEFAULT_EXCLUSION_VALUES, normalizeExcludedValues } from '@/utils/exclusionValues';

export const EXCLUDE_THEM_BLOCKED_HELP = 'This is what you’re looking for and can’t be excluded.';
export const EXCLUDE_THEM_HELP = 'People with these answers won’t appear in your results. The answer you’re looking for can’t be excluded.';
export const EXCLUDE_ME_BLOCKED_HELP = 'This is your answer and can’t be excluded.';
export const EXCLUDE_ME_HELP = 'People with these answers won’t appear in your results. Your own answer can’t be excluded.';

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
  /** Tooltip on the value that cannot be excluded. */
  blockedHelp?: string;
  disabled?: boolean;
  popoverPlacement?: 'above' | 'below';
  /** Render just the filter icon, for use inside a chip. */
  iconOnly?: boolean;
  /** Stack the values and caption the first and last, for the filter panel. */
  showEndLabels?: boolean;
  valueLabels?: Record<string, string>;
}

const POPOVER_WIDTH_PX = 256;
const VIEWPORT_GAP_PX = 8;
const TRIGGER_GAP_PX = 8;

export default function ExclusionControl({
  values,
  onChange,
  allowedValues = DEFAULT_EXCLUSION_VALUES,
  blockedValues = [],
  className = '',
  buttonLabel = 'Exclude',
  title = 'Exclude',
  ariaLabel = 'Exclude answer values',
  helpText = EXCLUDE_THEM_HELP,
  blockedHelp = EXCLUDE_THEM_BLOCKED_HELP,
  disabled = false,
  popoverPlacement = 'below',
  iconOnly = false,
  showEndLabels = false,
  valueLabels,
}: ExclusionControlProps) {
  const [open, setOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [legendPinned, setLegendPinned] = useState(false);
  const [blockedHelpValue, setBlockedHelpValue] = useState<number | null>(null);
  const [draftValues, setDraftValues] = useState<number[]>([]);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
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
    setBlockedHelpValue(null);
    setPosition(null);
  }, [blockedExclusionValues, exclusionValues, onChange]);

  useDismissOnOutside([rootRef, popoverRef], open, commitAndClose);

  useEffect(() => {
    draftRef.current = draftValues;
  }, [draftValues]);

  useEffect(() => {
    if (!open) return;
    setDraftValues(prev => normalizeExcludedValues(prev, exclusionValues, blockedExclusionValues));
  }, [blockedExclusionValues, exclusionValues, open]);

  const updatePosition = useCallback(() => {
    const trigger = rootRef.current;
    const panel = popoverRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = panel?.offsetWidth || POPOVER_WIDTH_PX;
    const height = panel?.offsetHeight || 0;
    const spaceBelow = window.innerHeight - rect.bottom - TRIGGER_GAP_PX;
    const spaceAbove = rect.top - TRIGGER_GAP_PX;
    const preferAbove = popoverPlacement === 'above';
    const placeAbove = height
      ? (preferAbove
        ? spaceAbove >= height || spaceAbove > spaceBelow
        : spaceBelow < height && spaceAbove >= height)
      : preferAbove;

    let top = placeAbove ? rect.top - height - TRIGGER_GAP_PX : rect.bottom + TRIGGER_GAP_PX;
    if (height) {
      top = Math.max(VIEWPORT_GAP_PX, Math.min(top, window.innerHeight - height - VIEWPORT_GAP_PX));
    }

    let left = rect.right - width;
    if (left < VIEWPORT_GAP_PX) left = rect.left;
    left = Math.max(VIEWPORT_GAP_PX, Math.min(left, window.innerWidth - width - VIEWPORT_GAP_PX));
    setPosition({ top, left });
  }, [popoverPlacement]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition, draftValues, legendOpen, blockedHelpValue]);

  const toggleValue = (value: number) => {
    if (blockedExclusionValues.includes(value)) {
      setBlockedHelpValue(value);
      return;
    }
    setBlockedHelpValue(null);
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
    return iconOnly ? null : <div className={`h-7 w-[74px] sm:w-[88px] ${className}`} aria-hidden />;
  }

  const popover = open && typeof document !== 'undefined' ? createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={title}
      className="fixed z-[300] w-64 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-lg"
      style={position ? { top: position.top, left: position.left } : { top: 0, left: 0, visibility: 'hidden' }}
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
      <div className={showEndLabels ? 'mb-3 flex flex-col items-center gap-2.5' : 'mb-3 flex gap-2'}>
        {exclusionValues.map(value => {
          const isSelected = activeValues.includes(value);
          const isBlocked = blockedExclusionValues.includes(value);
          const isEnd = value === exclusionValues[0] || value === exclusionValues[exclusionValues.length - 1];
          const endLabel = showEndLabels && isEnd ? (valueLabels?.[String(value)] || '').trim() : '';
          return (
            <span key={value} className={showEndLabels ? 'relative flex flex-col items-center' : 'relative'}>
              <button
                type="button"
                aria-disabled={isBlocked}
                aria-label={isBlocked ? `${value}. ${blockedHelp}` : String(value)}
                onClick={() => toggleValue(value)}
                onMouseEnter={() => isBlocked && setBlockedHelpValue(value)}
                onMouseLeave={() => isBlocked && setBlockedHelpValue(null)}
                onFocus={() => isBlocked && setBlockedHelpValue(value)}
                onBlur={() => isBlocked && setBlockedHelpValue(null)}
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
              {endLabel && (
                <span className="mt-1 max-w-[9.5rem] text-center text-[10px] font-medium uppercase leading-tight tracking-wide text-gray-500">
                  {endLabel}
                </span>
              )}
              {isBlocked && blockedHelpValue === value && (
                <span
                  role="tooltip"
                  className={`absolute left-1/2 z-[70] w-40 -translate-x-1/2 text-center font-normal ${TIP_PANEL_CLASSES} ${
                    showEndLabels ? 'bottom-full mb-1' : 'bottom-10'
                  }`}
                >
                  {blockedHelp}
                  <span className={tipArrowClasses('bottom', 'center')} />
                </span>
              )}
            </span>
          );
        })}
      </div>
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setDraftValues([])}
          disabled={activeValues.length === 0}
          className="cursor-pointer text-xs font-medium text-gray-500 disabled:cursor-default disabled:text-gray-300"
        >
          Clear
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={rootRef} className={`relative flex justify-center ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        title={ariaLabel}
        onClick={toggleOpen}
        disabled={disabled}
        className={iconOnly ? `flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          selected.length > 0
            ? 'bg-[#672DB7] text-white'
            : 'text-gray-600 hover:bg-purple-50 hover:text-[#672DB7]'
        }` : `inline-flex h-7 w-[74px] cursor-pointer items-center justify-center gap-1 rounded-full border px-2 text-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[88px] sm:gap-1.5 sm:px-2.5 sm:text-xs ${
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
        {!iconOnly && <span>{buttonLabel}</span>}
      </button>
      {popover}
    </div>
  );
}
