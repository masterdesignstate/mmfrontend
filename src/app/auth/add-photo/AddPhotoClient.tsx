'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { uploadToAzureBlob } from '@/utils/azureUpload';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
import { FEMALE, MALE, RELATIONSHIP } from '@/constants/mandatoryQuestions';
import { apiService, MAX_USER_PICTURES, type UserPicture } from '@/services/api';
import { clearStoredIdentity, isMissingUserError, resolveOnboardingUserId } from '@/utils/userSession';
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
  // Fall back to the persisted id: this step used to read the query string only, so
  // returning to it without one left the page unable to upload or list anything.
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const resolved = resolveOnboardingUserId(searchParams.get('user_id'));
    if (!resolved) {
      router.replace('/auth/register');
      return;
    }
    setUserId(resolved);
  }, [searchParams, router]);

  // Send the user back to the start when the stored id no longer resolves to an account,
  // instead of leaving them on a step where every action fails.
  const handleLostIdentity = useCallback(() => {
    clearStoredIdentity();
    router.replace('/auth/register?reason=session_expired');
  }, [router]);

  // Load any pre-existing pictures (in case user comes back to this step)
  useEffect(() => {
    if (!userId) return;
    apiService.getUserPictures(userId)
      .then(setPictures)
      .catch((err) => {
        // Previously swallowed, which is why the photos already on the account looked lost.
        if (isMissingUserError(err)) {
          handleLostIdentity();
          return;
        }
        setError('We could not load your photos. Check your connection and try again.');
      });
  }, [userId, handleLostIdentity]);

  // Load questions (preserved from previous behavior)
  useEffect(() => {
    if (!userId) return;
    const questionsParam = searchParams.get('questions');
    if (questionsParam) {
      try { setQuestions(JSON.parse(questionsParam)); return; } catch { /* noop */ }
    }
    const prefetchParams = [RELATIONSHIP, FEMALE, MALE].map(n => `question_number=${n}`).join('&');
    fetch(`${getApiUrl(API_ENDPOINTS.QUESTIONS)}?${prefetchParams}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.results) setQuestions(d.results); })
      .catch(() => { /* noop */ });
  }, [userId, searchParams]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = ''; // allow re-selecting the same file later

    if (!userId) {
      // Used to be a silent `return`, so the picker just appeared to do nothing.
      handleLostIdentity();
      return;
    }

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
      if (isMissingUserError(err)) {
        handleLostIdentity();
        return;
      }
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
      if (isMissingUserError(err)) { handleLostIdentity(); return; }
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
      if (isMissingUserError(err)) { handleLostIdentity(); return; }
      setError(err instanceof Error ? err.message : 'Could not reorder photos');
    } finally {
      setBusy(false);
    }
  };

  const handleContinue = () => {
    if (!userId) {
      handleLostIdentity();
      return;
    }
    if (pictures.length === 0) {
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
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-white sm:block sm:h-auto sm:min-h-screen sm:overflow-visible">
      <header className="w-full shrink-0 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-2 sm:px-6 sm:py-4">
          <Image src="/assets/mmlogox.png" alt="Logo" width={40} height={40} className="h-8 w-8 sm:h-10 sm:w-10" />
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 sm:h-10 sm:w-10">
            <svg className="h-4 w-4 text-gray-600 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col px-3 py-2 sm:min-h-[calc(100vh-80px-120px)] sm:items-center sm:px-6 sm:pb-32 sm:pt-8">
        <div className="flex h-full min-h-0 w-full max-w-2xl flex-col sm:block sm:h-auto">
          <h1 className="mb-1 text-xl font-bold leading-tight text-gray-900 sm:mb-3 sm:text-3xl">
            Add up to {MAX_USER_PICTURES} profile photos
          </h1>
          <p className="mb-2 text-xs leading-snug text-gray-600 sm:mb-8 sm:text-xl">
            Your first photo is your main thumbnail. You can change the order later.
          </p>

          {error && (
            <div className="mb-2 rounded border border-red-400 bg-red-100 p-2 text-xs text-red-700 sm:mb-4 sm:p-3 sm:text-base">
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
          <div className="mb-2 min-h-0 flex-1 sm:mb-6 sm:block">
            {primary ? (
              <div className="relative h-full min-h-0 w-full overflow-hidden rounded-lg bg-gray-100 sm:h-[420px]">
                <Image src={primary.image_url} alt="Primary photo" fill sizes="(max-width: 768px) 100vw, 672px" priority className="object-cover" />
                <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-xs">
                  Primary
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(primary.id)}
                  disabled={busy}
                  className="absolute right-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white hover:bg-black disabled:opacity-50 sm:right-3 sm:top-3 sm:h-8 sm:w-8"
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
                className="flex h-full min-h-0 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-400 bg-gray-100 hover:bg-gray-50 sm:h-[420px]"
              >
                <Image src="/assets/kamm.png" alt="Camera icon" width={80} height={97} className="mb-2 h-auto w-12 sm:mb-6 sm:w-20" />
                <span className="rounded-md border border-gray-400 bg-white px-4 py-2 text-sm text-gray-900 hover:shadow-md sm:px-8 sm:py-3 sm:text-base">
                  Add your first photo
                </span>
              </label>
            )}
          </div>

          {/* Additional thumbnails grid (slots 2..5) */}
          <div className="grid shrink-0 grid-cols-4 gap-2 sm:gap-3">
            {Array.from({ length: MAX_USER_PICTURES - 1 }).map((_, i) => {
              const pic = thumbs[i];
              if (pic) {
                return (
                  <div key={pic.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                    <Image src={pic.image_url} alt={`Photo ${i + 2}`} fill sizes="(max-width: 768px) 25vw, 160px" className="object-cover" />
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

          <p className="mt-1 shrink-0 text-xs text-gray-500 sm:mt-3 sm:text-sm">
            {pictures.length} of {MAX_USER_PICTURES} photos added
          </p>
        </div>
      </main>

      <footer className="shrink-0 border-t border-gray-200 bg-white sm:fixed sm:bottom-0 sm:left-0 sm:right-0">
        <div className="w-full h-1 bg-gray-200">
          <div className="h-full bg-black" style={{ width: '15%' }}></div>
        </div>
        <div className="flex items-center justify-between px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-6 sm:py-4">
          <button
            onClick={() => router.back()}
            className="text-gray-900 font-medium hover:text-gray-500 transition-colors cursor-pointer"
          >
            Back
          </button>
          <button
            onClick={handleContinue}
            disabled={pictures.length === 0 || uploading || busy}
            className={`rounded-md px-6 py-2 text-sm font-medium transition-colors sm:px-8 sm:py-3 sm:text-base ${
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
