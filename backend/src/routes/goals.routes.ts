import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as goalService from '../services/goal.service';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

const createGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  year: z.number().int().min(2000).max(2100),  // Annual objective
  teamId: z.string().uuid(),
  isStretch: z.boolean().optional(),
  dueDate: z.string().optional(),
});

const updateGoalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'AT_RISK', 'BEHIND', 'ON_TRACK', 'COMPLETED', 'CANCELLED']).optional(),
  progress: z.number().min(0).max(100).optional(),
  isStretch: z.boolean().optional(),
  dueDate: z.string().optional(),
});

const linkGoalsSchema = z.object({
  parentGoalId: z.string().uuid(),
  childGoalId: z.string().uuid(),
  contributionWeight: z.number().min(0).max(1).default(1),
});

const addUpdateSchema = z.object({
  content: z.string().min(1),
});

const cloneGoalSchema = z.object({
  sourceGoalId: z.string().uuid(),
  targetTeamId: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  includeMeasures: z.boolean().default(true),
});

const bulkImportSchema = z.object({
  teamId: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  goals: z.array(z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    measures: z.array(z.object({
      title: z.string().min(1).max(200),
      measureType: z.enum(['INCREASE_TO', 'DECREASE_TO', 'MAINTAIN', 'MILESTONE']),
      unit: z.string().optional(),
      startValue: z.number().optional(),
      targetValue: z.number(),
    })).optional(),
  })).min(1),
});

// List goals
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { year, teamId, ownerId, status, page, limit } = req.query;
      const result = await goalService.getGoals(req.user!.organizationId, {
        year: year ? parseInt(year as string) : undefined,
        teamId: teamId as string,
        ownerId: ownerId as string,
        status: status as any,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json({ success: true, data: result.goals, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }
);

// Get all goals with links for map visualization (must be before /:id)
router.get(
  '/map',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { year } = req.query;
      const data = await goalService.getGoalsMap(
        req.user!.organizationId,
        year ? parseInt(year as string) : undefined
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

// Get goals available for cloning (must be before /:id)
router.get(
  '/templates/available',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { year } = req.query;
      const goals = await goalService.getGoalsForCloning(
        req.user!.organizationId,
        year ? parseInt(year as string) : undefined
      );
      res.json({ success: true, data: goals });
    } catch (error) {
      next(error);
    }
  }
);

// Get goal by ID
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const goal = await goalService.getGoalById(req.params.id, req.user!.organizationId);
      res.json({ success: true, data: goal });
    } catch (error) {
      next(error);
    }
  }
);

// Create goal
router.post(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createGoalSchema.parse(req.body);
      const goal = await goalService.createGoal(data, req.user!.id);
      res.status(201).json({ success: true, data: goal });
    } catch (error) {
      next(error);
    }
  }
);

// Update goal
router.patch(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = updateGoalSchema.parse(req.body);
      const goal = await goalService.updateGoal(
        req.params.id,
        data,
        req.user!.organizationId
      );
      res.json({ success: true, data: goal });
    } catch (error) {
      next(error);
    }
  }
);

// Delete goal (admin/manager only)
router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN', 'MANAGER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await goalService.deleteGoal(req.params.id, req.user!.organizationId);
      res.json({ success: true, message: 'Goal deleted' });
    } catch (error) {
      next(error);
    }
  }
);

// Link goals (alignment)
router.post(
  '/link',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = linkGoalsSchema.parse(req.body);
      const link = await goalService.linkGoals(
        data.parentGoalId,
        data.childGoalId,
        data.contributionWeight,
        req.user!.organizationId
      );
      res.status(201).json({ success: true, data: link });
    } catch (error) {
      next(error);
    }
  }
);

// Unlink goals
router.delete(
  '/link/:parentId/:childId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await goalService.unlinkGoals(
        req.params.parentId,
        req.params.childId,
        req.user!.organizationId
      );
      res.json({ success: true, message: 'Link removed' });
    } catch (error) {
      next(error);
    }
  }
);

// Add goal update/comment
router.post(
  '/:id/updates',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { content } = addUpdateSchema.parse(req.body);
      const update = await goalService.addGoalUpdate(
        req.params.id,
        content,
        req.user!.id,
        req.user!.organizationId
      );
      res.status(201).json({ success: true, data: update });
    } catch (error) {
      next(error);
    }
  }
);

// Get goal hierarchy (ancestors and descendants)
router.get(
  '/:id/hierarchy',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hierarchy = await goalService.getGoalHierarchy(
        req.params.id,
        req.user!.organizationId
      );
      res.json({ success: true, data: hierarchy });
    } catch (error) {
      next(error);
    }
  }
);

// Get available parent goals for linking
router.get(
  '/:id/available-parents',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const goals = await goalService.getAvailableParentGoals(
        req.params.id,
        req.user!.organizationId
      );
      res.json({ success: true, data: goals });
    } catch (error) {
      next(error);
    }
  }
);

// Clone a goal
router.post(
  '/clone',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = cloneGoalSchema.parse(req.body);
      const goal = await goalService.cloneGoal(
        {
          ...data,
          targetOwnerId: req.user!.id,
        },
        req.user!.organizationId
      );
      res.status(201).json({ success: true, data: goal });
    } catch (error) {
      next(error);
    }
  }
);

// Bulk import goals
router.post(
  '/bulk-import',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = bulkImportSchema.parse(req.body);
      const goals = await goalService.bulkImportGoals(
        data.goals,
        data.teamId,
        req.user!.id,
        data.year,
        req.user!.organizationId
      );
      res.status(201).json({ success: true, data: goals, count: goals.length });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
