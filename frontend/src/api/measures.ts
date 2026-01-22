import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from './client';
import { ApiResponse, Measure, MeasureUpdate } from '../types';

interface CreateMeasureInput {
  title: string;
  description?: string;
  quarter: string;  // Quarterly key result (e.g., "Q1-2026")
  measureType: 'INCREASE_TO' | 'DECREASE_TO' | 'MAINTAIN' | 'MILESTONE';
  unit?: string;
  startValue?: number;
  targetValue: number;
  goalId: string;
}

interface UpdateMeasureInput {
  title?: string;
  description?: string;
  currentValue?: number;
  targetValue?: number;
}

async function createMeasure(input: CreateMeasureInput): Promise<Measure> {
  const response = await client.post<ApiResponse<Measure>>('/api/measures', input);
  if (!response.data.data) throw new Error('Failed to create measure');
  return response.data.data;
}

async function updateMeasure({ id, ...input }: UpdateMeasureInput & { id: string }): Promise<Measure> {
  const response = await client.patch<ApiResponse<Measure>>(`/api/measures/${id}`, input);
  if (!response.data.data) throw new Error('Failed to update measure');
  return response.data.data;
}

async function deleteMeasure(id: string): Promise<void> {
  await client.delete(`/api/measures/${id}`);
}

async function recordMeasureUpdate(
  measureId: string,
  value: number,
  note?: string
): Promise<MeasureUpdate> {
  const response = await client.post<ApiResponse<MeasureUpdate>>(
    `/api/measures/${measureId}/updates`,
    { value, note }
  );
  if (!response.data.data) throw new Error('Failed to record update');
  return response.data.data;
}

async function getMeasureHistory(measureId: string): Promise<MeasureUpdate[]> {
  const response = await client.get<ApiResponse<MeasureUpdate[]>>(
    `/api/measures/${measureId}/history`
  );
  return response.data.data || [];
}

// React Query hooks
export function useCreateMeasure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMeasure,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goal', variables.goalId] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useUpdateMeasure(goalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMeasure,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useDeleteMeasure(goalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMeasure,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useRecordMeasureUpdate(goalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ measureId, value, note }: { measureId: string; value: number; note?: string }) =>
      recordMeasureUpdate(measureId, value, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useMeasureHistory(measureId: string) {
  return useQuery({
    queryKey: ['measure-history', measureId],
    queryFn: () => getMeasureHistory(measureId),
    enabled: !!measureId,
  });
}
