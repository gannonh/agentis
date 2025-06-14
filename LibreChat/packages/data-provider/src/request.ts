/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import * as endpoints from './api-endpoints';
import type * as t from './types';

// Configure axios for Better Auth (cookie-based authentication)
axios.defaults.withCredentials = true;

async function _get<T>(url: string, options?: AxiosRequestConfig): Promise<T> {
  const response = await axios.get(url, { ...options });
  return response.data;
}

async function _getResponse<T>(url: string, options?: AxiosRequestConfig): Promise<T> {
  return await axios.get(url, { ...options });
}

async function _post(url: string, data?: any) {
  const response = await axios.post(url, JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
}

async function _postMultiPart(url: string, formData: FormData, options?: AxiosRequestConfig) {
  const response = await axios.post(url, formData, {
    ...options,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

async function _postTTS(url: string, formData: FormData, options?: AxiosRequestConfig) {
  const response = await axios.post(url, formData, {
    ...options,
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'arraybuffer',
  });
  return response.data;
}

async function _put(url: string, data?: any) {
  const response = await axios.put(url, JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
}

async function _delete<T>(url: string): Promise<T> {
  const response = await axios.delete(url);
  return response.data;
}

async function _deleteWithOptions<T>(url: string, options?: AxiosRequestConfig): Promise<T> {
  const response = await axios.delete(url, { ...options });
  return response.data;
}

async function _patch(url: string, data?: any) {
  const response = await axios.patch(url, JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
}

// Better Auth interceptor - much simpler since cookies handle session management
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Don't handle auth errors for Better Auth endpoints
    if (error.config?.url?.includes('/api/auth/')) {
      return Promise.reject(error);
    }

    // For Better Auth, if we get a 401, redirect to login
    // The session has expired and needs to be renewed through login
    if (error.response?.status === 401) {
      console.warn('401 error - session expired, redirecting to login');
      if (!window.location.href.includes('share/')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

// Better Auth utility functions
const getSession = (): Promise<t.TLoginResponse> => _get(endpoints.session());

const dispatchSessionUpdatedEvent = (session: any) => {
  // Better Auth uses cookies, no need to set headers manually
  window.dispatchEvent(new CustomEvent('sessionUpdated', { detail: session }));
};

export default {
  get: _get,
  getResponse: _getResponse,
  post: _post,
  postMultiPart: _postMultiPart,
  postTTS: _postTTS,
  put: _put,
  delete: _delete,
  deleteWithOptions: _deleteWithOptions,
  patch: _patch,
  getSession,
  dispatchSessionUpdatedEvent,
};
