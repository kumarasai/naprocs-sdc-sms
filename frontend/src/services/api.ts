import axios from 'axios';

const envApiUrl = import.meta.env.VITE_API_URL;
export const API_BASE_URL = envApiUrl
  ? (envApiUrl.endsWith('/api/v1') ? envApiUrl : `${envApiUrl.replace(/\/+$/, '')}/api/v1`)
  : 'http://127.0.0.1:5000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('naprocs_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't auto-redirect on initial auth check
      if (!error.config.url.includes('/auth/me')) {
        localStorage.removeItem('naprocs_token');
      }
    }
    return Promise.reject(error);
  }
);
