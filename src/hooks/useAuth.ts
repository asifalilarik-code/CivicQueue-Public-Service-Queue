import { useState, useEffect, useCallback } from 'react';
import { UserPublic, AuthResponse } from '../types/auth.ts';

const TOKEN_KEY = 'civic_auth_token';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Restore current user session from token
  const fetchCurrentUser = useCallback(async (authToken: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setAuthError(null);
      } else {
        // Invalid or expired token
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setCurrentUser(null);
      }
    } catch (err) {
      console.warn('Failed to verify session token:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) {
      fetchCurrentUser(saved);
    } else {
      setLoading(false);
    }
  }, [fetchCurrentUser]);

  // Citizen Login
  const login = async (identifier: string, pass: string): Promise<UserPublic> => {
    setAuthError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password: pass }),
    });

    const data = await res.json();
    if (!res.ok) {
      const err = data.error || 'Login failed';
      setAuthError(err);
      throw new Error(err);
    }

    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setCurrentUser(data.user);
    return data.user;
  };

  // Administrator Secure Login
  const adminLogin = async (identifier: string, pass: string): Promise<UserPublic> => {
    setAuthError(null);
    const res = await fetch('/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password: pass }),
    });

    const data = await res.json();
    if (!res.ok) {
      const err = data.error || 'Administrator login failed';
      setAuthError(err);
      throw new Error(err);
    }

    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setCurrentUser(data.user);
    return data.user;
  };

  // Register Citizen
  const register = async (formData: {
    fullName: string;
    cnic: string;
    mobile: string;
    email: string;
    password: string;
    city?: string;
    address?: string;
  }): Promise<UserPublic> => {
    setAuthError(null);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    if (!res.ok) {
      const err = data.error || 'Registration failed';
      setAuthError(err);
      throw new Error(err);
    }

    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setCurrentUser(data.user);
    return data.user;
  };

  // Logout
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setCurrentUser(null);
    setAuthError(null);
  };

  return {
    currentUser,
    token,
    isAuthenticated: Boolean(currentUser),
    isAdmin: currentUser?.role === 'admin',
    loading,
    authError,
    login,
    adminLogin,
    register,
    logout,
    refreshUser: () => {
      const saved = localStorage.getItem(TOKEN_KEY);
      if (saved) fetchCurrentUser(saved);
    },
  };
}
