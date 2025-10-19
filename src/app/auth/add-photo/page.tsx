import { Suspense } from 'react';
import AddPhotoClient from './AddPhotoClient';

export const dynamic = 'force-dynamic';

export default function AddPhotoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AddPhotoClient />
    </Suspense>
  );
}
