import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from './client';
import { ApiResponse, Goal } from '../types';

interface GoalsParams {
  year?: number;
  teamId?: string;
  ownerId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

interface CreateGoalInput {
  title: string;
  description?: string;
  year: number;  // Annual objective
  teamId: string;
  isStretch?: boolean;
  dueDate?: string;
}

interface UpdateGoalInput {
  title?: string;
  description?: string;
  status?: string;
  progress?: number;
  isStretch?: boolean;
}

async function fetchGoals(params: GoalsParams): Promise<{ goals: Goal[]; pagination: any }> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) searchParams.append(key, String(value));
  });
  const response = await client.get<ApiResponse<Goal[]>>(`/api/goals?${searchParams}`);
  return { goals: response.data.data || [], pagination: response.data.pagination };
}

async function fetchGoal(id: string): Promise<Goal> {
  const response = await client.get<ApiResponse<Goal>>(`/api/goals/${id}`);
  if (!response.data.data) throw new Error('Goal not found');
  return response.data.data;
}

async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const response = await client.post<ApiResponse<Goal>>('/api/goals', input);
  if (!response.data.data) throw new Error('Failed to create goal');
  return response.data.data;
}

async function updateGoal({ id, ...input }: UpdateGoalInput & { id: string }): Promise<Goal> {
  const response = await client.patch<ApiResponse<Goal>>(`/api/goals/${id}`, input);
  if (!response.data.data) throw new Error('Failed to update goal');
  return response.data.data;
}

async function deleteGoal(id: string): Promise<void> {
  await client.delete(`/api/goals/${id}`);
}

async function addGoalUpdate(goalId: string, content: string): Promise<void> {
  await client.post(`/api/goals/${goalId}/updates`, { content });
}

// React Query hooks
export function useGoals(params: GoalsParams = {}) {
  return useQuery({
    queryKey: ['goals', params],
    queryFn: () => fetchGoals(params),
  });
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: ['goal', id],
    queryFn: () => fetchGoal(id),
    enabled: !!id,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateGoal,
    onSuccess: (goal) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goal.id] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useAddGoalUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, content }: { goalId: string; content: string }) =>
      addGoalUpdate(goalId, content),
    onSuccess: (_, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
    },
  });
}

// Hierarchy types
export interface HierarchyGoal {
  id: string;
  title: string;
  progress: number;
  status: string;
  team: { id: string; name: string; level: string };
  owner: { id: string; firstName: string; lastName: string };
  contributionWeight?: number;
}

export interface GoalHierarchy {
  current: HierarchyGoal;
  ancestors: HierarchyGoal[];
  descendants: HierarchyGoal[];
}

async function fetchGoalHierarchy(id: string): Promise<GoalHierarchy> {
  const response = await client.get<ApiResponse<GoalHierarchy>>(`/api/goals/${id}/hierarchy`);
  if (!response.data.data) throw new Error('Failed to fetch hierarchy');
  return response.data.data;
}

async function fetchAvailableParents(id: string): Promise<Goal[]> {
  const response = await client.get<ApiResponse<Goal[]>>(`/api/goals/${id}/available-parents`);
  return response.data.data || [];
}

async function linkGoals(childGoalId: string, parentGoalId: string, contributionWeight = 1): Promise<void> {
  await client.post('/api/goals/link', { childGoalId, parentGoalId, contributionWeight });
}

async function unlinkGoals(parentGoalId: string, childGoalId: string): Promise<void> {
  await client.delete(`/api/goals/link/${parentGoalId}/${childGoalId}`);
}

export function useGoalHierarchy(id: string) {
  return useQuery({
    queryKey: ['goal-hierarchy', id],
    queryFn: () => fetchGoalHierarchy(id),
    enabled: !!id,
  });
}

export function useAvailableParents(id: string) {
  return useQuery({
    queryKey: ['available-parents', id],
    queryFn: () => fetchAvailableParents(id),
    enabled: !!id,
  });
}

export function useLinkGoals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ childGoalId, parentGoalId, contributionWeight }: {
      childGoalId: string;
      parentGoalId: string;
      contributionWeight?: number;
    }) => linkGoals(childGoalId, parentGoalId, contributionWeight),
    onSuccess: (_, { childGoalId }) => {
      queryClient.invalidateQueries({ queryKey: ['goal', childGoalId] });
      queryClient.invalidateQueries({ queryKey: ['goal-hierarchy', childGoalId] });
      queryClient.invalidateQueries({ queryKey: ['available-parents', childGoalId] });
    },
  });
}

export function useUnlinkGoals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ parentGoalId, childGoalId }: { parentGoalId: string; childGoalId: string }) =>
      unlinkGoals(parentGoalId, childGoalId),
    onSuccess: (_, { childGoalId }) => {
      queryClient.invalidateQueries({ queryKey: ['goal', childGoalId] });
      queryClient.invalidateQueries({ queryKey: ['goal-hierarchy', childGoalId] });
      queryClient.invalidateQueries({ queryKey: ['available-parents', childGoalId] });
    },
  });
}

// Goals Map types and hooks
export interface GoalMapData {
  goals: Array<Goal & {
    parentLinks: Array<{ parentGoalId: string; contributionWeight: number }>;
    childLinks: Array<{ childGoalId: string; contributionWeight: number }>;
  }>;
  links: Array<{
    id: string;
    parentGoalId: string;
    childGoalId: string;
    contributionWeight: number;
  }>;
}

async function fetchGoalsMap(year?: number): Promise<GoalMapData> {
  const params = year ? `?year=${year}` : '';
  const response = await client.get<ApiResponse<GoalMapData>>(`/api/goals/map${params}`);
  if (!response.data.data) throw new Error('Failed to fetch goals map');
  return response.data.data;
}

export function useGoalsMap(year?: number) {
  return useQuery({
    queryKey: ['goals-map', year],
    queryFn: () => fetchGoalsMap(year),
  });
}

// Clone functionality
export interface CloneGoalInput {
  sourceGoalId: string;
  targetTeamId: string;
  year: number;
  includeMeasures: boolean;
  newQuarter?: string;
}

async function fetchGoalsForCloning(year?: number): Promise<Goal[]> {
  const params = year ? `?year=${year}` : '';
  const response = await client.get<ApiResponse<Goal[]>>(`/api/goals/templates/available${params}`);
  return response.data.data || [];
}

async function cloneGoal(input: CloneGoalInput): Promise<Goal> {
  const response = await client.post<ApiResponse<Goal>>('/api/goals/clone', input);
  if (!response.data.data) throw new Error('Failed to clone goal');
  return response.data.data;
}

export function useGoalsForCloning(year?: number) {
  return useQuery({
    queryKey: ['goals-for-cloning', year],
    queryFn: () => fetchGoalsForCloning(year),
  });
}

export function useCloneGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cloneGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

// Bulk import functionality
export interface BulkImportGoal {
  title: string;
  description?: string;
  measures?: Array<{
    title: string;
    measureType: 'INCREASE_TO' | 'DECREASE_TO' | 'MAINTAIN' | 'MILESTONE';
    unit?: string;
    startValue?: number;
    targetValue: number;
  }>;
}

export interface BulkImportInput {
  teamId: string;
  year: number;
  quarter: string;
  goals: BulkImportGoal[];
}

async function bulkImportGoals(input: BulkImportInput): Promise<Goal[]> {
  const response = await client.post<ApiResponse<Goal[]> & { count: number }>('/api/goals/bulk-import', input);
  if (!response.data.data) throw new Error('Failed to import goals');
  return response.data.data;
}

export function useBulkImportGoals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkImportGoals,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}
