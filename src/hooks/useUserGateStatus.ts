'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

interface UserGateStatus {
  isBanned: boolean;
  restrictionType: string | null;
  isOnboardingComplete: boolean;
  isLoading: boolean;
  userId: string | null;
}

const CACHE_KEY = 'mandatory_questions_complete';

export function useUserGateStatus(): UserGateStatus {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user_id');
    setUserId(stored);
  }, []);

  // Use the same SWR key as useUserProfile — requests are deduplicated
  const { data, isLoading: swrLoading } = useSWR(
    userId ? `${getApiUrl(API_ENDPOINTS.USERS)}${userId}/` : null,
    { dedupingInterval: 120000 }
  );

  // Still loading if userId hasn't been resolved yet from localStorage
  const isLoading = userId === null || swrLoading;

  // Derive gate fields from SWR data
  const isBanned = data?.is_banned ?? false;
  const restrictionType: string | null = data?.restriction_type ?? null;

  // Fall back to localStorage cache while SWR is loading
  const isOnboardingComplete: boolean = data
    ? (data.mandatory_questions_complete ?? false)
    : (typeof window !== 'undefined' && localStorage.getItem(CACHE_KEY) === 'true');

  // Sync localStorage cache when SWR data arrives
  useEffect(() => {
    if (data) {
      const complete = data.mandatory_questions_complete ?? false;
      localStorage.setItem(CACHE_KEY, String(complete));
    }
  }, [data]);

  return { isBanned, restrictionType, isOnboardingComplete, isLoading, userId };
}
