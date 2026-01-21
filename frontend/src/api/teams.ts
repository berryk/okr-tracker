import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from './client';
import { ApiResponse, Team } from '../types';

interface CreateTeamInput {
  name: string;
  description?: string;
  level: 'CORPORATE' | 'EXECUTIVE' | 'DEPARTMENT' | 'TEAM' | 'INDIVIDUAL';
  parentId?: string;
}

interface UpdateTeamInput {
  name?: string;
  description?: string;
  parentId?: string | null;
  isActive?: boolean;
}

async function fetchTeams(includeInactive = false): Promise<Team[]> {
  const response = await client.get<ApiResponse<Team[]>>(
    `/api/teams${includeInactive ? '?includeInactive=true' : ''}`
  );
  return response.data.data || [];
}

async function fetchTeamHierarchy(): Promise<Team[]> {
  const response = await client.get<ApiResponse<Team[]>>('/api/teams/hierarchy');
  return response.data.data || [];
}

async function fetchTeam(id: string): Promise<Team> {
  const response = await client.get<ApiResponse<Team>>(`/api/teams/${id}`);
  if (!response.data.data) throw new Error('Team not found');
  return response.data.data;
}

async function createTeam(input: CreateTeamInput): Promise<Team> {
  const response = await client.post<ApiResponse<Team>>('/api/teams', input);
  if (!response.data.data) throw new Error('Failed to create team');
  return response.data.data;
}

async function updateTeam({ id, ...input }: UpdateTeamInput & { id: string }): Promise<Team> {
  const response = await client.patch<ApiResponse<Team>>(`/api/teams/${id}`, input);
  if (!response.data.data) throw new Error('Failed to update team');
  return response.data.data;
}

async function deleteTeam(id: string): Promise<void> {
  await client.delete(`/api/teams/${id}`);
}

export function useTeams(includeInactive = false) {
  return useQuery({
    queryKey: ['teams', { includeInactive }],
    queryFn: () => fetchTeams(includeInactive),
  });
}

export function useTeamHierarchy() {
  return useQuery({
    queryKey: ['teams', 'hierarchy'],
    queryFn: fetchTeamHierarchy,
  });
}

export function useTeam(id: string) {
  return useQuery({
    queryKey: ['team', id],
    queryFn: () => fetchTeam(id),
    enabled: !!id,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTeam,
    onSuccess: (team) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['team', team.id] });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}
