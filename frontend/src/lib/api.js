import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Add a request interceptor to attach the auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('shopee_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
