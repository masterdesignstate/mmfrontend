'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  getAnswerValueFromPercentage,
  getAnswerValuePosition,
  getAnswerValues,
  getNearestAnswerValue,
  type AnswerValueLabel,
} from '@/utils/answerValues';

const THUMB_PX = 28;

export interface AnswerSliderProps {
  value: number;
  onChange: (value: number) => void;
  /** Answer options that define the selectable positions. Defaults to the 1–5 scale. */
  labels?: AnswerValueLabel[];
  isOpenToAll?: boolean;
  isImportance?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

/**
 * The one slider used by onboarding, the questions editor and the profile.
 *
 * Interaction is Pointer Events with pointer capture, so a drag keeps tracking after the
 * pointer leaves the track (mouse) and a swipe works on touch without scrolling the page.
 * All value math goes through `@/utils/answerValues`, so a question with a partial scale
 * (e.g. only values 1/3/5) snaps to its real options rather than a hardcoded 1–5.
 */
export default function AnswerSlider({
  value,
  onChange,
  labels,
  isOpenToAll = false,
  isImportance = false,
  disabled = false,
  ariaLabel,
}: AnswerSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingPointerRef = useRef<number | null>(null);
  const [fillWidth, setFillWidth] = useState('0%');
  const hasAnimatedRef = useRef(false);
  const rafRef = useRef<number[]>([]);

  const valueLabels: AnswerValueLabel[] = labels && labels.length > 0 ? labels : [];

  const answerValues = getAnswerValues(valueLabels);
  const minValue = answerValues[0];
  const maxValue = answerValues[answerValues.length - 1];
  const displayValue = getNearestAnswerValue(value, valueLabels);
  const displayPosition = getAnswerValuePosition(value, valueLabels);

  // Open-to-all fills the track left-to-right once, then holds.
  useLayoutEffect(() => {
    const frames = rafRef.current;
    if (isOpenToAll && !hasAnimatedRef.current) {
      setFillWidth('0%');
      frames.push(
        requestAnimationFrame(() => {
          frames.push(
            requestAnimationFrame(() => {
              setFillWidth('100%');
              hasAnimatedRef.current = true;
            })
          );
        })
      );
      return () => {
        frames.forEach(cancelAnimationFrame);
        frames.length = 0;
      };
    }
    if (!isOpenToAll) {
      hasAnimatedRef.current = false;
      setFillWidth('0%');
    }
  }, [isOpenToAll]);

  const interactive = !disabled && !isOpenToAll;

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      if (rect.width === 0) return;
      onChange(getAnswerValueFromPercentage((clientX - rect.left) / rect.width, valueLabels));
    },
    // valueLabels is derived fresh each render; depend on its identity-stable projection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange, answerValues.join(',')]
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    // Capture routes later moves here even when the pointer leaves the track. It can throw
    // for a pointer the browser no longer considers active, so the drag flag is what the
    // move handler actually keys off.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* capture is an optimisation, not a requirement */
    }
    draggingPointerRef.current = event.pointerId;
    updateFromClientX(event.clientX);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    if (draggingPointerRef.current !== event.pointerId) return;
    updateFromClientX(event.clientX);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingPointerRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const index = answerValues.indexOf(displayValue);
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') nextIndex = index + 1;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') nextIndex = index - 1;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = answerValues.length - 1;

    if (nextIndex === null) return;
    event.preventDefault();
    const clamped = Math.max(0, Math.min(answerValues.length - 1, nextIndex));
    if (answerValues[clamped] !== displayValue) onChange(answerValues[clamped]);
  };

  useEffect(() => {
    const frames = rafRef.current;
    return () => {
      frames.forEach(cancelAnimationFrame);
      frames.length = 0;
    };
  }, []);

  const activeLabel = valueLabels.find(label => Number(label.value) === displayValue)?.answer_text;

  return (
    // py-3 on mobile gives the 20px track a ~44px hit area without changing its look.
    <div
      className={`relative flex w-full select-none items-center py-3 sm:py-0 ${
        interactive ? 'cursor-pointer' : 'cursor-default'
      }`}
      style={{ touchAction: 'none', userSelect: 'none' }}
      role="slider"
      tabIndex={interactive ? 0 : -1}
      aria-label={ariaLabel}
      aria-disabled={!interactive}
      aria-valuemin={minValue}
      aria-valuemax={maxValue}
      aria-valuenow={isOpenToAll ? undefined : displayValue}
      aria-valuetext={isOpenToAll ? 'Open to all' : activeLabel || String(displayValue)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      onDragStart={(event) => event.preventDefault()}
    >
      <div ref={trackRef} className="relative h-5 w-full">
        {!isOpenToAll && (
          <span className="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 text-xs text-gray-500">
            {minValue}
          </span>
        )}

        <div
          className="h-5 w-full rounded-[20px] border transition-all duration-200"
          style={{
            backgroundColor: isOpenToAll ? '#672DB7' : '#F5F5F5',
            borderColor: isOpenToAll ? '#672DB7' : '#ADADAD',
          }}
        >
          {isOpenToAll && (
            <div
              className="h-full rounded-[20px] bg-[#672DB7]"
              style={{ width: fillWidth, transition: 'width 1.2s ease-in-out' }}
            />
          )}
        </div>

        {!isOpenToAll && (
          <div
            className="pointer-events-none absolute top-1/2 z-30 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-gray-300 text-sm font-semibold"
            style={{
              backgroundColor: isImportance ? 'white' : '#672DB7',
              boxShadow: isImportance
                ? '0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)'
                : '0 1px 3px rgba(0,0,0,0.12)',
              left:
                displayPosition === 0
                  ? '0px'
                  : displayPosition === 100
                  ? `calc(100% - ${THUMB_PX}px)`
                  : `calc(${displayPosition}% - ${THUMB_PX / 2}px)`,
            }}
          >
            <span style={{ color: isImportance ? '#672DB7' : 'white' }}>{displayValue}</span>
          </div>
        )}

        {!isOpenToAll && (
          <span className="pointer-events-none absolute right-2 top-1/2 z-10 -translate-y-1/2 text-xs text-gray-500">
            {maxValue}
          </span>
        )}
      </div>
    </div>
  );
}
