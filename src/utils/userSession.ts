/**
 * Identity handling for the signup / onboarding flow.
 *
 * Onboarding passes `user_id` from step to step in the query string. That works while the
 * user walks straight through, but the id is lost the moment they leave and come back by
 * any route that drops the query string — a bookmark, browser history, reopening the tab,
 * a shared link. Some steps then failed silently and the user was left on a step that
 * could not do anything, which read as "my details are gone".
 *
 * These helpers give every step the same two behaviours: fall back to the copy in
 * localStorage, and if the identity is genuinely unusable, clear it and send the user back
 * to the start rather than stranding them.
 */

const USER_ID_KEY = 'user_id';

/** The id persisted at signup/login, or null. Safe to call during SSR. */
export function getStoredUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(USER_ID_KEY);
  } catch {
    return null;
  }
}

/**
 * Resolve the acting user for an onboarding step: the query string wins (it is the most
 * specific), then the persisted copy. Re-persists the query-string value so later steps
 * survive a lost URL.
 */
export function resolveOnboardingUserId(urlUserId: string | null | undefined): string | null {
  if (urlUserId) {
    try {
      window.localStorage.setItem(USER_ID_KEY, urlUserId);
    } catch {
      /* private mode — the query string still carries us through this step */
    }
    return urlUserId;
  }
  return getStoredUserId();
}

/**
 * Forget the current identity. Used when the backend tells us the id does not resolve to a
 * real account — a deleted user, or a stale id left in localStorage from a previous signup.
 * Onboarding progress keys are keyed by user id, so they go too.
 */
export function clearStoredIdentity(): void {
  if (typeof window === 'undefined') return;
  try {
    const userId = window.localStorage.getItem(USER_ID_KEY);
    window.localStorage.removeItem(USER_ID_KEY);
    window.localStorage.removeItem('is_admin');
    window.localStorage.removeItem('user_email');
    if (userId) {
      window.localStorage.removeItem(`onboarding_answered_numbers_v2_${userId}`);
      // Pre-split key, written when the mandatory block was numbered 1-10.
      window.localStorage.removeItem(`onboarding_answered_numbers_${userId}`);
      window.localStorage.removeItem(`answered_questions_${userId}`);
      window.localStorage.removeItem(`mandatory_questions_complete_${userId}`);
    }
  } catch {
    /* nothing we can do; the redirect below still gets them somewhere usable */
  }
}

/** True when an error thrown by apiService means "this account does not exist". */
export function isMissingUserError(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  return status === 404;
}
