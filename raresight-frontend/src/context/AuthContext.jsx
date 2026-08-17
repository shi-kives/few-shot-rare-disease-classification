import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loginApi, signupApi } from '../api/auth.js';
import { useToast } from './ToastContext.jsx';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  // Helper to extract first letter
  const getAvatarInitial = (name) => {
    if (!name || typeof name !== 'string') return 'U';
    return name.trim().charAt(0).toUpperCase();
  };

  // Safe error message extractor
  const parseErrorMessage = (err, defaultMsg = 'An unexpected error occurred.') => {
    if (!err) return defaultMsg;
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail.map((d) => d.msg || d.message || JSON.stringify(d)).join(', ');
    }
    if (err.response?.data?.message) return err.response.data.message;
    if (err.message?.includes('Network Error') || err.message?.includes('ECONNREFUSED')) {
      return 'Cannot reach backend server. Please verify FastAPI is running at http://localhost:8000.';
    }
    return err.message || defaultMsg;
  };

  // Restore session on mount
  useEffect(() => {
    try {
      const localToken = localStorage.getItem('rs_token');
      const localUser = localStorage.getItem('rs_user');
      const sessionToken = sessionStorage.getItem('rs_token');
      const sessionUser = sessionStorage.getItem('rs_user');

      if (localToken && localUser) {
        const parsed = JSON.parse(localUser);
        setUser({
          ...parsed,
          avatarInitial: getAvatarInitial(parsed.name),
        });
      } else if (sessionToken && sessionUser) {
        const parsed = JSON.parse(sessionUser);
        setUser({
          ...parsed,
          avatarInitial: getAvatarInitial(parsed.name),
        });
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Error restoring auth state:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Check for expired session query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('expired') === 'true') {
      showToast('Your session expired. Please sign in again.', 'error');
      params.delete('expired');
      const newSearch = params.toString() ? `?${params.toString()}` : '';
      navigate(`${location.pathname}${newSearch}`, { replace: true });
    }
  }, [location, navigate, showToast]);

  const login = async (email, password, rememberMe = false) => {
    try {
      let data;
      try {
        data = await loginApi(email, password);
      } catch (err) {
        const isBackendUnavailable =
          !err.response ||
          err.response.status >= 500 ||
          err.response.status === 404 ||
          err.code === 'ERR_NETWORK' ||
          err.code === 'ECONNREFUSED';

        // In development mode, provide fallback session if backend is offline or unconfigured
        if (isBackendUnavailable && import.meta.env.DEV) {
          if (import.meta.env.DEV) {
            console.warn(
              'Backend auth unavailable, initializing development session:',
              err.message
            );
          }
          data = {
            access_token: 'mock-dev-jwt-' + Date.now(),
            user: {
              id: 'usr_dev_1',
              email,
              name: email.split('@')[0],
              role: 'Specialist Doctor',
            },
          };
          showToast(
            'Signed in in development mode (backend at localhost:8000 is offline)',
            'info'
          );
        } else {
          const parsed = parseErrorMessage(err, 'Unable to sign in. Please verify credentials.');
          const formattedErr = new Error(parsed);
          formattedErr.response = err.response;
          throw formattedErr;
        }
      }

      const token = data.access_token || data.token || 'rs_token_' + Date.now();
      const userData = data.user || {
        id: data.id || 'usr_' + Date.now(),
        email: data.email || email,
        name: data.name || email.split('@')[0],
        role: data.role || 'Specialist Doctor',
      };

      const userObj = {
        ...userData,
        avatarInitial: getAvatarInitial(userData.name),
      };

      // Clear previous storage
      localStorage.removeItem('rs_token');
      localStorage.removeItem('rs_user');
      sessionStorage.removeItem('rs_token');
      sessionStorage.removeItem('rs_user');

      if (rememberMe) {
        localStorage.setItem('rs_token', token);
        localStorage.setItem('rs_user', JSON.stringify(userObj));
      } else {
        sessionStorage.setItem('rs_token', token);
        sessionStorage.setItem('rs_user', JSON.stringify(userObj));
      }

      setUser(userObj);
      return userObj;
    } catch (error) {
      throw error;
    }
  };

  const signup = async (name, email, password, role) => {
    try {
      let data;
      try {
        data = await signupApi(name, email, password, role);
      } catch (err) {
        const isBackendUnavailable =
          !err.response ||
          err.response.status >= 500 ||
          err.response.status === 404 ||
          err.code === 'ERR_NETWORK' ||
          err.code === 'ECONNREFUSED';

        if (isBackendUnavailable && import.meta.env.DEV) {
          if (import.meta.env.DEV) {
            console.warn(
              'Backend signup unavailable, initializing local development account:',
              err.message
            );
          }
          data = {
            access_token: 'mock-signup-jwt-' + Date.now(),
            user: {
              id: 'usr_' + Date.now(),
              name,
              email,
              role,
            },
          };
          showToast(
            'Account initialized in development mode (backend at localhost:8000 is offline)',
            'info'
          );
        } else {
          const parsed = parseErrorMessage(err, 'Unable to create account. Please try again.');
          const formattedErr = new Error(parsed);
          formattedErr.response = err.response;
          throw formattedErr;
        }
      }

      const token = data.access_token || data.token || 'rs_token_' + Date.now();
      const userData = data.user || {
        id: data.id || 'usr_' + Date.now(),
        name,
        email,
        role,
      };

      const userObj = {
        ...userData,
        avatarInitial: getAvatarInitial(userData.name),
      };

      // Default to session storage on signup
      sessionStorage.setItem('rs_token', token);
      sessionStorage.setItem('rs_user', JSON.stringify(userObj));

      setUser(userObj);
      return userObj;
    } catch (error) {
      throw error;
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('rs_token');
    localStorage.removeItem('rs_user');
    sessionStorage.removeItem('rs_token');
    sessionStorage.removeItem('rs_user');
    setUser(null);
    navigate('/login');
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
