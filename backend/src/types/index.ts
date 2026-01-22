import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  teamId: string | null;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  year: number;  // Annual objective
  teamId: string;
  isStretch?: boolean;
  dueDate?: string;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  status?: string;
  progress?: number;
  isStretch?: boolean;
  dueDate?: string;
}

export interface CreateMeasureInput {
  title: string;
  description?: string;
  quarter: string;  // Quarterly key result (e.g., "Q1-2026")
  measureType: string;
  unit?: string;
  startValue?: number;
  targetValue: number;
  goalId: string;
}

export interface UpdateMeasureInput {
  title?: string;
  description?: string;
  currentValue?: number;
  targetValue?: number;
}
