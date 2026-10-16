/** Whether this user has been through (or skipped) the practice question before Q1. */
const demoSeenKey = (userId: string) => `onboarding_demo_seen_${userId}`;

export const hasSeenOnboardingDemo = (userId: string): boolean => {
  try {
    return localStorage.getItem(demoSeenKey(userId)) === '1';
  } catch {
    return false;
  }
};

export const markOnboardingDemoSeen = (userId: string): void => {
  try {
    localStorage.setItem(demoSeenKey(userId), '1');
  } catch {
    // Private mode: the demo just shows again next time.
  }
};
