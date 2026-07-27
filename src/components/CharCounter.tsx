'use client';

/**
 * Live character counter for free-text inputs.
 *
 * Neutral while there is room, amber as the limit gets close, red once the text
 * runs past it. Inputs with a hard `maxLength` can never reach the red state —
 * it exists for soft-capped fields (post composer, post editor) where typing
 * past the limit is allowed but posting is not.
 */
export default function CharCounter({
  value,
  max,
  className = '',
  warnAt = 20,
}: {
  value: string;
  max: number;
  className?: string;
  /** Turn amber once this many characters (or fewer) remain. */
  warnAt?: number;
}) {
  const count = value.length;
  const remaining = max - count;
  const over = remaining < 0;
  const near = !over && remaining <= warnAt;

  const tone = over
    ? 'text-red-600 font-semibold'
    : near
      ? 'text-amber-600'
      : 'text-gray-400';

  return (
    <span
      className={`text-xs tabular-nums transition-colors ${tone} ${className}`}
      aria-live={over ? 'polite' : 'off'}
    >
      {over ? `${-remaining} over limit · ${count}/${max}` : `${count}/${max}`}
    </span>
  );
}
