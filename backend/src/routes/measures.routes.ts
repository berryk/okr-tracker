import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as measureService from '../services/measure.service';
import { authenticate } from '../middleware/auth';

const router = Router();

const createMeasureSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  year: z.number().int().min(2020).max(2100),  // Annual key result
  measureType: z.enum(['INCREASE_TO', 'DECREASE_TO', 'MAINTAIN', 'MILESTONE']),
  unit: z.string().optional(),
  startValue: z.number().optional(),
  targetValue: z.number(),
  goalId: z.string().uuid(),
});

const updateMeasureSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  currentValue: z.number().optional(),
  targetValue: z.number().optional(),
});

const recordUpdateSchema = z.object({
  value: z.number(),
  note: z.string().optional(),
});

// Create measure
router.post(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createMeasureSchema.parse(req.body);
      const measure = await measureService.createMeasure(data, req.user!.organizationId);
      res.status(201).json({ success: true, data: measure });
    } catch (error) {
      next(error);
    }
  }
);

// Update measure
router.patch(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = updateMeasureSchema.parse(req.body);
      const measure = await measureService.updateMeasure(
        req.params.id,
        data,
        req.user!.organizationId
      );
      res.json({ success: true, data: measure });
    } catch (error) {
      next(error);
    }
  }
);

// Delete measure
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await measureService.deleteMeasure(req.params.id, req.user!.organizationId);
      res.json({ success: true, message: 'Measure deleted' });
    } catch (error) {
      next(error);
    }
  }
);

// Record progress update
router.post(
  '/:id/updates',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { value, note } = recordUpdateSchema.parse(req.body);
      const update = await measureService.recordMeasureUpdate(
        req.params.id,
        value,
        note,
        req.user!.id,
        req.user!.organizationId
      );
      res.status(201).json({ success: true, data: update });
    } catch (error) {
      next(error);
    }
  }
);

// Get measure history
router.get(
  '/:id/history',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const history = await measureService.getMeasureHistory(
        req.params.id,
        req.user!.organizationId
      );
      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
