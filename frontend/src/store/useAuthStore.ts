import { create } from 'zustand';
import { api } from '../lib/api';

export interface User {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'manager' | 'hr_recruiter' | 'employee' | 'candidate';
  department?: string;
  employmentDetails?: {
    designation?: string;
    employmentType?: string;
    joiningDate?: string;
    workMode?: string;
    noticePeriod?: number;
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; passwordHash?: string; password?: string }) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Listen for the custom logout event from the Axios interceptor
  if (typeof window !== 'undefined') {
    window.addEventListener('auth-logout', () => {
      document.cookie = 'isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
    });
  }

  return {
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true,

    login: async (credentials) => {
      set({ isLoading: true });
      try {
        const response = await api.post('/auth/login', credentials);
        const { accessToken, user } = response.data;

        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
          document.cookie = `isAuthenticated=true; path=/; max-age=${7 * 24 * 60 * 60}`;
          document.cookie = `userRole=${user.role}; path=/; max-age=${7 * 24 * 60 * 60}`;
        }

        set({
          user,
          accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (err) {
        set({ isLoading: false });
        throw err;
      }
    },

    logout: async () => {
      set({ isLoading: true });
      try {
        await api.post('/auth/logout');
      } catch (err) {
        console.error('Logout API failed:', err);
      } finally {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          document.cookie = 'isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    },

    initializeAuth: async () => {
      // Skip if already authenticated — prevents re-running on every render
      if (get().isAuthenticated && get().user) return;
      set({ isLoading: true });
      try {
        if (typeof window === 'undefined') return;

        const token = localStorage.getItem('accessToken');
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        // If a token is in localStorage, check if we can fetch profile details
        // We will call GET /auth/me or verify token by hitting /auth/refresh
        // Hit refresh endpoint to confirm validity and get a fresh token
        const refreshResponse = await api.post('/auth/refresh');
        const { accessToken, user } = refreshResponse.data;

        localStorage.setItem('accessToken', accessToken);
        if (typeof window !== 'undefined') {
          document.cookie = `isAuthenticated=true; path=/; max-age=${7 * 24 * 60 * 60}`;
          document.cookie = `userRole=${user.role}; path=/; max-age=${7 * 24 * 60 * 60}`;
        }
        set({
          user,
          accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (err) {
        console.warn('Silent auth initialization failed, clearing token.');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          document.cookie = 'isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    },

    setToken: (token) => {
      if (token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', token);
        }
        set({ accessToken: token, isAuthenticated: true });
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
        }
        set({ accessToken: null, isAuthenticated: false, user: null });
      }
    },
  };
});
