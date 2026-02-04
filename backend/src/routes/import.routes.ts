import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { pptxUpload } from '../middleware/upload';
import { extractOKRsFromPPTX } from '../services/pptx-import.service';
import * as goalService from '../services/goal.service';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Schema for creating OKRs from extracted data
const createFromPPTXSchema = z.object({
  teamId: z.string().uuid(),
  ownerId: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  okrs: z.array(z.object({
    objective: z.object({
      title: z.string().min(1).max(200),
      description: z.string().optional(),
    }),
    keyResults: z.array(z.object({
      title: z.string().min(1).max(200),
      measureType: z.enum(['INCREASE_TO', 'DECREASE_TO', 'MAINTAIN', 'MILESTONE']),
      targetValue: z.number(),
      unit: z.string().optional(),
      startValue: z.number().optional(),
    })).optional(),
  })).min(1),
});

/**
 * POST /api/import/pptx/analyze
 * Upload and analyze a PowerPoint file to extract OKRs
 */
router.post(
  '/pptx/analyze',
  authenticate,
  pptxUpload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError(400, 'No file uploaded');
      }

      const result = await extractOKRsFromPPTX(
        req.file.buffer,
        req.user!.id
      );

      if (result.extractedOKRs.length === 0 && result.warnings.length > 0) {
        // Return success but with warnings indicating no OKRs found
        res.json({
          success: true,
          data: result,
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      // Handle multer errors
      if (error instanceof Error) {
        if (error.message.includes('Invalid file type')) {
          return next(new AppError(400, error.message));
        }
        if (error.message.includes('File too large')) {
          return next(new AppError(413, 'File too large. Maximum size is 10MB.'));
        }
      }
      next(error);
    }
  }
);

/**
 * POST /api/import/pptx/create
 * Create OKRs from reviewed/edited extracted data
 */
router.post(
  '/pptx/create',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createFromPPTXSchema.parse(req.body);

      // Transform extracted OKRs to bulk import format
      const goals = data.okrs.map((okr) => ({
        title: okr.objective.title,
        description: okr.objective.description,
        measures: okr.keyResults?.map((kr) => ({
          title: kr.title,
          measureType: kr.measureType,
          targetValue: kr.targetValue,
          unit: kr.unit,
          startValue: kr.startValue,
        })),
      }));

      // Use existing bulk import functionality
      const createdGoals = await goalService.bulkImportGoals(
        goals,
        data.teamId,
        data.ownerId,
        data.year,
        req.user!.organizationId
      );

      res.status(201).json({
        success: true,
        data: createdGoals,
        count: createdGoals.length,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(400, 'Validation error: ' + error.errors.map(e => e.message).join(', ')));
      }
      next(error);
    }
  }
);

export default router;
