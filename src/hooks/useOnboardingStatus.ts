'use client';

import { useState, useEffect } from 'react';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

interface OnboardingStatus {
  isComplete: boolean;
  isLoading: boolean;
  userId: string | null;
}

const CACHE_KEY = 'mandatory_questions_complete';

export function useOnboardingStatus(): OnboardingStatus {
  const [isComplete, setIsComplete] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(CACHE_KEY) === 'true';
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id');
    if (!storedUserId) {
      setIsLoading(false);
      setUserId(null);
      return;
    }

    setUserId(storedUserId);

    // Use cached value for immediate render
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached === 'true') {
      setIsComplete(true);
      setIsLoading(false);
    }

    // Background refresh from backend
    fetch(`${getApiUrl(API_ENDPOINTS.USERS)}${storedUserId}/`, {
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch user');
        return res.json();
      })
      .then((user) => {
        const complete = user.mandatory_questions_complete ?? false;
        setIsComplete(complete);
        localStorage.setItem(CACHE_KEY, String(complete));
      })
      .catch((err) => {
        console.error('Failed to check onboarding status:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return { isComplete, isLoading, userId };
}
