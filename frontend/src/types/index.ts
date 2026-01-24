export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  title?: string;
  avatarUrl?: string;
  role: 'ADMIN' | 'EXECUTIVE' | 'MANAGER' | 'CONTRIBUTOR';
  organization: {
    id: string;
    name: string;
  };
  team?: {
    id: string;
    name: string;
  } | null;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  level: 'CORPORATE' | 'EXECUTIVE' | 'DEPARTMENT' | 'TEAM' | 'INDIVIDUAL';
  parentId?: string;
  parent?: { id: string; name: string };
  children?: Team[];
  isActive?: boolean;
  _count?: {
    members: number;
    goals: number;
    children?: number;
  };
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  year: number;  // Annual objective
  status: GoalStatus;
  progress: number;
  isStretch: boolean;
  dueDate?: string;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  team: {
    id: string;
    name: string;
    level: string;
  };
  measures?: Measure[];
  updates?: GoalUpdate[];
  parentLinks?: GoalLink[];
  childLinks?: GoalLink[];
  createdAt: string;
  updatedAt: string;
}

export type GoalStatus = 'DRAFT' | 'ACTIVE' | 'AT_RISK' | 'BEHIND' | 'ON_TRACK' | 'COMPLETED' | 'CANCELLED';

export interface GoalLink {
  id: string;
  parentGoalId: string;
  childGoalId: string;
  contributionWeight: number;
  parentGoal?: { id: string; title: string; progress: number; status: GoalStatus };
  childGoal?: { id: string; title: string; progress: number; status: GoalStatus };
}

export interface GoalUpdate {
  id: string;
  content: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

export interface Measure {
  id: string;
  title: string;
  description?: string;
  quarter: string;  // Quarterly key result (e.g., "Q1-2026")
  measureType: 'INCREASE_TO' | 'DECREASE_TO' | 'MAINTAIN' | 'MILESTONE';
  unit?: string;
  startValue: number;
  currentValue: number;
  targetValue: number;
  progress: number;
  updates?: MeasureUpdate[];
  createdAt: string;
  updatedAt: string;
}

export interface MeasureUpdate {
  id: string;
  value: number;
  note?: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LoginCredentials {
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
