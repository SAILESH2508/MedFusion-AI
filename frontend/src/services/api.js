import axios from 'axios';

// Backend runs on port 8000 (manage.py runserver default).
// If you use start.ps1 which launches on 8001, update this to 8001.
export const API_BASE_URL = "http://127.0.0.1:8000/api";

// Create authenticated axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // 60-second timeout — generous enough for LLM responses, prevents infinite hangs
  timeout: 60000,
});

// Add JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medfusion_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle auth errors and timeouts
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Surface a friendly message for request timeouts
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      error.response = error.response || {};
      error.response.data = { error: 'Request timed out. The AI analysis is taking longer than expected — please try again.' };
      return Promise.reject(error);
    }

    const url = error.config?.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/signup');

    // Only clear session on 401 if this is NOT an auth form submission.
    // Login/signup legitimately return 401 for wrong credentials — don't
    // treat those as a session expiry.
    if (error.response && error.response.status === 401 && !isAuthEndpoint) {
      const hasExistingToken = !!localStorage.getItem('medfusion_token');
      if (hasExistingToken) {
        console.warn('Session expired or invalid. Clearing tokens.');
        localStorage.removeItem('medfusion_token');
        localStorage.removeItem('medfusion_user');
        window.dispatchEvent(new Event('medfusion_auth_logout'));
        // Force reload to login if on a protected route
        if (
          !window.location.pathname.includes('/auth') &&
          window.location.pathname !== '/' &&
          window.location.pathname !== '/dashboard' &&
          window.location.pathname !== '/upload' &&
          window.location.pathname !== '/nearby' &&
          window.location.pathname !== '/diet'
        ) {
          window.location.href = '/auth';
        }
      }
    }
    return Promise.reject(error);
  }
);


// Handle token storage
export const setAuthToken = (token) => {
  localStorage.setItem('medfusion_token', token);
};

export const removeAuthToken = () => {
  localStorage.removeItem('medfusion_token');
  localStorage.removeItem('medfusion_user');
};
