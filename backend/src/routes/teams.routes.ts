import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as teamService from '../services/team.service';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  level: z.enum(['CORPORATE', 'EXECUTIVE', 'DEPARTMENT', 'TEAM', 'INDIVIDUAL']),
  parentId: z.string().uuid().optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

// List all teams
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const teams = await teamService.getTeams(req.user!.organizationId, includeInactive);
      res.json({ success: true, data: teams });
    } catch (error) {
      next(error);
    }
  }
);

// Get team hierarchy
router.get(
  '/hierarchy',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hierarchy = await teamService.getTeamHierarchy(req.user!.organizationId);
      res.json({ success: true, data: hierarchy });
    } catch (error) {
      next(error);
    }
  }
);

// Get team by ID
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const team = await teamService.getTeamById(req.params.id, req.user!.organizationId);
      res.json({ success: true, data: team });
    } catch (error) {
      next(error);
    }
  }
);

// Create team (admin/manager only)
router.post(
  '/',
  authenticate,
  requireRole('ADMIN', 'EXECUTIVE', 'MANAGER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createTeamSchema.parse(req.body);
      const team = await teamService.createTeam(data, req.user!.organizationId);
      res.status(201).json({ success: true, data: team });
    } catch (error) {
      next(error);
    }
  }
);

// Update team
router.patch(
  '/:id',
  authenticate,
  requireRole('ADMIN', 'EXECUTIVE', 'MANAGER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = updateTeamSchema.parse(req.body);
      const team = await teamService.updateTeam(
        req.params.id,
        { ...data, parentId: data.parentId ?? undefined },
        req.user!.organizationId
      );
      res.json({ success: true, data: team });
    } catch (error) {
      next(error);
    }
  }
);

// Delete team
router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await teamService.deleteTeam(req.params.id, req.user!.organizationId);
      res.json({ success: true, message: 'Team deleted' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
