'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

export interface TourStep {
  id: string;
  /** CSS selector for the element to spotlight; omit for a centred card. */
  target?: string;
  title: string;
  body: string;
  /** Shown under the body for steps that ask the user to do something. */
  hint?: string;
}

interface GuidedTourProps {
  steps: TourStep[];
  index: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  /** Label for the primary button on the last step. */
  finishLabel?: string;
  /** Briefly shown in place of the hint once the step's task is done. */
  completed?: boolean;
}

interface Rect { top: number; left: number; width: number; height: number }

const PAD = 8;
const CARD_WIDTH = 320;
const CARD_GAP = 12;

const sameRect = (a: Rect | null, b: Rect | null) =>
  a === b || (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height);

/**
 * A spotlight walkthrough: dims the page, cuts a hole around the current step's target and
 * pins an explanation card beside it. The hole lets clicks through, so a step can ask the
 * user to actually use the control it is describing.
 */
export default function GuidedTour({
  steps,
  index,
  onNext,
  onBack,
  onSkip,
  finishLabel = 'Done',
  completed = false,
}: GuidedTourProps) {
  const step = steps[index];
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardHeight, setCardHeight] = useState(0);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<Rect | null>(null);

  useEffect(() => {
    if (!step?.target) return;
    document.querySelector(step.target)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [step?.target]);

  // Targets move as the page scrolls, the dock re-lays out and sliders change size, so
  // the hole tracks its target every frame rather than on a fixed set of events.
  useEffect(() => {
    let frame = 0;
    const track = () => {
      const el = step?.target ? document.querySelector(step.target) : null;
      const box = el?.getBoundingClientRect();
      const next = box && box.width > 0 && box.height > 0
        ? { top: box.top - PAD, left: box.left - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 }
        : null;
      if (!sameRect(rectRef.current, next)) {
        rectRef.current = next;
        setRect(next);
      }
      setViewport(prev => (
        prev.width === window.innerWidth && prev.height === window.innerHeight
          ? prev
          : { width: window.innerWidth, height: window.innerHeight }
      ));
      frame = requestAnimationFrame(track);
    };
    track();
    return () => cancelAnimationFrame(frame);
  }, [step?.target]);

  useLayoutEffect(() => {
    setCardHeight(cardRef.current?.offsetHeight ?? 0);
  }, [index, rect?.width, viewport.width, completed]);

  if (!step || viewport.width === 0) return null;

  const isLast = index === steps.length - 1;
  const cardWidth = Math.min(CARD_WIDTH, viewport.width - 24);
  const cardStyle: CSSProperties = (() => {
    if (!rect) {
      return { top: Math.max(12, (viewport.height - cardHeight) / 2), left: (viewport.width - cardWidth) / 2, width: cardWidth };
    }
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - cardWidth / 2), viewport.width - cardWidth - 12);
    const below = rect.top + rect.height + CARD_GAP;
    const above = rect.top - CARD_GAP - cardHeight;
    const fitsBelow = below + cardHeight <= viewport.height - 12;
    const top = fitsBelow || above < 12 ? Math.min(below, viewport.height - cardHeight - 12) : above;
    return { top: Math.max(12, top), left, width: cardWidth };
  })();

  return (
    <div className="fixed inset-0 z-[300] pointer-events-none" role="dialog" aria-modal="false" aria-labelledby="tour-step-title">
      {rect ? (
        <div
          className="absolute rounded-2xl ring-2 ring-white/90 transition-all duration-300 ease-out"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow: '0 0 0 9999px rgba(17, 12, 34, 0.55)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(17,12,34,0.55)] pointer-events-auto" />
      )}

      <div
        ref={cardRef}
        className="absolute pointer-events-auto rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-black/5 transition-[top,left] duration-300 ease-out"
        style={cardStyle}
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#672DB7]">
            Step {index + 1} of {steps.length}
          </span>
          {!isLast && (
            <button type="button" onClick={onSkip} className="text-xs font-medium text-gray-400 hover:text-gray-600">
              Skip tour
            </button>
          )}
        </div>
        <h2 id="tour-step-title" className="text-base font-bold text-gray-900">{step.title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">{step.body}</p>
        {completed ? (
          <p className="mt-2 text-sm font-semibold text-green-600">Nice, that&apos;s it!</p>
        ) : step.hint ? (
          <p className="mt-2 rounded-lg bg-purple-50 px-2.5 py-1.5 text-xs font-medium text-[#672DB7]">{step.hint}</p>
        ) : null}

        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1" aria-hidden="true">
            {steps.map((s, i) => (
              <span key={s.id} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-4 bg-[#672DB7]' : 'w-1.5 bg-gray-200'}`} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button type="button" onClick={onBack} className="px-2 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900">
                Back
              </button>
            )}
            <button
              type="button"
              onClick={onNext}
              className="rounded-lg bg-[#672DB7] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#5a26a0]"
            >
              {isLast ? finishLabel : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
