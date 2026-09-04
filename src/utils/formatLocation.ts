/**
 * Locations are stored as the raw Google Places prediction ("Philadelphia, PA, USA"), so the
 * country is part of one free-text string rather than its own field. Domestic profiles are
 * the common case and the country adds nothing there, so it is trimmed for display only —
 * the stored value keeps its country, and profiles abroad still show theirs.
 */
/** Compared against a form with the periods removed, so "U.S.A." matches "usa". */
const DOMESTIC_SUFFIXES = new Set([
  'usa',
  'us',
  'united states',
  'united states of america',
]);

export const formatLocation = (location?: string | null): string => {
  const trimmed = (location || '').trim();
  if (!trimmed) return '';

  const parts = trimmed.split(',').map(part => part.trim()).filter(Boolean);
  // A bare "USA" is the whole location, not a redundant suffix — leave it alone.
  if (parts.length < 2) return trimmed;

  const last = parts[parts.length - 1].toLowerCase().replace(/\./g, '').trim();
  if (DOMESTIC_SUFFIXES.has(last)) {
    return parts.slice(0, -1).join(', ');
  }

  return parts.join(', ');
};
