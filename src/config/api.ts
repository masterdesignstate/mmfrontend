// API Configuration
const API_CONFIG = {
  // Backend base URL - change this based on your environment
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'https://matchmatical-1ad8879ad3b9.herokuapp.com',

  // BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9090/api',
  // API endpoints
  ENDPOINTS: {
    SIGNUP: '/auth/signup/',
    PERSONAL_DETAILS: '/auth/personal-details/',
    LOGIN: '/auth/login/',
    CHECK_USER: '/auth/check-user/',
    ONBOARDING_STATUS: '/auth/onboarding-status/',
    UPDATE_PROFILE_PHOTO: '/auth/update-profile-photo/',
    USERS: '/users/',
    USERS_ME: '/users/me/',
    QUESTIONS: '/questions/',
    ANSWERS: '/answers/',
    USER_RESULTS: '/results',
    CONTROLS: '/controls/',
    CONTROLS_CURRENT: '/controls/current/',
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
