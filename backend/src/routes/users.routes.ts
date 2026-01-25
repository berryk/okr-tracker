import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as userService from '../services/user.service';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'EXECUTIVE', 'MANAGER', 'CONTRIBUTOR']),
});

const updateTeamSchema = z.object({
  teamId: z.string().uuid().nullable(),
});

// List all users (admin only)
router.get(
  '/',
  authenticate,
  requireRole('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await userService.getUsers(req.user!.organizationId);
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }
);

// Update user role (admin only)
router.patch(
  '/:id/role',
  authenticate,
  requireRole('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role } = updateRoleSchema.parse(req.body);
      const user = await userService.updateUserRole(
        req.params.id,
        role,
        req.user!.organizationId,
        req.user!.id
      );
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
);

// Toggle user active status (admin only)
router.patch(
  '/:id/toggle-active',
  authenticate,
  requireRole('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userService.toggleUserActive(
        req.params.id,
        req.user!.organizationId,
        req.user!.id
      );
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
);

// Update user team (admin only)
router.patch(
  '/:id/team',
  authenticate,
  requireRole('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { teamId } = updateTeamSchema.parse(req.body);
      const user = await userService.updateUserTeam(
        req.params.id,
        teamId,
        req.user!.organizationId
      );
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
