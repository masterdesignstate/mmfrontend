import { Suspense, type ReactNode } from 'react';

export const dynamic = 'force-dynamic';

export default function QuestionsLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen" />}>{children}</Suspense>;
}
