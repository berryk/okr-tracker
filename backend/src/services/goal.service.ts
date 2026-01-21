import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { CreateGoalInput, UpdateGoalInput } from '../types';
import { GoalStatus } from '@prisma/client';

export async function getGoals(
  organizationId: string,
  options: {
    quarter?: string;
    teamId?: string;
    ownerId?: string;
    status?: GoalStatus;
    page?: number;
    limit?: number;
  }
) {
  const { quarter, teamId, ownerId, status, page = 1, limit = 20 } = options;

  const where = {
    team: { organizationId },
    ...(quarter && { quarter }),
    ...(teamId && { teamId }),
    ...(ownerId && { ownerId }),
    ...(status && { status }),
  };

  const [goals, total] = await Promise.all([
    prisma.goal.findMany({
      where,
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        team: {
          select: { id: true, name: true, level: true },
        },
        measures: true,
        _count: { select: { childLinks: true, parentLinks: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.goal.count({ where }),
  ]);

  return {
    goals,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getGoalById(goalId: string, organizationId: string) {
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      team: { organizationId },
    },
    include: {
      owner: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
      },
      team: {
        select: { id: true, name: true, level: true },
      },
      measures: {
        include: {
          updates: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
              author: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      },
      updates: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      },
      parentLinks: {
        include: {
          parentGoal: {
            select: { id: true, title: true, progress: true, status: true },
          },
        },
      },
      childLinks: {
        include: {
          childGoal: {
            select: { id: true, title: true, progress: true, status: true },
          },
        },
      },
    },
  });

  if (!goal) {
    throw new AppError(404, 'Goal not found');
  }

  return goal;
}

export async function createGoal(data: CreateGoalInput, ownerId: string) {
  const team = await prisma.team.findUnique({
    where: { id: data.teamId },
  });

  if (!team) {
    throw new AppError(404, 'Team not found');
  }

  const goal = await prisma.goal.create({
    data: {
      title: data.title,
      description: data.description,
      quarter: data.quarter,
      year: data.year,
      teamId: data.teamId,
      ownerId,
      isStretch: data.isStretch || false,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      status: 'DRAFT',
    },
    include: {
      owner: {
        select: { id: true, firstName: true, lastName: true },
      },
      team: {
        select: { id: true, name: true, level: true },
      },
    },
  });

  return goal;
}

export async function updateGoal(
  goalId: string,
  data: UpdateGoalInput,
  organizationId: string
) {
  const existingGoal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      team: { organizationId },
    },
  });

  if (!existingGoal) {
    throw new AppError(404, 'Goal not found');
  }

  const goal = await prisma.goal.update({
    where: { id: goalId },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status && { status: data.status as GoalStatus }),
      ...(data.progress !== undefined && { progress: data.progress }),
      ...(data.isStretch !== undefined && { isStretch: data.isStretch }),
      ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
    },
    include: {
      owner: {
        select: { id: true, firstName: true, lastName: true },
      },
      team: {
        select: { id: true, name: true, level: true },
      },
      measures: true,
    },
  });

  return goal;
}

export async function deleteGoal(goalId: string, organizationId: string) {
  const existingGoal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      team: { organizationId },
    },
  });

  if (!existingGoal) {
    throw new AppError(404, 'Goal not found');
  }

  await prisma.goal.delete({
    where: { id: goalId },
  });
}

export async function linkGoals(
  parentGoalId: string,
  childGoalId: string,
  contributionWeight: number,
  organizationId: string
) {
  // Verify both goals exist and belong to the same organization
  const [parentGoal, childGoal] = await Promise.all([
    prisma.goal.findFirst({
      where: { id: parentGoalId, team: { organizationId } },
    }),
    prisma.goal.findFirst({
      where: { id: childGoalId, team: { organizationId } },
    }),
  ]);

  if (!parentGoal || !childGoal) {
    throw new AppError(404, 'One or both goals not found');
  }

  if (parentGoalId === childGoalId) {
    throw new AppError(400, 'Cannot link a goal to itself');
  }

  const link = await prisma.goalLink.upsert({
    where: {
      parentGoalId_childGoalId: { parentGoalId, childGoalId },
    },
    update: { contributionWeight },
    create: { parentGoalId, childGoalId, contributionWeight },
  });

  return link;
}

export async function unlinkGoals(
  parentGoalId: string,
  childGoalId: string,
  organizationId: string
) {
  const link = await prisma.goalLink.findFirst({
    where: {
      parentGoalId,
      childGoalId,
      parentGoal: { team: { organizationId } },
    },
  });

  if (!link) {
    throw new AppError(404, 'Link not found');
  }

  await prisma.goalLink.delete({
    where: { id: link.id },
  });
}

export async function addGoalUpdate(
  goalId: string,
  content: string,
  authorId: string,
  organizationId: string
) {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, team: { organizationId } },
  });

  if (!goal) {
    throw new AppError(404, 'Goal not found');
  }

  const update = await prisma.goalUpdate.create({
    data: {
      goalId,
      content,
      authorId,
    },
    include: {
      author: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
    },
  });

  return update;
}

interface HierarchyGoal {
  id: string;
  title: string;
  progress: number;
  status: string;
  team: { id: string; name: string; level: string };
  owner: { id: string; firstName: string; lastName: string };
  contributionWeight?: number;
}

export async function getGoalHierarchy(goalId: string, organizationId: string) {
  // Verify goal exists
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, team: { organizationId } },
    include: {
      team: { select: { id: true, name: true, level: true } },
      owner: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!goal) {
    throw new AppError(404, 'Goal not found');
  }

  // Get all ancestors (parents, grandparents, etc.)
  const ancestors: HierarchyGoal[] = [];
  await getAncestors(goalId, ancestors, organizationId);

  // Get all descendants (children, grandchildren, etc.)
  const descendants: HierarchyGoal[] = [];
  await getDescendants(goalId, descendants, organizationId);

  return {
    current: {
      id: goal.id,
      title: goal.title,
      progress: goal.progress,
      status: goal.status,
      team: goal.team,
      owner: goal.owner,
    },
    ancestors: ancestors.reverse(), // Reverse so corporate is first
    descendants,
  };
}

async function getAncestors(
  goalId: string,
  ancestors: HierarchyGoal[],
  organizationId: string,
  visited = new Set<string>()
) {
  if (visited.has(goalId)) return; // Prevent cycles
  visited.add(goalId);

  const parentLinks = await prisma.goalLink.findMany({
    where: { childGoalId: goalId },
    include: {
      parentGoal: {
        include: {
          team: { select: { id: true, name: true, level: true } },
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  for (const link of parentLinks) {
    const parent = link.parentGoal;
    ancestors.push({
      id: parent.id,
      title: parent.title,
      progress: parent.progress,
      status: parent.status,
      team: parent.team,
      owner: parent.owner,
      contributionWeight: link.contributionWeight,
    });

    // Recursively get ancestors of parent
    await getAncestors(parent.id, ancestors, organizationId, visited);
  }
}

async function getDescendants(
  goalId: string,
  descendants: HierarchyGoal[],
  organizationId: string,
  visited = new Set<string>()
) {
  if (visited.has(goalId)) return; // Prevent cycles
  visited.add(goalId);

  const childLinks = await prisma.goalLink.findMany({
    where: { parentGoalId: goalId },
    include: {
      childGoal: {
        include: {
          team: { select: { id: true, name: true, level: true } },
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  for (const link of childLinks) {
    const child = link.childGoal;
    descendants.push({
      id: child.id,
      title: child.title,
      progress: child.progress,
      status: child.status,
      team: child.team,
      owner: child.owner,
      contributionWeight: link.contributionWeight,
    });

    // Recursively get descendants of child
    await getDescendants(child.id, descendants, organizationId, visited);
  }
}

export async function getGoalsMap(organizationId: string, quarter?: string) {
  // Get all goals with their links for visualization
  const goals = await prisma.goal.findMany({
    where: {
      team: { organizationId },
      ...(quarter && { quarter }),
    },
    include: {
      team: { select: { id: true, name: true, level: true } },
      owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      measures: { select: { id: true, title: true, progress: true } },
      parentLinks: {
        select: {
          parentGoalId: true,
          contributionWeight: true,
        },
      },
      childLinks: {
        select: {
          childGoalId: true,
          contributionWeight: true,
        },
      },
    },
    orderBy: [{ team: { level: 'asc' } }, { title: 'asc' }],
  });

  // Also get all links for the visualization
  const links = await prisma.goalLink.findMany({
    where: {
      parentGoal: { team: { organizationId } },
      ...(quarter && { parentGoal: { quarter } }),
    },
    select: {
      id: true,
      parentGoalId: true,
      childGoalId: true,
      contributionWeight: true,
    },
  });

  return { goals, links };
}

export async function getAvailableParentGoals(goalId: string, organizationId: string) {
  // Get the current goal to know its team level
  const currentGoal = await prisma.goal.findFirst({
    where: { id: goalId, team: { organizationId } },
    include: { team: true },
  });

  if (!currentGoal) {
    throw new AppError(404, 'Goal not found');
  }

  // Get goals from higher-level teams that could be parents
  // Also exclude goals already linked and the current goal itself
  const existingParentIds = await prisma.goalLink.findMany({
    where: { childGoalId: goalId },
    select: { parentGoalId: true },
  });

  const excludeIds = [goalId, ...existingParentIds.map((l) => l.parentGoalId)];

  const goals = await prisma.goal.findMany({
    where: {
      id: { notIn: excludeIds },
      team: { organizationId },
      quarter: currentGoal.quarter, // Same quarter
    },
    include: {
      team: { select: { id: true, name: true, level: true } },
      owner: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ team: { level: 'asc' } }, { title: 'asc' }],
  });

  return goals;
}
