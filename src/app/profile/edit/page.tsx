'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { uploadToAzureBlob } from '@/utils/azureUpload';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

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

export default function EditProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [initialFormState, setInitialFormState] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Photo handling
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

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
            credentials: 'include',
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
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          });
          if (!byIdRes.ok) throw new Error('Failed to fetch user');
          data = await byIdRes.json();
        }

        if (!data) throw new Error('Failed to load user');
        setUser(data);

        // Pre-fill the form
        const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
        // Convert date YYYY-MM-DD -> MM/DD/YYYY
        let dob = '';
        if (data.date_of_birth) {
          const [y, m, d] = data.date_of_birth.split('-');
          if (y && m && d) dob = `${m}/${d}/${y}`;
        }
        // Convert height cm -> X' YY"
        let heightText = '';
        if (data.height) {
          const totalInches = Math.round(Number(data.height) / 2.54);
          const feet = Math.floor(totalInches / 12);
          const inches = totalInches % 12;
          heightText = `${feet}' ${inches.toString().padStart(2, '0')}"`;
        }

        const prefilled: FormState = {
          fullName,
          username: data.username || '',
          tagline: '',
          dateOfBirth: dob,
          height: heightText,
          from: data.from_location || '',
          live: data.live || 'Austin',
          bio: data.bio || '',
        };
        setForm(prefilled);
        setInitialFormState(prefilled);
        setPreviewUrl(data.profile_photo || null);
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

  // Photo selection
  const onSelectPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) setPreviewUrl(URL.createObjectURL(file));
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
      // 1) Upload photo if selected
      if (selectedFile) {
        setUploadProgress(0);
        await uploadToAzureBlob(selectedFile, userId, (p) => setUploadProgress(p));
      }

      // 2) Update personal details
      const [m, d, y] = form.dateOfBirth.split('/');
      const payload = {
        user_id: userId,
        full_name: form.fullName,
        username: form.username,
        tagline: form.tagline,
        date_of_birth: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`,
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

      setSuccess('Profile updated successfully');
      // Update initial snapshot so Save stays disabled until further edits
      setInitialFormState(form);
      setSelectedFile(null);
      // Refresh user data
      try {
        const meRes = await fetch(getApiUrl(API_ENDPOINTS.USERS_ME), { credentials: 'include' });
        if (meRes.ok) {
          const refreshed = await meRes.json();
          setUser(refreshed);
        }
      } catch (_) {}

    } catch (e: any) {
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

  const canSave = (isDirty || !!selectedFile) && !saving;

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
        <button className="p-2" aria-label="Menu">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
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

              {/* Answers */}
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                <Image src="/assets/answered.png" alt="Answers" width={32} height={32} />
                <span className="text-gray-700">Answers</span>
              </div>

              {/* Matches */}
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                <Image src="/assets/heart.png" alt="Matches" width={32} height={32} />
                <span className="text-gray-700">Matches</span>
              </div>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-6 py-6">
          {/* Profile Photo Card centered */}
          <div className="flex justify-center mb-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm w-full max-w-xs">
              <h2 className="text-base font-semibold text-gray-900 mb-4 text-center">Profile Photo</h2>
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-40 h-40 rounded-full overflow-hidden ring-2 ring-white shadow-lg">
                    {previewUrl ? (
                      <Image src={previewUrl} alt="Profile" width={160} height={160} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-40 h-40 bg-gray-100 flex items-center justify-center text-4xl font-bold text-gray-500">
                        {user?.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>

                  {/* Edit pencil */}
                  <button
                    onClick={() => document.getElementById('photo-input')?.click()}
                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-black rounded-full flex items-center justify-center shadow-md hover:bg-gray-800 transition"
                    title="Change photo"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  {/* Progress overlay */}
                  {saving && selectedFile && (
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                      <span className="text-white font-semibold">{uploadProgress}%</span>
                    </div>
                  )}
                </div>
                <input id="photo-input" type="file" accept="image/*" className="hidden" onChange={onSelectPhoto} />
                <button
                  onClick={() => document.getElementById('photo-input')?.click()}
                  className="mt-4 px-4 py-2 rounded-md text-sm text-white shadow-sm hover:shadow transition"
                  style={{ backgroundColor: '#111111' }}
                >
                  Change photo
                </button>
                <p className="text-xs text-gray-500 mt-2">JPG or PNG, up to 10MB</p>
              </div>
            </div>
          </div>

          {/* Details Form Card centered */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Details</h2>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded">{success}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Full Name</label>
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={onChange}
                  placeholder="Enter your full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-transparent"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Username</label>
                <input
                  name="username"
                  value={form.username}
                  onChange={onChange}
                  placeholder="Enter username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-transparent"
                />
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

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Date of Birth</label>
                <input
                  name="dateOfBirth"
                  value={form.dateOfBirth}
                  onChange={onChange}
                  placeholder="MM/DD/YYYY"
                  maxLength={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-transparent"
                />
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
                <input
                  name="from"
                  value={form.from}
                  onChange={onChange}
                  placeholder="Where are you originally from?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-transparent"
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
