'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

interface UserGateStatus {
  isBanned: boolean;
  restrictionType: string | null;
  restrictionReason: string | null;
  emailVerified: boolean;
  email: string | null;
  isOnboardingComplete: boolean;
  isLoading: boolean;
  userId: string | null;
}

const cacheKey = (userId: string) => `mandatory_questions_complete_${userId}`;

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
  const restrictionReason: string | null = data?.restriction_reason ?? null;
  const emailVerified: boolean = data?.email_verified ?? true;
  const email: string | null = data?.email ?? null;

  // Fall back to localStorage cache while SWR is loading
  const isOnboardingComplete: boolean = data
    ? (data.mandatory_questions_complete ?? false)
    : Boolean(
        userId
        && typeof window !== 'undefined'
        && localStorage.getItem(cacheKey(userId)) === 'true'
      );

  // Sync localStorage cache when SWR data arrives
  useEffect(() => {
    if (data && userId) {
      const complete = data.mandatory_questions_complete ?? false;
      localStorage.setItem(cacheKey(userId), String(complete));
      localStorage.removeItem('mandatory_questions_complete');
    }
  }, [data, userId]);

  return { isBanned, restrictionType, restrictionReason, emailVerified, email, isOnboardingComplete, isLoading, userId };
}
