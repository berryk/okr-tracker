import { useQuery } from '@tanstack/react-query';
import client from './client';
import { ApiResponse } from '../types';

export interface TeamProgress {
  teamId: string;
  teamName: string;
  teamLevel: string;
  totalGoals: number;
  completedGoals: number;
  atRiskGoals: number;
  avgProgress: number;
  goals: Array<{
    id: string;
    title: string;
    status: string;
    progress: number;
    owner: string;
    measures: Array<{
      title: string;
      current: number;
      target: number;
      unit: string;
      progress: number;
    }>;
  }>;
}

export interface QuarterlyReport {
  quarter: string;
  year: number;
  generatedAt: string;
  organization: string;
  summary: {
    totalGoals: number;
    avgProgress: number;
    byStatus: Record<string, number>;
    topPerforming: Array<{ title: string; progress: number; team: string }>;
    atRisk: Array<{ title: string; progress: number; team: string; owner: string }>;
  };
  teamBreakdown: TeamProgress[];
}

export interface AnnualReport {
  year: number;
  generatedAt: string;
  organization: string;
  summary: {
    totalGoals: number;
    avgProgress: number;
    byStatus: Record<string, number>;
    byQuarter: Array<{ quarter: string; avgProgress: number; goalCount: number }>;
  };
  teamBreakdown: TeamProgress[];
  highlights: {
    completed: Array<{ title: string; team: string; owner: string }>;
    topProgress: Array<{ title: string; progress: number; team: string }>;
    needsAttention: Array<{ title: string; progress: number; team: string }>;
  };
}

async function fetchQuarterlyReport(quarter: string): Promise<QuarterlyReport> {
  const response = await client.get<ApiResponse<QuarterlyReport>>(`/api/reports/quarterly/${quarter}`);
  if (!response.data.data) throw new Error('Failed to fetch quarterly report');
  return response.data.data;
}

async function fetchAnnualReport(year: number): Promise<AnnualReport> {
  const response = await client.get<ApiResponse<AnnualReport>>(`/api/reports/annual/${year}`);
  if (!response.data.data) throw new Error('Failed to fetch annual report');
  return response.data.data;
}

export async function downloadReportAsText(type: 'quarterly' | 'annual', period: string): Promise<string> {
  const endpoint = type === 'quarterly'
    ? `/api/reports/quarterly/${period}?format=text`
    : `/api/reports/annual/${period}?format=text`;
  const response = await client.get(endpoint, { responseType: 'text' });
  return response.data as unknown as string;
}

export function useQuarterlyReport(quarter: string) {
  return useQuery({
    queryKey: ['quarterly-report', quarter],
    queryFn: () => fetchQuarterlyReport(quarter),
    enabled: !!quarter,
  });
}

export function useAnnualReport(year: number) {
  return useQuery({
    queryKey: ['annual-report', year],
    queryFn: () => fetchAnnualReport(year),
    enabled: !!year,
  });
}
