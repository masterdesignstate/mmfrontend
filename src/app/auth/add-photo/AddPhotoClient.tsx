'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { uploadToAzureBlob } from '@/utils/azureUpload';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
import { apiService, MAX_USER_PICTURES, type UserPicture } from '@/services/api';
import posthog from 'posthog-js';

export default function AddPhotoClient() {
  const [pictures, setPictures] = useState<UserPicture[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<unknown[]>([]);
  const [busy, setBusy] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('user_id');

  // Load any pre-existing pictures (in case user comes back to this step)
  useEffect(() => {
    if (!userId) return;
    apiService.getUserPictures(userId).then(setPictures).catch(() => { /* noop */ });
  }, [userId]);

  // Load questions (preserved from previous behavior)
  useEffect(() => {
    if (!userId) return;
    const questionsParam = searchParams.get('questions');
    if (questionsParam) {
      try { setQuestions(JSON.parse(questionsParam)); return; } catch { /* noop */ }
    }
    fetch(`${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=1&question_number=2`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.results) setQuestions(d.results); })
      .catch(() => { /* noop */ });
  }, [userId, searchParams]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;
    event.target.value = ''; // allow re-selecting the same file later

    if (pictures.length >= MAX_USER_PICTURES) {
      setError(`You can upload up to ${MAX_USER_PICTURES} photos.`);
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);
    try {
      const photoUrl = await uploadToAzureBlob(file, userId, p => setUploadProgress(p));
      const created = await apiService.addUserPicture(userId, photoUrl);
      setPictures(prev => [...prev, created].sort((a, b) => a.order - b.order));
      posthog.capture('profile_photo_uploaded', { user_id: userId });
    } catch (err) {
      console.error('Upload failed:', err);
      posthog.captureException(err as Error);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemove = async (pictureId: string) => {
    if (!userId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiService.deleteUserPicture(userId, pictureId);
      const refreshed = await apiService.getUserPictures(userId);
      setPictures(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove photo');
    } finally {
      setBusy(false);
    }
  };

  const handleMakePrimary = async (pictureId: string) => {
    if (!userId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const newOrder = [pictureId, ...pictures.filter(p => p.id !== pictureId).map(p => p.id)];
      const updated = await apiService.reorderUserPictures(userId, newOrder);
      setPictures(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reorder photos');
    } finally {
      setBusy(false);
    }
  };

  const handleContinue = () => {
    if (!userId || pictures.length === 0) {
      setError('Please add at least one photo.');
      return;
    }
    const params = new URLSearchParams({
      user_id: userId,
      questions: JSON.stringify(questions),
    });
    router.push(`/auth/introcard?${params.toString()}`);
  };

  const primary = pictures[0];
  const thumbs = pictures.slice(1);
  const canAddMore = pictures.length < MAX_USER_PICTURES;

  return (
    <div className="min-h-screen bg-white">
      <header className="w-full bg-white border-b border-gray-200">
        <div className="flex justify-between items-center px-6 py-4">
          <Image src="/assets/mmlogox.png" alt="Logo" width={40} height={40} className="w-10 h-10" />
          <button className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex flex-col items-center min-h-[calc(100vh-80px-120px)] px-6 pb-32 pt-8">
        <div className="max-w-2xl w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Add up to {MAX_USER_PICTURES} profile photos</h1>
          <p className="text-gray-600 mb-8 text-xl">
            Your first photo is your main thumbnail. You can change the order later.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <input
            type="file"
            id="photo-upload"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading || busy || !canAddMore}
          />

          {/* Primary photo (large) */}
          <div className="mb-6">
            {primary ? (
              <div className="relative w-full h-[420px] rounded-lg overflow-hidden bg-gray-100">
                <Image src={primary.image_url} alt="Primary photo" fill className="object-cover" />
                <div className="absolute top-3 left-3 bg-black/70 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                  Primary
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(primary.id)}
                  disabled={busy}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/70 hover:bg-black text-white rounded-full flex items-center justify-center cursor-pointer disabled:opacity-50"
                  title="Remove"
                  aria-label="Remove primary photo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label
                htmlFor="photo-upload"
                className="flex flex-col items-center justify-center w-full h-[420px] rounded-lg bg-gray-100 border-2 border-dashed border-gray-400 cursor-pointer hover:bg-gray-50"
              >
                <Image src="/assets/kamm.png" alt="Camera icon" width={80} height={80} className="mb-6" />
                <span className="px-8 py-3 bg-white border border-gray-400 rounded-md text-gray-900 text-base hover:shadow-md">
                  Add your first photo
                </span>
              </label>
            )}
          </div>

          {/* Additional thumbnails grid (slots 2..5) */}
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: MAX_USER_PICTURES - 1 }).map((_, i) => {
              const pic = thumbs[i];
              if (pic) {
                return (
                  <div key={pic.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                    <Image src={pic.image_url} alt={`Photo ${i + 2}`} fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemove(pic.id)}
                      disabled={busy}
                      className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/70 hover:bg-black text-white rounded-full flex items-center justify-center cursor-pointer disabled:opacity-50"
                      title="Remove"
                      aria-label="Remove photo"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMakePrimary(pic.id)}
                      disabled={busy}
                      className="absolute bottom-0 left-0 right-0 bg-black/70 hover:bg-black text-white text-[11px] font-semibold py-1.5 cursor-pointer disabled:opacity-50"
                    >
                      Make primary
                    </button>
                  </div>
                );
              }
              const isNextSlot = i === thumbs.length;
              return (
                <label
                  key={`empty-${i}`}
                  htmlFor={isNextSlot && canAddMore ? 'photo-upload' : undefined}
                  className={`relative aspect-square rounded-lg border-2 border-dashed flex items-center justify-center ${
                    isNextSlot && canAddMore && !uploading
                      ? 'border-gray-400 bg-gray-50 cursor-pointer hover:bg-gray-100'
                      : 'border-gray-200 bg-gray-50/50 cursor-not-allowed'
                  }`}
                >
                  {isNextSlot && uploading ? (
                    <span className="text-xs font-semibold text-gray-700">{uploadProgress}%</span>
                  ) : (
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </label>
              );
            })}
          </div>

          <p className="mt-3 text-sm text-gray-500">
            {pictures.length} of {MAX_USER_PICTURES} photos added
          </p>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="w-full h-1 bg-gray-200">
          <div className="h-full bg-black" style={{ width: '15%' }}></div>
        </div>
        <div className="flex justify-between items-center px-6 py-4">
          <button
            onClick={() => router.back()}
            className="text-gray-900 font-medium hover:text-gray-500 transition-colors cursor-pointer"
          >
            Back
          </button>
          <button
            onClick={handleContinue}
            disabled={pictures.length === 0 || uploading || busy}
            className={`px-8 py-3 rounded-md font-medium transition-colors ${
              pictures.length > 0 && !uploading && !busy
                ? 'bg-black text-white hover:bg-gray-800 cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Next
          </button>
        </div>
      </footer>
    </div>
  );
}
