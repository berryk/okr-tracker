import { useMutation, useQuery } from '@tanstack/react-query';
import client from './client';
import { ApiResponse } from '../types';

// Types
export interface GoalSuggestion {
  improvedTitle: string;
  explanation: string;
  suggestedMeasures: Array<{
    title: string;
    type: string;
    target: number;
    unit: string;
  }>;
  suggestedParentId: string | null;
}

export interface MeasureReview {
  score: number;
  assessment: {
    specific: { score: number; note: string };
    measurable: { score: number; note: string };
    achievable: { score: number; note: string };
    relevant: { score: number; note: string };
    timeBound: { score: number; note: string };
  };
  suggestions: string[];
  risks: string[];
}

export interface AlignmentSuggestion {
  goalId: string;
  goalTitle: string;
  teamName: string;
  relevance: number;
  explanation: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// API functions
async function suggestGoal(
  title: string,
  description: string | undefined,
  teamId: string
): Promise<GoalSuggestion> {
  const response = await client.post<ApiResponse<GoalSuggestion>>('/api/ai/suggest-goal', {
    title,
    description,
    teamId,
  });
  if (!response.data.data) throw new Error('Failed to get suggestion');
  return response.data.data;
}

async function reviewMeasure(measureId: string): Promise<MeasureReview> {
  const response = await client.post<ApiResponse<MeasureReview>>(
    `/api/ai/review-measure/${measureId}`
  );
  if (!response.data.data) throw new Error('Failed to review measure');
  return response.data.data;
}

async function suggestAlignment(goalId: string): Promise<AlignmentSuggestion[]> {
  const response = await client.get<ApiResponse<AlignmentSuggestion[]>>(
    `/api/ai/suggest-alignment/${goalId}`
  );
  return response.data.data || [];
}

async function generateProgressSummary(goalId: string): Promise<string> {
  const response = await client.get<ApiResponse<{ summary: string }>>(
    `/api/ai/progress-summary/${goalId}`
  );
  return response.data.data?.summary || '';
}

async function chat(messages: ChatMessage[]): Promise<string> {
  const response = await client.post<ApiResponse<{ response: string }>>('/api/ai/chat', {
    messages,
  });
  return response.data.data?.response || '';
}

// React Query hooks
export function useSuggestGoal() {
  return useMutation({
    mutationFn: ({
      title,
      description,
      teamId,
    }: {
      title: string;
      description?: string;
      teamId: string;
    }) => suggestGoal(title, description, teamId),
  });
}

export function useReviewMeasure() {
  return useMutation({
    mutationFn: (measureId: string) => reviewMeasure(measureId),
  });
}

export function useSuggestAlignment(goalId: string) {
  return useQuery({
    queryKey: ['ai-alignment', goalId],
    queryFn: () => suggestAlignment(goalId),
    enabled: !!goalId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useProgressSummary(goalId: string, enabled = false) {
  return useQuery({
    queryKey: ['ai-progress-summary', goalId],
    queryFn: () => generateProgressSummary(goalId),
    enabled: enabled && !!goalId,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });
}

export function useChat() {
  return useMutation({
    mutationFn: (messages: ChatMessage[]) => chat(messages),
  });
}
