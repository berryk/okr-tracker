import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from './client';
import { ApiResponse } from '../types';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'EXECUTIVE' | 'MANAGER' | 'CONTRIBUTOR';
  isActive: boolean;
  teamId: string | null;
  team: { id: string; name: string } | null;
  lastLoginAt: string | null;
  createdAt: string;
}

async function fetchUsers(): Promise<User[]> {
  const response = await client.get<ApiResponse<User[]>>('/api/users');
  return response.data.data || [];
}

async function updateUserRole(userId: string, role: User['role']): Promise<User> {
  const response = await client.patch<ApiResponse<User>>(`/api/users/${userId}/role`, { role });
  if (!response.data.data) throw new Error('Failed to update role');
  return response.data.data;
}

async function toggleUserActive(userId: string): Promise<User> {
  const response = await client.patch<ApiResponse<User>>(`/api/users/${userId}/toggle-active`);
  if (!response.data.data) throw new Error('Failed to toggle user status');
  return response.data.data;
}

async function updateUserTeam(userId: string, teamId: string | null): Promise<User> {
  const response = await client.patch<ApiResponse<User>>(`/api/users/${userId}/team`, { teamId });
  if (!response.data.data) throw new Error('Failed to update team');
  return response.data.data;
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: User['role'] }) =>
      updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useToggleUserActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => toggleUserActive(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUserTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, teamId }: { userId: string; teamId: string | null }) =>
      updateUserTeam(userId, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
