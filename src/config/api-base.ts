// Shared API base URL configuration
// This file can be imported by both client-side code and Next.js config

export const getApiBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || 'https://matchmatical-1ad8879ad3b9.herokuapp.com/api';
};

// Export the base URL directly for use in next.config.ts
export const API_BASE_URL_DEFAULT = 'https://matchmatical-1ad8879ad3b9.herokuapp.com/api';
export const API_BASE_URL_LOCALHOST = 'http://localhost:9090/api';

