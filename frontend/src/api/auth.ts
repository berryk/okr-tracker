import client from './client';
import { ApiResponse, AuthResponse, LoginCredentials, User } from '../types';

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await client.post<ApiResponse<AuthResponse>>('/api/auth/login', credentials);
  const { data } = response.data;
  if (!data) throw new Error('Login failed');
  localStorage.setItem('token', data.token);
  return data;
}

export async function logout(): Promise<void> {
  localStorage.removeItem('token');
}

export async function getCurrentUser(): Promise<User> {
  const response = await client.get<ApiResponse<User>>('/api/auth/me');
  if (!response.data.data) throw new Error('Failed to get user');
  return response.data.data;
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('token');
}
