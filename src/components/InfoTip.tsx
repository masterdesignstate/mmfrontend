'use client';

import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useDismissOnOutside } from '@/hooks/useDismissOnOutside';

interface InfoTipProps {
  /** Panel contents. */
  children: ReactNode;
  /** What the trigger announces to a screen reader, e.g. "About compatibility types". */
  label: string;
  className?: string;
  /** Horizontal anchor relative to the trigger. */
  align?: 'left' | 'right' | 'center';
  /** Preferred side of the trigger; flipped automatically when that side has no room. */
  placement?: 'top' | 'bottom';
  /** Replaces the default "?" bubble — pass an icon or a chip. */
  trigger?: ReactNode;
  /** Applied to the trigger button when `trigger` is supplied. */
  triggerClassName?: string;
  /** Panel width; the default suits a sentence or two. */
  panelClassName?: string;
}

const DEFAULT_TRIGGER_CLASSES =
  'w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center cursor-pointer hover:bg-purple-200';

/**
 * The one tooltip look used everywhere on the site: dark panel, small white text.
 *
 * Exported so the few tooltips that cannot be an InfoTip (hover hints on disabled controls,
 * where a click would do nothing) still match it instead of drifting into their own style.
 */
export const TIP_PANEL_CLASSES = 'p-3 bg-gray-900 text-white text-xs leading-relaxed rounded-lg shadow-lg';

/** Marker for the `TIP_PANEL_CLASSES` panel. `side` is the edge the arrow sits on. */
export const tipArrowClasses = (side: 'top' | 'bottom', align: 'left' | 'center' | 'right' = 'left') =>
  `absolute ${side === 'top' ? '-top-1' : '-bottom-1'} ${
    align === 'right' ? 'right-2' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-2'
  } w-2 h-2 bg-gray-900 rotate-45`;

/** Gap between trigger and panel, and the minimum distance kept from every screen edge. */
const GAP = 8;
const EDGE = 8;
const ARROW = 8;

interface PanelPosition {
  top: number;
  left: number;
  /** Which side of the trigger the panel ended up on after flipping. */
  side: 'top' | 'bottom';
  /** Arrow x within the panel, so it keeps pointing at the trigger after clamping. */
  arrowLeft: number;
  /** Cap when neither side has enough room; the panel then scrolls internally. */
  maxHeight?: number;
}

/**
 * The little "?" (or any trigger) that explains a control.
 *
 * Opens on click or tap, closes on an outside tap or Escape, and is a real button — a hover
 * panel never appears on a phone and a `<div>` trigger cannot be reached by keyboard.
 *
 * The panel is portaled to `document.body` and positioned against the viewport. The earlier
 * version sat inside the trigger's own ancestors, and inside the filter modal that meant the
 * scrolling body: on a phone the panel was cut off at the modal's edge, and no amount of
 * nudging fixes that from inside a clipping container.
 */
export default function InfoTip({
  children,
  label,
  className = '',
  align = 'left',
  placement = 'bottom',
  trigger,
  triggerClassName = '',
  panelClassName = 'w-56 sm:w-64',
}: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const close = useCallback(() => setOpen(false), []);
  useDismissOnOutside([triggerRef, panelRef], open, close);

  /**
   * Place the panel next to the trigger, then keep it fully on screen.
   *
   * Runs in useLayoutEffect so the first paint already has the corrected position, and
   * re-runs on scroll and resize while open so the panel stays anchored to its trigger
   * (the modal body scrolls independently of the page, so scroll is listened to in the
   * capture phase to catch it).
   */
  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    const measure = () => {
      const triggerEl = triggerRef.current;
      const panel = panelRef.current;
      if (!triggerEl || !panel) return;

      const t = triggerEl.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const panelWidth = panel.offsetWidth;
      const panelHeight = panel.scrollHeight;

      // Horizontal: honour the requested alignment, then clamp to the screen.
      let left =
        align === 'right' ? t.right - panelWidth : align === 'center' ? t.left + t.width / 2 - panelWidth / 2 : t.left;
      left = Math.min(Math.max(left, EDGE), Math.max(EDGE, vw - EDGE - panelWidth));

      // Vertical: prefer the requested side, flip if it does not fit, and as a last resort
      // take whichever side is taller and let the panel scroll.
      const roomBelow = vh - EDGE - (t.bottom + GAP);
      const roomAbove = t.top - GAP - EDGE;
      let side: 'top' | 'bottom' = placement;
      const fits = (s: 'top' | 'bottom') => (s === 'bottom' ? roomBelow : roomAbove) >= panelHeight;
      if (!fits(side)) {
        const other: 'top' | 'bottom' = side === 'bottom' ? 'top' : 'bottom';
        if (fits(other)) side = other;
        else side = roomBelow >= roomAbove ? 'bottom' : 'top';
      }
      const room = side === 'bottom' ? roomBelow : roomAbove;
      const maxHeight = panelHeight > room ? Math.max(room, 80) : undefined;
      const height = Math.min(panelHeight, maxHeight ?? panelHeight);
      const top = side === 'bottom' ? t.bottom + GAP : t.top - GAP - height;

      const arrowLeft = Math.min(
        Math.max(t.left + t.width / 2 - left - ARROW / 2, ARROW),
        panelWidth - ARROW * 2
      );

      setPosition({ top, left, side, arrowLeft, maxHeight });
    };

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, align, placement]);

  const panelStyle: CSSProperties = position
    ? { top: position.top, left: position.left, maxHeight: position.maxHeight }
    : // Measured off-screen on the first pass so the panel's size is known before it is placed.
      { top: 0, left: 0, visibility: 'hidden' };

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        className={`focus:outline-none focus-visible:ring-2 focus-visible:ring-[#672DB7] ${
          trigger ? `cursor-pointer ${triggerClassName}` : DEFAULT_TRIGGER_CLASSES
        }`}
      >
        {trigger ?? (
          <span className="text-[11px] font-semibold text-[#672DB7] leading-none" aria-hidden="true">?</span>
        )}
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id={panelId}
            ref={panelRef}
            role="dialog"
            style={panelStyle}
            // Above the modals (z-[200]) that most triggers live in.
            className={`fixed z-[300] ${panelClassName} max-w-[calc(100vw-1rem)] ${TIP_PANEL_CLASSES} ${
              position?.maxHeight ? 'overflow-y-auto' : ''
            }`}
          >
            {children}
            {position && !position.maxHeight && (
              <div
                className={`absolute ${position.side === 'bottom' ? '-top-1' : '-bottom-1'} w-2 h-2 bg-gray-900 rotate-45`}
                style={{ left: position.arrowLeft }}
              />
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
