'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiService } from '@/services/api';
import { getStoredUserId } from '@/utils/userSession';

export const MANDATORY_CARDS = '/design/mandatory-cards';
export const ETHNICITY_STEPS = '/design/ethnicity-steps';
export const PREVIEW_STORAGE_PREFIX = 'mandatory_question_preview_';
export type PreviewRoute = typeof MANDATORY_CARDS | typeof ETHNICITY_STEPS;

type Span = { min: number; max: number };
type ThemAnswer = { value: number; openToAll: boolean; excluded: number[] };

export const EXTENT_VALUES = [1, 2, 3, 4, 5];
export const FULL_SPAN = { min: 1, max: 5 };

export function themAnswer({ min, max }: Span): ThemAnswer {
  const openToAll = min === 1 && max === 5;
  return {
    value: Math.ceil((min + max) / 2),
    openToAll,
    excluded: openToAll || min === max ? [] : EXTENT_VALUES.filter(value => value < min || value > max),
  };
}

interface EthnicityDraft {
  step: 0 | 1 | 2;
  me: Record<string, number>;
  them: Record<string, Span>;
  focused: { me?: string; them?: string };
  importance: number;
  note: string;
}

interface PreviewProgress {
  resume?: PreviewRoute;
  draft: EthnicityDraft;
  ethnicity?: { me: Record<string, number>; them: Record<string, ThemAnswer>; importance: number; note: string };
}

const initialProgress: PreviewProgress = {
  draft: { step: 0, me: {}, them: {}, focused: {}, importance: 3, note: '' },
};
const storageKey = (account: string) => `${PREVIEW_STORAGE_PREFIX}${account}`;
const storageFor = (account: string) => account ? localStorage : sessionStorage;

function readPreview(account: string): PreviewProgress {
  try {
    const saved = storageFor(account).getItem(storageKey(account));
    return saved ? JSON.parse(saved) : initialProgress;
  } catch {
    return initialProgress;
  }
}

export function takeQuestionPreviewResume(account: string): PreviewRoute | undefined {
  const saved = readPreview(account);
  if (saved.resume !== MANDATORY_CARDS && saved.resume !== ETHNICITY_STEPS) return;
  try {
    localStorage.setItem(storageKey(account), JSON.stringify({ ...saved, resume: undefined }));
  } catch {
    return;
  }
  return saved.resume;
}

export function useQuestionPreview(route: PreviewRoute) {
  const router = useRouter();
  const [account, setAccount] = useState<string | null>(null);
  const [progress, setProgress] = useState(initialProgress);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const id = getStoredUserId() ?? '';
    setProgress(readPreview(id));
    setAccount(id);
  }, []);

  const save = (next: PreviewProgress) => {
    if (account === null) return false;
    try {
      storageFor(account).setItem(storageKey(account), JSON.stringify(next));
      setProgress(next);
      setError('');
      return true;
    } catch {
      setError('Could not save your progress in this browser.');
      return false;
    }
  };

  const logout = async () => {
    if (!account || loggingOut || !save({ ...progress, resume: route })) return;
    setLoggingOut(true);
    try {
      await apiService.logOut();
      router.replace('/auth/login');
    } catch {
      save({ ...progress, resume: undefined });
      setError('Could not log out. Please try again.');
      setLoggingOut(false);
    }
  };

  return {
    ready: account !== null,
    progress,
    save,
    message: error && <p role="alert" className="mx-auto mt-4 text-center text-sm font-medium text-red-700">{error}</p>,
    headerAction: account ? (
      <button
        type="button"
        disabled={loggingOut}
        onClick={() => void logout()}
        className="shrink-0 rounded-full border border-purple-200 px-3 py-1.5 text-sm font-semibold text-[#672DB7] hover:bg-purple-50 disabled:opacity-50"
      >
        {loggingOut ? 'Logging out…' : 'Log out'}
      </button>
    ) : undefined,
  };
}
