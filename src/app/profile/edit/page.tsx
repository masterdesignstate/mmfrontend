'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { mutate } from 'swr';
import { uploadToAzureBlob } from '@/utils/azureUpload';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
import HamburgerMenu from '@/components/HamburgerMenu';
import PlacesHttpAutocomplete from '@/components/PlacesHttpAutocomplete';
import posthog from 'posthog-js';
import { apiService, MAX_USER_PICTURES, type UserPicture } from '@/services/api';

type User = {
  id: string;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  profile_photo?: string | null;
  age?: number | null;
  date_of_birth?: string | null; // YYYY-MM-DD
  height?: number | null; // cm
  from_location?: string | null;
  live?: string | null;
  tagline?: string | null;
  bio?: string | null;
};

type FormState = {
  fullName: string;
  username: string;
  tagline: string; // kept for UI parity
  dateOfBirth: string; // MM/DD/YYYY
  height: string; // e.g. 5' 11"
  from: string;
  live: string;
  bio: string;
};

const initialForm: FormState = {
  fullName: '',
  username: '',
  tagline: '',
  dateOfBirth: '',
  height: '',
  from: '',
  live: 'Austin',
  bio: '',
};

const purple = '#672DB7';

const buildFormState = (data: User): FormState => {
  const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim();

  let dob = '';
  if (data.date_of_birth) {
    const [y, m, d] = data.date_of_birth.split('-');
    if (y && m && d) dob = `${m}/${d}/${y}`;
  }

  let heightText = '';
  if (data.height) {
    const totalInches = Math.round(Number(data.height) / 2.54);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    heightText = `${feet}' ${inches.toString().padStart(2, '0')}"`;
  }

  return {
    fullName,
    username: data.username || '',
    tagline: data.tagline || '',
    dateOfBirth: dob,
    height: heightText,
    from: data.from_location || '',
    live: data.live || 'Austin',
    bio: data.bio || '',
  };
};

export default function EditProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [initialFormState, setInitialFormState] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Photo gallery
  const [pictures, setPictures] = useState<UserPicture[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string>('');
  const [photoUploadProgress, setPhotoUploadProgress] = useState<number>(0);

  const userId = useMemo(() => (typeof window !== 'undefined' ? localStorage.getItem('user_id') : null), []);

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      setError('');
      try {
        let data: User | null = null;

        // Try /users/me first (session)
        try {
          const meRes = await fetch(getApiUrl(API_ENDPOINTS.USERS_ME), {
  
            headers: { 'Content-Type': 'application/json' },
          });
          if (meRes.ok) {
            data = await meRes.json();
          } else {
            throw new Error('Me endpoint not available');
          }
        } catch (_) {
          if (!userId) throw new Error('User not found in local storage');
          const byIdRes = await fetch(`${getApiUrl(API_ENDPOINTS.USERS)}${userId}/`, {
      
            headers: { 'Content-Type': 'application/json' },
          });
          if (!byIdRes.ok) throw new Error('Failed to fetch user');
          data = await byIdRes.json();
        }

        if (!data) throw new Error('Failed to load user');
        setUser(data);

        const prefilled = buildFormState(data);
        setForm(prefilled);
        setInitialFormState(prefilled);
        // Load picture gallery for this user
        try {
          const pics = await apiService.getUserPictures(data.id);
          setPictures(pics);
        } catch { /* noop */ }
      } catch (e: any) {
        setError(e?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [userId]);

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target as { name: keyof FormState; value: string };

    if (name === 'height') {
      const numeric = value.replace(/\D/g, '').slice(0, 3);
      if (numeric.length === 3) {
        const f = parseInt(numeric[0]);
        const i = parseInt(numeric.slice(1));
        if (f >= 4 && f <= 7 && i >= 0 && i <= 11) {
          setForm((p) => ({ ...p, height: `${f}' ${i.toString().padStart(2, '0')}"` }));
          return;
        }
      }
      setForm((p) => ({ ...p, height: numeric }));
      return;
    }

    if (name === 'dateOfBirth') {
      const numeric = value.replace(/\D/g, '').slice(0, 8);
      let formatted = '';
      if (numeric.length >= 1) formatted = numeric.slice(0, 2);
      if (numeric.length >= 3) formatted += '/' + numeric.slice(2, 4);
      if (numeric.length >= 5) formatted += '/' + numeric.slice(4, 8);
      setForm((p) => ({ ...p, dateOfBirth: formatted }));
      return;
    }

    setForm((p) => ({ ...p, [name]: value } as FormState));
  };

  // Photo gallery handlers
  const onAddPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !userId) return;
    if (pictures.length >= MAX_USER_PICTURES) {
      setPhotoError(`You can have up to ${MAX_USER_PICTURES} photos.`);
      return;
    }
    setPhotoError('');
    setPhotoUploading(true);
    setPhotoUploadProgress(0);
    try {
      const url = await uploadToAzureBlob(file, userId, (p) => setPhotoUploadProgress(p));
      const created = await apiService.addUserPicture(userId, url);
      setPictures((prev) => [...prev, created].sort((a, b) => a.order - b.order));
      posthog.capture('profile_photo_uploaded', { user_id: userId });
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setPhotoUploading(false);
      setPhotoUploadProgress(0);
    }
  };

  const onRemovePhoto = async (pictureId: string) => {
    if (!userId || photoBusy) return;
    setPhotoBusy(true);
    setPhotoError('');
    try {
      await apiService.deleteUserPicture(userId, pictureId);
      const refreshed = await apiService.getUserPictures(userId);
      setPictures(refreshed);
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : 'Could not remove photo');
    } finally {
      setPhotoBusy(false);
    }
  };

  const onMakePrimary = async (pictureId: string) => {
    if (!userId || photoBusy) return;
    setPhotoBusy(true);
    setPhotoError('');
    try {
      const newOrder = [pictureId, ...pictures.filter((p) => p.id !== pictureId).map((p) => p.id)];
      const updated = await apiService.reorderUserPictures(userId, newOrder);
      setPictures(updated);
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : 'Could not reorder');
    } finally {
      setPhotoBusy(false);
    }
  };

  const validate = (): string | null => {
    if (!form.fullName || !form.username || !form.dateOfBirth || !form.from || !form.live) {
      return 'Please fill in all required fields';
    }
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(form.dateOfBirth)) return 'Date must be in MM/DD/YYYY format';
    const [mm, dd, yyyy] = form.dateOfBirth.split('/').map(Number);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > new Date().getFullYear()) {
      return 'Please enter a valid date';
    }
    return null;
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    if (!userId) {
      setError('User not found. Please log in again.');
      return;
    }

    setSaving(true);
    try {
      // Photo gallery is managed independently via add/remove/reorder above.
      // Update personal details.
      // full_name, username, date_of_birth are locked after onboarding and are
      // intentionally omitted from the payload; the backend also ignores them.
      const payload = {
        user_id: userId,
        tagline: form.tagline,
        height: form.height,
        from: form.from,
        live: form.live,
        bio: form.bio,
      };

      const res = await fetch(getApiUrl(API_ENDPOINTS.PERSONAL_DETAILS), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save profile');
      }

      posthog.capture('profile_updated', { user_id: userId });
      setSuccess('Profile updated successfully');

      const profileUrl = `${getApiUrl(API_ENDPOINTS.USERS)}${userId}/`;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(`profile_${userId}`);
        sessionStorage.removeItem(`profile_${userId}_timestamp`);
      }

      try {
        const refreshedRes = await fetch(profileUrl, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (refreshedRes.ok) {
          const refreshed = await refreshedRes.json();
          const refreshedForm = buildFormState(refreshed);
          setUser(refreshed);
          setForm(refreshedForm);
          setInitialFormState(refreshedForm);
          mutate(profileUrl, refreshed, false);
        } else {
          setInitialFormState(form);
        }
      } catch (_) {
        setInitialFormState(form);
      }

    } catch (e: any) {
      posthog.captureException(e);
      setError(e?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Auto-dismiss success message
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 2500);
    return () => clearTimeout(t);
  }, [success]);

  const isDirty = useMemo(() => {
    if (!initialFormState) return false;
    try {
      return JSON.stringify(form) !== JSON.stringify(initialFormState);
    } catch {
      return true;
    }
  }, [form, initialFormState]);

  const canSave = isDirty && !saving;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: purple }}></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header - match profile header (no title text) */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center">
          <Image src="/assets/mmlogox.png" alt="Logo" width={32} height={32} className="mr-2" />
        </div>
        <HamburgerMenu />
      </div>

      <div className="flex">
        {/* Sidebar (desktop) */}
        <div className="hidden lg:block w-80 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Profile</h1>

            <nav className="space-y-4">
              {/* About me */}
              <div
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push('/profile')}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  {user?.profile_photo ? (
                    <Image src={user.profile_photo} alt={user.username} width={32} height={32} className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-b from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold">
                      {user?.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-gray-700">About me</span>
              </div>

              {/* Edit Profile - active */}
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                <Image src="/assets/edit-profile.png" alt="Edit Profile" width={32} height={32} />
                <span className="text-gray-900 font-medium">Edit Profile</span>
              </div>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-6 py-6">
          {/* Profile Photos Gallery (up to MAX_USER_PICTURES) */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm max-w-4xl mx-auto mb-6">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Profile Photos</h2>
              <span className="text-xs text-gray-500">{pictures.length} of {MAX_USER_PICTURES}</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Your first photo is your main thumbnail across the app. Drag-free reorder coming soon — for now, click <strong>Make primary</strong> on any photo to move it to the front.
            </p>
            {photoError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{photoError}</div>
            )}
            <input id="photo-input" type="file" accept="image/*" className="hidden" onChange={onAddPhoto} disabled={photoUploading || photoBusy || pictures.length >= MAX_USER_PICTURES} />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Array.from({ length: MAX_USER_PICTURES }).map((_, i) => {
                const pic = pictures[i];
                if (pic) {
                  const isPrimary = i === 0;
                  return (
                    <div key={pic.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 ring-1 ring-gray-200">
                      <Image src={pic.image_url} alt={`Photo ${i + 1}`} fill className="object-cover" />
                      {isPrimary && (
                        <div className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Primary
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemovePhoto(pic.id)}
                        disabled={photoBusy}
                        className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/70 hover:bg-black text-white rounded-full flex items-center justify-center cursor-pointer disabled:opacity-50"
                        title="Remove"
                        aria-label="Remove photo"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      {!isPrimary && (
                        <button
                          type="button"
                          onClick={() => onMakePrimary(pic.id)}
                          disabled={photoBusy}
                          className="absolute bottom-0 left-0 right-0 bg-black/70 hover:bg-black text-white text-[11px] font-semibold py-1.5 cursor-pointer disabled:opacity-50"
                        >
                          Make primary
                        </button>
                      )}
                    </div>
                  );
                }
                const isNextSlot = i === pictures.length;
                const interactive = isNextSlot && pictures.length < MAX_USER_PICTURES && !photoUploading && !photoBusy;
                return (
                  <label
                    key={`empty-${i}`}
                    htmlFor={interactive ? 'photo-input' : undefined}
                    className={`relative aspect-square rounded-lg border-2 border-dashed flex items-center justify-center ${
                      interactive
                        ? 'border-gray-400 bg-gray-50 cursor-pointer hover:bg-gray-100'
                        : 'border-gray-200 bg-gray-50/50 cursor-not-allowed'
                    }`}
                  >
                    {isNextSlot && photoUploading ? (
                      <span className="text-xs font-semibold text-gray-700">{photoUploadProgress}%</span>
                    ) : (
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-3">JPG or PNG, up to 10MB each.</p>
          </div>

          {/* Details Form Card centered */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Details</h2>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded">{success}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name (locked) */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Full Name</label>
                <input
                  name="fullName"
                  value={form.fullName}
                  readOnly
                  placeholder="Enter your full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-500">This cannot be changed.</p>
              </div>

              {/* Username (locked) */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Username</label>
                <input
                  name="username"
                  value={form.username}
                  readOnly
                  placeholder="Enter username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-500">This cannot be changed.</p>
              </div>

              {/* Tagline */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-900">Tag line</label>
                  <span className="text-xs text-gray-500">{form.tagline.length}/40</span>
                </div>
                <input
                  name="tagline"
                  value={form.tagline}
                  onChange={onChange}
                  maxLength={40}
                  placeholder="Write a short tagline"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-transparent"
                />
              </div>

              {/* Date of Birth (locked) */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Date of Birth</label>
                <input
                  name="dateOfBirth"
                  value={form.dateOfBirth}
                  readOnly
                  placeholder="MM/DD/YYYY"
                  maxLength={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-500">This cannot be changed.</p>
              </div>

              {/* Height */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Height (Optional)</label>
                <input
                  name="height"
                  value={form.height}
                  onChange={onChange}
                  placeholder="Enter 511 for 5' 11&quot;"
                  maxLength={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-transparent"
                />
              </div>

              {/* From */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">From</label>
                <PlacesHttpAutocomplete
                  value={form.from}
                  onChange={(value) => setForm((prev) => ({ ...prev, from: value }))}
                  placeholder="Where are you originally from?"
                  className="focus:ring-[#672DB7]"
                  disabled={saving}
                  apiKey={process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}
                />
              </div>

              {/* Live */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Live</label>
                <select
                  name="live"
                  value={form.live}
                  onChange={onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-transparent bg-white"
                >
                  <option value="Austin">Austin</option>
                  <option value="Cedar Park">Cedar Park</option>
                  <option value="Georgetown">Georgetown</option>
                  <option value="Hutto">Hutto</option>
                  <option value="Kyle">Kyle</option>
                  <option value="Leander">Leander</option>
                  <option value="Manor">Manor</option>
                  <option value="Pflugerville">Pflugerville</option>
                  <option value="Round Rock">Round Rock</option>
                  <option value="San Marcos">San Marcos</option>
                </select>
              </div>

              {/* Bio */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-900">Bio</label>
                  <span className="text-xs text-gray-500">{form.bio.length}/160</span>
                </div>
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={onChange}
                  maxLength={160}
                  rows={3}
                  placeholder="Tell us about yourself..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* Footer action bar handles actions */}
          </div>

          {/* Action buttons below cards */}
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 mt-6">
            <button
              onClick={() => router.push('/profile')}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className={`px-5 py-2 rounded-md text-white font-medium shadow-sm transition ${
                canSave ? 'hover:shadow' : 'opacity-60 cursor-not-allowed'
              }`}
              style={{ backgroundColor: purple }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
