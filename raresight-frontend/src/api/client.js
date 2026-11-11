import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
});

// Attach token to every request
client.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('rs_token') ||
    sessionStorage.getItem('rs_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle session expiry globally
client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rs_token');
      localStorage.removeItem('rs_user');
      sessionStorage.removeItem('rs_token');
      sessionStorage.removeItem('rs_user');
      window.location.href = '/login?expired=true';
    }
    return Promise.reject(error);
  }
);

export default client;
