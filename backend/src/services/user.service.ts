import prisma from '../config/database';
import { UserRole } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  teamId: string | null;
  team: { id: string; name: string } | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export async function getUsers(organizationId: string): Promise<UserListItem[]> {
  const users = await prisma.user.findMany({
    where: { organizationId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      teamId: true,
      team: { select: { id: true, name: true } },
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
  });

  return users;
}

export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  organizationId: string,
  requestingUserId: string
): Promise<UserListItem> {
  // Prevent self-demotion
  if (userId === requestingUserId) {
    throw new AppError(400, 'You cannot change your own role');
  }

  // Verify user belongs to same organization
  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  // Validate role
  const validRoles: UserRole[] = ['ADMIN', 'EXECUTIVE', 'MANAGER', 'CONTRIBUTOR'];
  if (!validRoles.includes(newRole)) {
    throw new AppError(400, 'Invalid role');
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      teamId: true,
      team: { select: { id: true, name: true } },
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return updatedUser;
}

export async function toggleUserActive(
  userId: string,
  organizationId: string,
  requestingUserId: string
): Promise<UserListItem> {
  // Prevent self-deactivation
  if (userId === requestingUserId) {
    throw new AppError(400, 'You cannot deactivate yourself');
  }

  // Verify user belongs to same organization
  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      teamId: true,
      team: { select: { id: true, name: true } },
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return updatedUser;
}

export async function updateUserTeam(
  userId: string,
  teamId: string | null,
  organizationId: string
): Promise<UserListItem> {
  // Verify user belongs to same organization
  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  // If teamId is provided, verify it belongs to the same organization
  if (teamId) {
    const team = await prisma.team.findFirst({
      where: { id: teamId, organizationId },
    });

    if (!team) {
      throw new AppError(404, 'Team not found');
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { teamId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      teamId: true,
      team: { select: { id: true, name: true } },
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return updatedUser;
}
