'use client';

import { useState, useEffect } from 'react';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

interface UserGateStatus {
  isBanned: boolean;
  isOnboardingComplete: boolean;
  isLoading: boolean;
  userId: string | null;
}

const CACHE_KEY = 'mandatory_questions_complete';

export function useUserGateStatus(): UserGateStatus {
  const [isBanned, setIsBanned] = useState(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(CACHE_KEY) === 'true';
  });
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id');
    if (!storedUserId) {
      setIsLoading(false);
      setUserId(null);
      return;
    }

    setUserId(storedUserId);

    // Use cached onboarding value for immediate non-blocking render
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached === 'true') {
      setIsOnboardingComplete(true);
    }

    // Single fetch for both checks
    fetch(`${getApiUrl(API_ENDPOINTS.USERS)}${storedUserId}/`, {
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch user');
        return res.json();
      })
      .then((user) => {
        setIsBanned(user.is_banned ?? false);
        const complete = user.mandatory_questions_complete ?? false;
        setIsOnboardingComplete(complete);
        localStorage.setItem(CACHE_KEY, String(complete));
      })
      .catch((err) => {
        console.error('Failed to check user gate status:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return { isBanned, isOnboardingComplete, isLoading, userId };
}
