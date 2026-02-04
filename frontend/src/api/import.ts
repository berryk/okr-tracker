import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from './client';
import { ApiResponse, Goal } from '../types';

// Types for extracted OKRs
export interface ExtractedKeyResult {
  title: string;
  measureType: 'INCREASE_TO' | 'DECREASE_TO' | 'MAINTAIN' | 'MILESTONE';
  targetValue: number;
  unit?: string;
  startValue?: number;
}

export interface ExtractedOKR {
  objective: {
    title: string;
    description?: string;
  };
  keyResults: ExtractedKeyResult[];
  confidence: number;
  sourceSlide?: number;
}

export interface PPTXAnalyzeResponse {
  extractedOKRs: ExtractedOKR[];
  rawText: string;
  warnings: string[];
}

export interface PPTXCreateInput {
  teamId: string;
  ownerId: string;
  year: number;
  okrs: Array<{
    objective: { title: string; description?: string };
    keyResults?: ExtractedKeyResult[];
  }>;
}

// API functions
async function analyzePPTX(file: File): Promise<PPTXAnalyzeResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await client.post<ApiResponse<PPTXAnalyzeResponse>>(
    '/api/import/pptx/analyze',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  if (!response.data.data) {
    throw new Error('Failed to analyze PowerPoint file');
  }

  return response.data.data;
}

async function createFromPPTX(input: PPTXCreateInput): Promise<Goal[]> {
  const response = await client.post<ApiResponse<Goal[]>>(
    '/api/import/pptx/create',
    input
  );

  if (!response.data.data) {
    throw new Error('Failed to create OKRs');
  }

  return response.data.data;
}

// React Query hooks
export function useAnalyzePPTX() {
  return useMutation({
    mutationFn: analyzePPTX,
  });
}

export function useCreateFromPPTX() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFromPPTX,
    onSuccess: () => {
      // Invalidate goals query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}
