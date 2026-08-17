import client from './client.js';

export const loginApi = async (email, password) => {
  const credentials = { email, password, username: email };

  // 1. Try standard JSON /auth/login
  try {
    const response = await client.post('/auth/login', credentials);
    return response.data;
  } catch (err1) {
    if (err1.response?.status !== 404 && err1.response?.status !== 422) {
      throw err1;
    }
  }

  // 2. Try standard JSON /login
  try {
    const response = await client.post('/login', credentials);
    return response.data;
  } catch (err2) {
    if (err2.response?.status !== 404 && err2.response?.status !== 422) {
      throw err2;
    }
  }

  // 3. Try OAuth2 form-urlencoded /token (Standard FastAPI OAuth2PasswordRequestForm)
  const formParams = new URLSearchParams();
  formParams.append('username', email);
  formParams.append('password', password);

  try {
    const response = await client.post('/token', formParams, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  } catch (err3) {
    if (err3.response?.status !== 404 && err3.response?.status !== 422) {
      throw err3;
    }
  }

  // 4. Try OAuth2 form-urlencoded /auth/token
  try {
    const response = await client.post('/auth/token', formParams, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  } catch (err4) {
    throw err4;
  }
};

export const signupApi = async (name, email, password, role) => {
  const payload = { name, email, password, role, username: email };

  // 1. Try /auth/signup
  try {
    const response = await client.post('/auth/signup', payload);
    return response.data;
  } catch (err1) {
    if (err1.response?.status !== 404 && err1.response?.status !== 422) {
      throw err1;
    }
  }

  // 2. Try /signup
  try {
    const response = await client.post('/signup', payload);
    return response.data;
  } catch (err2) {
    if (err2.response?.status !== 404 && err2.response?.status !== 422) {
      throw err2;
    }
  }

  // 3. Try /auth/register
  try {
    const response = await client.post('/auth/register', payload);
    return response.data;
  } catch (err3) {
    if (err3.response?.status !== 404 && err3.response?.status !== 422) {
      throw err3;
    }
  }

  // 4. Try /register
  const response = await client.post('/register', payload);
  return response.data;
};

export const getMeApi = async () => {
  try {
    const response = await client.get('/auth/me');
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      const altResponse = await client.get('/me');
      return altResponse.data;
    }
    throw error;
  }
};
