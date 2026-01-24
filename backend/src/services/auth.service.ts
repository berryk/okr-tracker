import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedUser } from '../types';

export async function loginOrCreate(email: string, name: string) {
  // Parse name into first and last
  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  // Find or create default organization
  let organization = await prisma.organization.findFirst({
    where: { slug: 'default' },
  });

  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        name: 'Default Organization',
        slug: 'default',
      },
    });
  }

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { email },
    include: { organization: true },
  });

  if (!user) {
    // Create new user
    user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        organizationId: organization.id,
      },
      include: { organization: true },
    });
  } else {
    // Update name if changed and update last login
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName,
        lastName,
        lastLoginAt: new Date(),
      },
      include: { organization: true },
    });
  }

  if (!user.isActive) {
    throw new AppError(401, 'Account is disabled');
  }

  const tokenPayload: AuthenticatedUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    organizationId: user.organizationId,
    teamId: user.teamId,
  };

  const token = jwt.sign(tokenPayload, config.jwtSecret, {
    expiresIn: '7d',
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      title: user.title,
      avatarUrl: user.avatarUrl,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
      },
    },
  };
}

export async function register(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  organizationId: string
) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError(400, 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      organizationId,
    },
    include: { organization: true },
  });

  const tokenPayload: AuthenticatedUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    organizationId: user.organizationId,
    teamId: user.teamId,
  };

  const token = jwt.sign(tokenPayload, config.jwtSecret, {
    expiresIn: '7d',
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
      },
    },
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organization: true,
      team: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    title: user.title,
    avatarUrl: user.avatarUrl,
    role: user.role,
    organization: {
      id: user.organization.id,
      name: user.organization.name,
    },
    team: user.team
      ? {
          id: user.team.id,
          name: user.team.name,
        }
      : null,
  };
}
