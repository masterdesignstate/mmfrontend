'use client';

import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import { useDismissOnOutside } from '@/hooks/useDismissOnOutside';

interface InfoTipProps {
  /** Panel contents. */
  children: ReactNode;
  /** What the trigger announces to a screen reader, e.g. "About compatibility types". */
  label: string;
  className?: string;
  /** Horizontal anchor; use `right` where a left-anchored panel would run off-screen. */
  align?: 'left' | 'right' | 'center';
  /** Which side of the trigger the panel sits on. */
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
 * The little "?" (or any trigger) that explains a control.
 *
 * Replaces a hover-only pattern that was unusable on a phone: the panel revealed on
 * `group-hover`, which a touch screen never fires, and some copies were additionally
 * `hidden … sm:block` so they did not exist below 640px at all. The trigger was a plain
 * `<div>`, so it could not be reached by keyboard either.
 *
 * This opens on click or tap, closes on an outside tap or Escape, and is a real button.
 */
export default function InfoTip({
  children,
  label,
  className = '',
  align = 'left',
  placement = 'bottom',
  trigger,
  triggerClassName = '',
  panelClassName = 'w-64',
}: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const close = useCallback(() => setOpen(false), []);
  useDismissOnOutside(wrapperRef, open, close);

  const alignClasses =
    align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0';
  const placementClasses = placement === 'top' ? 'bottom-full mb-2' : 'top-6';
  const arrowSide = placement === 'top' ? '-bottom-1' : '-top-1';
  const arrowAlign =
    align === 'right' ? 'right-2' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-2';

  return (
    <div className={`relative inline-flex ${className}`} ref={wrapperRef}>
      <button
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

      {open && (
        <div
          id={panelId}
          role="dialog"
          className={`absolute ${placementClasses} ${alignClasses} ${panelClassName} max-w-[calc(100vw-2rem)] p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50`}
        >
          {children}
          <div className={`absolute ${arrowSide} ${arrowAlign} w-2 h-2 bg-gray-900 rotate-45`} />
        </div>
      )}
    </div>
  );
}
