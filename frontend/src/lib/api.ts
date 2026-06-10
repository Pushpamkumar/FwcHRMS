import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // required to send refresh tokens in httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach access token from Zustand / LocalStorage if present
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401 unauthorized errors (Auto Token Refresh)
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh if logout or refresh endpoint itself failed
    if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log('[API Interceptor] Token expired. Attempting silent token refresh...');
        const response = await api.post('/auth/refresh');
        const { accessToken } = response.data;

        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        console.error('[API Interceptor] Token refresh failed. Logging out user...');
        processQueue(refreshError, null);
        isRefreshing = false;

        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          // Dispatch custom event to let the auth store know
          window.dispatchEvent(new Event('auth-logout'));
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
