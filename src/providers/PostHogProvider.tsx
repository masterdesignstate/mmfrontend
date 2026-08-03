'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  // Next.js initializes PostHog once in instrumentation-client.ts.
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
