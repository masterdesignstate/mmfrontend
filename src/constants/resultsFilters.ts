/**
 * The Results filter state. Mirrors `mmbackend/api/result_filters.py`, which validates
 * the copy kept on the server (User.results_filters and saved presets).
 */

export interface FilterRange {
  min: number;
  max: number;
}

export const COMPATIBILITY_TYPES = ['overall', 'compatible_with_me', 'im_compatible_with'] as const;
export type CompatibilityType = typeof COMPATIBILITY_TYPES[number];
export type CompatibilityRanges = Record<CompatibilityType, FilterRange>;
export const FULL_COMPATIBILITY_RANGE: FilterRange = { min: 0, max: 100 };

export interface ResultsFilters {
  compatibilityType: CompatibilityType;
  compatibilityRanges: CompatibilityRanges;
  distance: FilterRange;
  age: FilterRange;
  tags: string[];
  requiredOnly: boolean;
  requiredScope: 'my' | 'their';
}

export const DEFAULT_RESULTS_FILTERS: ResultsFilters = {
  compatibilityType: 'overall',
  compatibilityRanges: {
    overall: FULL_COMPATIBILITY_RANGE,
    compatible_with_me: FULL_COMPATIBILITY_RANGE,
    im_compatible_with: FULL_COMPATIBILITY_RANGE,
  },
  distance: { min: 1, max: 100 },
  age: { min: 18, max: 80 },
  tags: [],
  requiredOnly: false,
  requiredScope: 'my',
};

export const MAX_SAVED_RESULT_FILTERS = 20;
export const MAX_SAVED_RESULT_FILTER_NAME = 40;

const resultsFiltersStorageKey = (userId: string) => `results_filters_${userId}`;

const cleanRange = (value: unknown, fallback: FilterRange): FilterRange => {
  if (!value || typeof value !== 'object') return { ...fallback };
  const { min, max } = value as Partial<FilterRange>;
  const lo = typeof min === 'number' ? Math.max(fallback.min, min) : fallback.min;
  const hi = typeof max === 'number' ? Math.min(fallback.max, max) : fallback.max;
  return lo <= hi ? { min: lo, max: hi } : { ...fallback };
};

/** Fill gaps from the defaults, so a partial or older payload is always a full filter set. */
export const normalizeResultsFilters = (value: unknown): ResultsFilters => {
  if (!value || typeof value !== 'object') return { ...DEFAULT_RESULTS_FILTERS, tags: [] };
  const raw = value as Partial<ResultsFilters> & { compatibility?: unknown };
  const compatibilityType = COMPATIBILITY_TYPES.find(kind => kind === raw.compatibilityType) ?? 'overall';
  const legacyRanges = { [compatibilityType]: raw.compatibility };
  const ranges = raw.compatibilityRanges ?? legacyRanges;
  return {
    compatibilityType,
    compatibilityRanges: {
      overall: cleanRange(ranges.overall, FULL_COMPATIBILITY_RANGE),
      compatible_with_me: cleanRange(ranges.compatible_with_me, FULL_COMPATIBILITY_RANGE),
      im_compatible_with: cleanRange(ranges.im_compatible_with, FULL_COMPATIBILITY_RANGE),
    },
    distance: cleanRange(raw.distance, DEFAULT_RESULTS_FILTERS.distance),
    age: cleanRange(raw.age, DEFAULT_RESULTS_FILTERS.age),
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    requiredOnly: raw.requiredOnly === true,
    requiredScope: raw.requiredScope === 'their' ? 'their' : 'my',
  };
};

export const isFullCompatibilityRange = ({ min, max }: FilterRange): boolean =>
  min === FULL_COMPATIBILITY_RANGE.min && max === FULL_COMPATIBILITY_RANGE.max;

export const isDefaultResultsFilters = (filters: ResultsFilters): boolean =>
  filters.compatibilityType === DEFAULT_RESULTS_FILTERS.compatibilityType &&
  COMPATIBILITY_TYPES.every(kind => isFullCompatibilityRange(filters.compatibilityRanges[kind])) &&
  filters.distance.min === DEFAULT_RESULTS_FILTERS.distance.min &&
  filters.distance.max === DEFAULT_RESULTS_FILTERS.distance.max &&
  filters.age.min === DEFAULT_RESULTS_FILTERS.age.min &&
  filters.age.max === DEFAULT_RESULTS_FILTERS.age.max &&
  filters.tags.length === 0 &&
  !filters.requiredOnly;

export const sameResultsFilters = (a: ResultsFilters, b: ResultsFilters): boolean =>
  JSON.stringify(normalizeResultsFilters(a)) === JSON.stringify(normalizeResultsFilters(b));

export const readStoredResultsFilters = (): ResultsFilters | null => {
  if (typeof window === 'undefined') return null;
  const userId = localStorage.getItem('user_id');
  if (!userId) return null;
  const stored = localStorage.getItem(resultsFiltersStorageKey(userId));
  if (!stored) return null;
  try {
    return normalizeResultsFilters(JSON.parse(stored));
  } catch {
    return null;
  }
};

export const writeStoredResultsFilters = (filters: ResultsFilters) => {
  if (typeof window === 'undefined') return;
  const userId = localStorage.getItem('user_id');
  if (!userId) return;
  localStorage.setItem(resultsFiltersStorageKey(userId), JSON.stringify(filters));
};
