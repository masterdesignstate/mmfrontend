import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const AddPhotoClient = dynamic(() => import('./AddPhotoClient'), { ssr: false });

export const dynamic = 'force-dynamic';

export default function AddPhotoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AddPhotoClient />
    </Suspense>
  );
}
