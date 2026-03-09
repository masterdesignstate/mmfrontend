'use client';

import { useState, useEffect } from 'react';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

interface RestrictedStatus {
  isBanned: boolean;
  isLoading: boolean;
}

export function useRestrictedStatus(): RestrictedStatus {
  const [isBanned, setIsBanned] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      setIsLoading(false);
      return;
    }

    fetch(`${getApiUrl(API_ENDPOINTS.USERS)}${userId}/`, {
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch user');
        return res.json();
      })
      .then((user) => {
        setIsBanned(user.is_banned ?? false);
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return { isBanned, isLoading };
}
