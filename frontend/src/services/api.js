import axios from 'axios';

export const API_BASE_URL = "http://127.0.0.1:8001/api";

// Create authenticated axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medfusion_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Session expired or invalid. Clearing tokens.");
      localStorage.removeItem('medfusion_token');
      localStorage.removeItem('medfusion_user');
      // Force reload to login if on a protected route
      if (
        !window.location.pathname.includes('/auth') && 
        window.location.pathname !== '/' && 
        window.location.pathname !== '/dashboard' && 
        window.location.pathname !== '/upload'
      ) {
        window.location.href = '/auth';
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
