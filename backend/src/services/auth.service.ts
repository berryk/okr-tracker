import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedUser } from '../types';

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { organization: true },
  });

  if (!user) {
    throw new AppError(401, 'Invalid credentials');
  }

  if (!user.passwordHash) {
    throw new AppError(401, 'SSO authentication required');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new AppError(401, 'Invalid credentials');
  }

  if (!user.isActive) {
    throw new AppError(401, 'Account is disabled');
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
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
