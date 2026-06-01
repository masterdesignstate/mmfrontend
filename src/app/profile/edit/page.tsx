'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { mutate } from 'swr';
import { getMediaDurationSeconds, uploadPromptMediaToAzure, uploadToAzureBlob } from '@/utils/azureUpload';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
import HamburgerMenu from '@/components/HamburgerMenu';
import PlacesHttpAutocomplete from '@/components/PlacesHttpAutocomplete';
import posthog from 'posthog-js';
import {
  apiService,
  MAX_PROMPT_MEDIA_SECONDS,
  MAX_PROFILE_PROMPTS,
  MAX_POLL_PROFILE_PROMPTS,
  MAX_VIDEO_PROFILE_PROMPTS,
  MAX_VOICE_PROFILE_PROMPTS,
  MAX_WRITTEN_PROFILE_PROMPTS,
  MAX_USER_PICTURES,
  MAX_WRITTEN_PROMPT_CHARS,
  type ProfilePromptPayload,
  type ProfilePromptType,
  type PromptTemplate,
  type UserPicture,
  type UserProfilePrompt,
} from '@/services/api';
import ProfilePromptCards from '@/components/ProfilePromptCards';

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

type PromptFormItem = {
  template_id: string;
  prompt_type: ProfilePromptType;
  written_answer: string;
  media_url: string;
  media_duration_seconds: number | null;
  poll_options: string[];
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

const emptyPromptItem = (promptType: ProfilePromptType = 'written'): PromptFormItem => ({
  template_id: '',
  prompt_type: promptType,
  written_answer: '',
  media_url: '',
  media_duration_seconds: null,
  poll_options: promptType === 'poll' ? ['', '', ''] : [],
});

const promptToFormItem = (prompt: UserProfilePrompt): PromptFormItem => ({
  template_id: prompt.template?.id || '',
  prompt_type: prompt.prompt_type,
  written_answer: prompt.written_answer || '',
  media_url: prompt.media_url || '',
  media_duration_seconds: prompt.media_duration_seconds === null || prompt.media_duration_seconds === undefined
    ? null
    : Number(prompt.media_duration_seconds),
  poll_options: prompt.poll_options?.length ? [...prompt.poll_options] : ['', '', ''],
});

const purple = '#672DB7';

const promptCategoryFilters = [
  { id: 'about', label: 'About me', categories: ['about', 'lifestyle'] },
  { id: 'personal', label: 'Getting personal', categories: ['deeper'] },
  { id: 'chat', label: "Let's chat about", categories: ['opinion'] },
  { id: 'selfcare', label: 'Self-care', categories: ['lifestyle'] },
  { id: 'dating', label: 'Date vibes', categories: ['dating'] },
  { id: 'values', label: 'My type', categories: ['values'] },
  { id: 'story', label: 'Storytime', categories: ['fun', 'interactive'] },
  { id: 'voice', label: 'Voice-first', categories: [] as string[] },
  { id: 'video', label: 'Video-first', categories: [] as string[] },
];

const trimPromptText = (text: string): string => text.replace(/\s*(\.\.\.)$/, '');

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
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [promptItems, setPromptItems] = useState<PromptFormItem[]>([]);
  const [initialPromptItems, setInitialPromptItems] = useState<PromptFormItem[]>([]);
  const [savedPrompts, setSavedPrompts] = useState<UserProfilePrompt[]>([]);
  const [promptSaving, setPromptSaving] = useState(false);
  const [promptError, setPromptError] = useState('');
  const [promptSuccess, setPromptSuccess] = useState('');
  const [promptPicker, setPromptPicker] = useState<{ index: number } | null>(null);
  const [promptPickerCategory, setPromptPickerCategory] = useState('all');
  const [mediaBusyKey, setMediaBusyKey] = useState<string | null>(null);
  const [mediaProgress, setMediaProgress] = useState<Record<string, number>>({});
  const [recording, setRecording] = useState<{
    key: string;
    kind: 'voice' | 'video';
    recorder: MediaRecorder;
    stream: MediaStream;
    startedAt: number;
  } | null>(null);

  const userId = useMemo(() => (typeof window !== 'undefined' ? localStorage.getItem('user_id') : null), []);

  useEffect(() => {
    let cancelled = false;
    apiService.getPromptTemplates()
      .then((templates) => {
        if (!cancelled) setPromptTemplates(templates);
      })
      .catch((promptLoadError) => {
        console.error('Failed to load prompt templates:', promptLoadError);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        try {
          const prompts = await apiService.getUserProfilePrompts(data.id, { viewerId: data.id, includeVotes: true });
          setSavedPrompts(prompts);
          const promptForm = prompts.sort((a, b) => a.order - b.order).map(promptToFormItem);
          setPromptItems(promptForm);
          setInitialPromptItems(promptForm);
        } catch (promptLoadError) {
          console.error('Failed to load prompts:', promptLoadError);
          setPromptError('Could not load prompts.');
        }
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

  const updatePromptItem = (index: number, patch: Partial<PromptFormItem>) => {
    setPromptItems(prev => prev.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...patch } : item
    )));
  };

  const removePromptItem = (index: number) => {
    setPromptItems(prev => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const promptTypeCounts = useMemo(() => {
    return promptItems.reduce<Record<ProfilePromptType, number>>((counts, item) => {
      counts[item.prompt_type] += 1;
      return counts;
    }, { written: 0, voice: 0, video: 0, poll: 0 });
  }, [promptItems]);

  const promptTemplateById = useMemo(() => {
    return new Map(promptTemplates.map(template => [template.id, template]));
  }, [promptTemplates]);

  const selectedPromptTemplateIds = useMemo(() => {
    return new Set(promptItems.map(item => item.template_id).filter(Boolean));
  }, [promptItems]);

  const canAddPromptType = (promptType: ProfilePromptType) => {
    if (promptItems.length >= MAX_PROFILE_PROMPTS) return false;
    if (promptType === 'written') return promptTypeCounts.written < MAX_WRITTEN_PROFILE_PROMPTS;
    if (promptType === 'voice') return promptTypeCounts.voice < MAX_VOICE_PROFILE_PROMPTS;
    if (promptType === 'video') return promptTypeCounts.video < MAX_VIDEO_PROFILE_PROMPTS;
    return promptTypeCounts.poll < MAX_POLL_PROFILE_PROMPTS;
  };

  const addPromptItem = (promptType: ProfilePromptType) => {
    if (!canAddPromptType(promptType)) return;
    setPromptItems(prev => [...prev, emptyPromptItem(promptType)]);
  };

  const validatePromptItems = (items: PromptFormItem[]): string | null => {
    if (items.length > MAX_PROFILE_PROMPTS) return 'You can add up to 6 prompts.';

    const typeCounts: Record<string, number> = {};
    for (const item of items) {
      if (!item.template_id) return 'Choose a prompt for each slot.';
      typeCounts[item.prompt_type] = (typeCounts[item.prompt_type] || 0) + 1;
      if (item.prompt_type === 'written' && typeCounts[item.prompt_type] > MAX_WRITTEN_PROFILE_PROMPTS) {
        return 'Use at most 3 written prompts.';
      }
      if (['voice', 'video', 'poll'].includes(item.prompt_type) && typeCounts[item.prompt_type] > 1) {
        return 'Use at most one voice prompt, one video prompt, and one poll prompt.';
      }
      if (item.prompt_type === 'written') {
        if (!item.written_answer.trim()) return 'Written prompts need an answer.';
        if (item.written_answer.length > MAX_WRITTEN_PROMPT_CHARS) return 'Written answers must be 150 characters or fewer.';
      } else if (item.prompt_type === 'voice' || item.prompt_type === 'video') {
        if (!item.media_url || !item.media_duration_seconds) return 'Voice and video prompts need media.';
        if (item.media_duration_seconds > MAX_PROMPT_MEDIA_SECONDS) return 'Voice and video prompts must be 30 seconds or shorter.';
      } else if (item.prompt_type === 'poll') {
        if (item.poll_options.length !== 3 || item.poll_options.some(option => !option.trim())) {
          return 'Poll prompts need exactly 3 options.';
        }
      }
    }

    const selectedTemplates = items.map(item => item.template_id).filter(Boolean);
    if (selectedTemplates.length !== new Set(selectedTemplates).size) {
      return 'Choose a different prompt for each item.';
    }

    return null;
  };

  const promptValidationError = validatePromptItems(promptItems);
  const promptsDirty = useMemo(() => {
    try {
      return JSON.stringify(promptItems) !== JSON.stringify(initialPromptItems);
    } catch {
      return true;
    }
  }, [promptItems, initialPromptItems]);
  const canSavePrompts = promptsDirty && !promptSaving && !promptValidationError;

  const openPromptPicker = (index: number) => {
    setPromptPicker({ index });
    setPromptPickerCategory('all');
  };

  const filteredPromptTemplates = useMemo(() => {
    const activeFilter = promptCategoryFilters.find(filter => filter.id === promptPickerCategory);
    if (!activeFilter || activeFilter.id === 'all' || activeFilter.categories.length === 0) {
      return promptTemplates;
    }
    return promptTemplates.filter(template => activeFilter.categories.includes(template.category));
  }, [promptPickerCategory, promptTemplates]);

  const savePrompts = async () => {
    if (!userId) return;
    setPromptError('');
    setPromptSuccess('');
    const validationError = validatePromptItems(promptItems);
    if (validationError) {
      setPromptError(validationError);
      return;
    }

    const payload: ProfilePromptPayload[] = promptItems.map(item => ({
      template_id: item.template_id,
      prompt_type: item.prompt_type,
      written_answer: item.prompt_type === 'written' ? item.written_answer.trim() : '',
      media_url: ['voice', 'video'].includes(item.prompt_type) ? item.media_url : '',
      media_duration_seconds: ['voice', 'video'].includes(item.prompt_type) ? item.media_duration_seconds : null,
      poll_options: item.prompt_type === 'poll' ? item.poll_options.map(option => option.trim()) : [],
    }));

    setPromptSaving(true);
    try {
      const prompts = await apiService.replaceUserProfilePrompts(userId, payload);
      const promptForm = prompts.sort((a, b) => a.order - b.order).map(promptToFormItem);
      setSavedPrompts(prompts);
      setPromptItems(promptForm);
      setInitialPromptItems(promptForm);
      setPromptSuccess('Prompts saved successfully');
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(`profile_${userId}`);
        sessionStorage.removeItem(`profile_${userId}_timestamp`);
      }
      mutate(`${getApiUrl(API_ENDPOINTS.USERS)}${userId}/`);
    } catch (error) {
      setPromptError(error instanceof Error ? error.message : 'Failed to save prompts');
    } finally {
      setPromptSaving(false);
    }
  };

  const uploadPromptMedia = async (index: number, file: File | undefined, kind: 'voice' | 'video') => {
    if (!file || !userId) return;
    const busyKey = `${index}-${kind}`;
    setMediaBusyKey(busyKey);
    setPromptError('');
    try {
      const duration = await getMediaDurationSeconds(file);
      if (duration > MAX_PROMPT_MEDIA_SECONDS) {
        throw new Error('Prompt media must be 30 seconds or shorter');
      }
      const url = await uploadPromptMediaToAzure(file, userId, kind, (progress) => {
        setMediaProgress(prev => ({ ...prev, [busyKey]: progress }));
      });
      updatePromptItem(index, {
        prompt_type: kind,
        media_url: url,
        media_duration_seconds: Math.round(duration * 100) / 100,
        written_answer: '',
        poll_options: [],
      });
    } catch (error) {
      setPromptError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setMediaBusyKey(null);
      setMediaProgress(prev => ({ ...prev, [busyKey]: 0 }));
    }
  };

  const startRecording = async (index: number, kind: 'voice' | 'video') => {
    if (!userId || recording) return;
    setPromptError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === 'voice' ? { audio: true } : { audio: true, video: true }
      );
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || (kind === 'voice' ? 'audio/webm' : 'video/webm');
        const file = new File(chunks, `${kind}-prompt-${Date.now()}.webm`, { type: mimeType });
        stream.getTracks().forEach(track => track.stop());
        setRecording(null);
        await uploadPromptMedia(index, file, kind);
      };
      recorder.start();
      const key = `${index}-${kind}`;
      setRecording({ key, kind, recorder, stream, startedAt: Date.now() });
      window.setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, MAX_PROMPT_MEDIA_SECONDS * 1000);
    } catch (error) {
      setPromptError(error instanceof Error ? error.message : 'Could not start recording');
    }
  };

  const stopRecording = () => {
    if (recording?.recorder.state === 'recording') {
      recording.recorder.stop();
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

  useEffect(() => {
    if (!promptSuccess) return;
    const t = setTimeout(() => setPromptSuccess(''), 2500);
    return () => clearTimeout(t);
  }, [promptSuccess]);

  const isDirty = useMemo(() => {
    if (!initialFormState) return false;
    try {
      return JSON.stringify(form) !== JSON.stringify(initialFormState);
    } catch {
      return true;
    }
  }, [form, initialFormState]);

  const canSave = isDirty && !saving;

  const renderPromptEditorCard = (item: PromptFormItem, index: number) => {
    const selectedTemplate = promptTemplateById.get(item.template_id);
    const mediaKind = item.prompt_type === 'video' ? 'video' : 'voice';
    const busyKey = `${index}-${mediaKind}`;
    const isMediaPrompt = item.prompt_type === 'voice' || item.prompt_type === 'video';
    const isRecordingThis = recording?.key === busyKey;

    return (
      <div key={`prompt-editor-${index}`} className="rounded-xl ring-1 ring-gray-200 p-4 bg-white">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openPromptPicker(index)}
            className="flex min-h-11 flex-1 items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-900 hover:border-[#672DB7] hover:bg-purple-50"
          >
            <span>{selectedTemplate ? trimPromptText(selectedTemplate.text) : 'Select prompt'}</span>
            <svg className="h-4 w-4 shrink-0 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2.1} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L8.582 18.07a4.5 4.5 0 01-1.897 1.13L3 20l.8-3.685a4.5 4.5 0 011.13-1.897L16.862 4.487z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.875 4.5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => removePromptItem(index)}
            className="shrink-0 rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Remove prompt"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.25} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {item.prompt_type === 'written' && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-900">Answer</label>
              <span className="text-xs text-gray-500">{item.written_answer.length}/{MAX_WRITTEN_PROMPT_CHARS}</span>
            </div>
            <textarea
              value={item.written_answer}
              onChange={(event) => updatePromptItem(index, { written_answer: event.target.value.slice(0, MAX_WRITTEN_PROMPT_CHARS) })}
              maxLength={MAX_WRITTEN_PROMPT_CHARS}
              rows={3}
              placeholder="Write a short answer"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-transparent resize-none"
            />
          </div>
        )}

        {isMediaPrompt && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="inline-flex justify-center items-center rounded-full border border-gray-300 px-4 py-2 text-sm font-medium cursor-pointer hover:bg-gray-50">
                Upload {item.prompt_type}
                <input
                  type="file"
                  className="hidden"
                  accept={item.prompt_type === 'voice' ? 'audio/*' : 'video/*'}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    uploadPromptMedia(index, file, item.prompt_type as 'voice' | 'video');
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => isRecordingThis ? stopRecording() : startRecording(index, item.prompt_type as 'voice' | 'video')}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  isRecordingThis ? 'bg-red-600 text-white' : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                {isRecordingThis ? 'Stop recording' : `Record ${item.prompt_type}`}
              </button>
            </div>
            {mediaBusyKey === busyKey && (
              <p className="text-xs text-gray-500">Uploading... {mediaProgress[busyKey] || 0}%</p>
            )}
            {item.media_url && (
              <div className="rounded-xl bg-gray-50 p-3">
                {item.prompt_type === 'voice' ? (
                  <audio controls src={item.media_url} className="w-full" />
                ) : (
                  <video
                    controls
                    src={item.media_url}
                    className="max-h-[320px] w-auto max-w-full mx-auto rounded-lg bg-black object-contain sm:max-h-[360px]"
                  />
                )}
                <p className="text-xs text-gray-500 mt-2">{item.media_duration_seconds?.toFixed(1)} seconds</p>
              </div>
            )}
          </div>
        )}

        {item.prompt_type === 'poll' && (
          <div className="mt-3 space-y-2">
            <label className="block text-sm font-medium text-gray-900">Poll options</label>
            {[0, 1, 2].map((optionIndex) => (
              <input
                key={`poll-option-${index}-${optionIndex}`}
                value={item.poll_options[optionIndex] || ''}
                onChange={(event) => {
                  const nextOptions = [...item.poll_options];
                  nextOptions[optionIndex] = event.target.value.slice(0, 80);
                  updatePromptItem(index, { poll_options: nextOptions });
                }}
                maxLength={80}
                placeholder={`Option ${optionIndex + 1}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-transparent"
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderPromptSection = (
    promptType: ProfilePromptType,
    title: string
  ) => {
    const items = promptItems
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.prompt_type === promptType);
    const maxCount = promptType === 'written' ? MAX_WRITTEN_PROFILE_PROMPTS : 1;

    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-gray-900">
            {title}
            <span className="ml-2 text-xs font-medium text-gray-500">{items.length}/{maxCount}</span>
          </h3>
          <button
            type="button"
            onClick={() => addPromptItem(promptType)}
            disabled={!canAddPromptType(promptType)}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
        <div className="space-y-3">
          {items.map(({ item, index }) => renderPromptEditorCard(item, index))}
        </div>
      </div>
    );
  };

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
      {promptPicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[86vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button
                type="button"
                onClick={() => setPromptPickerCategory('all')}
                className={`text-sm font-semibold ${promptPickerCategory === 'all' ? 'text-[#672DB7]' : 'text-gray-500'}`}
              >
                View all
              </button>
              <div className="text-lg font-semibold text-gray-900">Prompts</div>
              <button
                type="button"
                onClick={() => setPromptPicker(null)}
                className="rounded-full p-2 text-gray-900 hover:bg-gray-100"
                aria-label="Close prompt picker"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="border-b border-gray-100 px-4 py-4">
              <div className="flex gap-2 overflow-x-auto py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {promptCategoryFilters.map((filter) => {
                  const active = filter.id === promptPickerCategory;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setPromptPickerCategory(filter.id)}
                      className={`flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-medium leading-none transition ${
                        active
                          ? 'bg-[#672DB7] text-white'
                          : 'bg-white text-[#672DB7] ring-1 ring-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredPromptTemplates.map((template) => {
                const isSelected = promptItems[promptPicker.index]?.template_id === template.id;
                const isUsedElsewhere = selectedPromptTemplateIds.has(template.id) && !isSelected;
                return (
                  <button
                    key={template.id}
                    type="button"
                    disabled={isUsedElsewhere}
                    onClick={() => {
                      updatePromptItem(promptPicker.index, { template_id: template.id });
                      setPromptPicker(null);
                    }}
                    className={`flex w-full items-center justify-between border-b border-gray-100 px-5 py-4 text-left text-base font-medium ${
                      isUsedElsewhere ? 'text-gray-400' : 'text-gray-950 hover:bg-gray-50'
                    }`}
                  >
                    <span>{trimPromptText(template.text)}</span>
                    {(isSelected || isUsedElsewhere) && (
                      <svg className="ml-4 h-5 w-5 shrink-0 text-gray-900" fill="none" stroke="currentColor" strokeWidth={2.75} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
              {filteredPromptTemplates.length === 0 && (
                <div className="px-5 py-12 text-center text-sm text-gray-500">
                  No prompts in this category yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

          <div className="max-w-4xl mx-auto mb-6 space-y-4">
            {promptError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{promptError}</div>}
            {promptSuccess && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">{promptSuccess}</div>}

            {renderPromptSection('written', 'Written Prompts')}
            {renderPromptSection('voice', 'Voice Prompt')}
            {renderPromptSection('video', 'Video Prompt')}
            {renderPromptSection('poll', 'Prompt Poll')}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={savePrompts}
                disabled={!canSavePrompts}
                className="px-5 py-2 rounded-md text-white font-medium shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: purple }}
              >
                {promptSaving ? 'Saving prompts...' : 'Save prompts'}
              </button>
            </div>

            {savedPrompts.some(prompt => prompt.prompt_type === 'poll' && (prompt.poll_votes?.length ?? 0) > 0) && userId && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Prompt Poll Responses</h3>
                <ProfilePromptCards prompts={savedPrompts} ownerId={userId} viewerId={userId} isOwner />
              </div>
            )}
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
