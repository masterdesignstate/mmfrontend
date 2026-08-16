'use client';

import { useCallback, useRef } from 'react';

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
  /** Whether this answer is allowed to enter the mobile OTA state. */
  otaEnabled?: boolean;
  /** On phones, tapping the value-5 thumb again toggles OTA. */
  onOtaToggle?: () => void;
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
  otaEnabled = false,
  onOtaToggle,
}: AnswerSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingPointerRef = useRef<number | null>(null);
  const pointerGestureRef = useRef<{
    startX: number;
    startY: number;
    moved: boolean;
    otaTapCandidate: boolean;
  } | null>(null);
  const valueLabels: AnswerValueLabel[] = labels && labels.length > 0 ? labels : [];

  const answerValues = getAnswerValues(valueLabels);
  const minValue = answerValues[0];
  const maxValue = answerValues[answerValues.length - 1];
  const displayValue = getNearestAnswerValue(value, valueLabels);
  const displayPosition = getAnswerValuePosition(value, valueLabels);

  const canToggleOta = !disabled && otaEnabled && Boolean(onOtaToggle);
  const interactive = !disabled && (!isOpenToAll || canToggleOta);

  const isMobileViewport = () =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;

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
    const mobileOtaInteraction = canToggleOta && isMobileViewport();
    if (isOpenToAll && !mobileOtaInteraction) return;
    // Capture routes later moves here even when the pointer leaves the track. It can throw
    // for a pointer the browser no longer considers active, so the drag flag is what the
    // move handler actually keys off.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* capture is an optimisation, not a requirement */
    }
    draggingPointerRef.current = event.pointerId;
    const trackRect = trackRef.current?.getBoundingClientRect();
    const isAtFiveThumb = Boolean(
      mobileOtaInteraction &&
      !isOpenToAll &&
      displayValue === maxValue &&
      trackRect &&
      Math.abs(event.clientX - trackRect.right) <= THUMB_PX + 8
    );
    const isAtOtaThumb = Boolean(
      mobileOtaInteraction &&
      isOpenToAll &&
      trackRect &&
      Math.abs(event.clientX - trackRect.right) <= THUMB_PX + 12
    );
    pointerGestureRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      otaTapCandidate: isOpenToAll ? isAtOtaThumb : isAtFiveThumb,
    };
    if (isOpenToAll) return;
    updateFromClientX(event.clientX);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    if (draggingPointerRef.current !== event.pointerId) return;
    const gesture = pointerGestureRef.current;
    if (gesture && Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 6) {
      gesture.moved = true;
    }
    if (isOpenToAll) return;
    updateFromClientX(event.clientX);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = pointerGestureRef.current;
    if (gesture?.otaTapCandidate && !gesture.moved) onOtaToggle?.();
    draggingPointerRef.current = null;
    pointerGestureRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingPointerRef.current = null;
    pointerGestureRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    if (
      canToggleOta &&
      (event.key === 'Enter' || event.key === ' ') &&
      (isOpenToAll || displayValue === maxValue)
    ) {
      event.preventDefault();
      onOtaToggle?.();
      return;
    }
    if (isOpenToAll) return;
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
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
      onDragStart={(event) => event.preventDefault()}
    >
      <div ref={trackRef} className="relative h-5 w-full">
        {!isOpenToAll && (
          <span className="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 text-xs text-gray-500">
            {minValue}
          </span>
        )}

        {!isOpenToAll &&
          answerValues.slice(1, -1).map(markerValue => (
            <span
              key={markerValue}
              className="pointer-events-none absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-xs text-gray-500"
              style={{ left: `${getAnswerValuePosition(markerValue, valueLabels)}%` }}
              aria-hidden
            >
              {markerValue}
            </span>
          ))}

        {isOpenToAll && (
          <div
            className="mobile-ota-thumb-glow pointer-events-none absolute top-1/2 z-30 h-7 w-7 -translate-y-1/2 rounded-full border border-gray-300 bg-white shadow-sm sm:hidden"
            style={{ left: `calc(100% - ${THUMB_PX}px)` }}
            aria-hidden
          />
        )}

        <div
          className={`h-5 w-full rounded-[20px] border transition-colors duration-200 ${
            isOpenToAll ? 'mobile-ota-track-glow' : ''
          }`}
          style={{
            backgroundColor: isOpenToAll ? '#672DB7' : '#F5F5F5',
            borderColor: isOpenToAll ? '#672DB7' : '#ADADAD',
          }}
        />

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
