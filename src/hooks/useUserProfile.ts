import useSWR from 'swr';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

export function useUserProfile(userId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `${getApiUrl(API_ENDPOINTS.USERS)}${userId}/` : null,
    { dedupingInterval: 120000 }
  );
  return { user: data, userError: error, userLoading: isLoading, mutateUser: mutate };
}
