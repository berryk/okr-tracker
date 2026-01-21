import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

export async function getTeams(organizationId: string, includeInactive = false) {
  const teams = await prisma.team.findMany({
    where: {
      organizationId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    include: {
      parent: { select: { id: true, name: true } },
      _count: {
        select: { members: true, goals: true, children: true },
      },
    },
    orderBy: [{ level: 'asc' }, { name: 'asc' }],
  });

  return teams;
}

export async function getTeamById(teamId: string, organizationId: string) {
  const team = await prisma.team.findFirst({
    where: { id: teamId, organizationId },
    include: {
      parent: { select: { id: true, name: true, level: true } },
      children: { select: { id: true, name: true, level: true } },
      members: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
          avatarUrl: true,
          role: true,
        },
      },
      goals: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          owner: { select: { id: true, firstName: true, lastName: true } },
          measures: true,
        },
      },
    },
  });

  if (!team) {
    throw new AppError(404, 'Team not found');
  }

  return team;
}

export async function getTeamHierarchy(organizationId: string) {
  const teams = await prisma.team.findMany({
    where: { organizationId },
    include: {
      _count: { select: { members: true, goals: true } },
    },
  });

  // Build hierarchical structure
  const teamMap = new Map(teams.map((t) => [t.id, { ...t, children: [] as any[] }]));
  const rootTeams: any[] = [];

  teams.forEach((team) => {
    const teamNode = teamMap.get(team.id)!;
    if (team.parentId) {
      const parent = teamMap.get(team.parentId);
      if (parent) {
        parent.children.push(teamNode);
      }
    } else {
      rootTeams.push(teamNode);
    }
  });

  return rootTeams;
}

export async function createTeam(
  data: {
    name: string;
    description?: string;
    level: string;
    parentId?: string;
  },
  organizationId: string
) {
  // Verify parent exists if provided
  if (data.parentId) {
    const parent = await prisma.team.findFirst({
      where: { id: data.parentId, organizationId },
    });
    if (!parent) {
      throw new AppError(404, 'Parent team not found');
    }
  }

  const team = await prisma.team.create({
    data: {
      name: data.name,
      description: data.description,
      level: data.level as any,
      parentId: data.parentId,
      organizationId,
    },
    include: {
      parent: { select: { id: true, name: true } },
    },
  });

  return team;
}

export async function updateTeam(
  teamId: string,
  data: {
    name?: string;
    description?: string;
    parentId?: string;
    isActive?: boolean;
  },
  organizationId: string
) {
  const existingTeam = await prisma.team.findFirst({
    where: { id: teamId, organizationId },
  });

  if (!existingTeam) {
    throw new AppError(404, 'Team not found');
  }

  // Prevent circular reference
  if (data.parentId === teamId) {
    throw new AppError(400, 'Team cannot be its own parent');
  }

  const team = await prisma.team.update({
    where: { id: teamId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.parentId !== undefined && { parentId: data.parentId }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    include: {
      parent: { select: { id: true, name: true } },
    },
  });

  return team;
}

export async function deleteTeam(teamId: string, organizationId: string) {
  const team = await prisma.team.findFirst({
    where: { id: teamId, organizationId },
    include: {
      _count: { select: { members: true, goals: true, children: true } },
    },
  });

  if (!team) {
    throw new AppError(404, 'Team not found');
  }

  if (team._count.children > 0) {
    throw new AppError(400, 'Cannot delete team with child teams');
  }

  if (team._count.members > 0) {
    throw new AppError(400, 'Cannot delete team with members');
  }

  if (team._count.goals > 0) {
    throw new AppError(400, 'Cannot delete team with goals');
  }

  await prisma.team.delete({
    where: { id: teamId },
  });
}
