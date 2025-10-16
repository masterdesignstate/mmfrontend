// API Configuration
const API_CONFIG = {
  // Backend base URL - change this based on your environment
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9090',
  
  // API endpoints
  ENDPOINTS: {
    SIGNUP: '/api/auth/signup/',
    PERSONAL_DETAILS: '/api/auth/personal-details/',
    LOGIN: '/api/auth/login/',
    CHECK_USER: '/api/auth/check-user/',
    ONBOARDING_STATUS: '/api/auth/onboarding-status/',
    UPDATE_PROFILE_PHOTO: '/api/auth/update-profile-photo/',
    USERS: '/api/users/',
    USERS_ME: '/api/users/me/',
    QUESTIONS: '/api/questions/',
    ANSWERS: '/api/answers/',
    USER_RESULTS: '/api/results',
  }
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Export endpoints for easy access
export const API_ENDPOINTS = API_CONFIG.ENDPOINTS;

// Export base URL for debugging
export const API_BASE_URL = API_CONFIG.BASE_URL;
