/**
 * Shared rules for length-capped free-text fields.
 *
 * Every capped field follows the same contract: typing past the limit is
 * allowed (so the counter can turn red and explain the problem), but the
 * action that would persist the text is blocked until the value fits. Inputs
 * therefore must NOT carry a hard `maxLength` — that would silently swallow
 * keystrokes and make the over-limit state unreachable.
 */

/** True when the trimmed value exceeds `max`. Trimmed, because that is what gets saved. */
export const isOverLimit = (value: string, max: number): boolean =>
  value.trim().length > max;

/** Standard message shown when a field is over its limit. */
export const overLimitMessage = (label: string, max: number): string =>
  `${label} must be ${max} characters or fewer.`;
