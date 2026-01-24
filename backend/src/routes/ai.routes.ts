import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as aiService from '../services/ai.service';
import { authenticate } from '../middleware/auth';

const router = Router();

const suggestGoalSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  teamId: z.string().uuid(),
});

const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ),
});

const reviewDraftMeasureSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  measureType: z.enum(['INCREASE_TO', 'DECREASE_TO', 'MAINTAIN', 'MILESTONE']),
  unit: z.string().optional(),
  startValue: z.number(),
  targetValue: z.number(),
  goalId: z.string().uuid(),
});

// Goal Writing Assistant - suggest improvements
router.post(
  '/suggest-goal',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, description, teamId } = suggestGoalSchema.parse(req.body);
      const suggestion = await aiService.suggestGoalImprovement(
        title,
        description,
        teamId,
        req.user!.organizationId
      );

      // Log interaction
      await aiService.logAIInteraction(
        req.user!.id,
        'GOAL_SUGGESTION',
        `Title: ${title}`,
        JSON.stringify(suggestion)
      );

      res.json({ success: true, data: suggestion });
    } catch (error) {
      next(error);
    }
  }
);

// Measure Quality Review (existing measure)
router.post(
  '/review-measure/:measureId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const review = await aiService.reviewMeasure(
        req.params.measureId,
        req.user!.organizationId
      );

      // Log interaction
      await aiService.logAIInteraction(
        req.user!.id,
        'MEASURE_REVIEW',
        `Measure ID: ${req.params.measureId}`,
        JSON.stringify(review),
        'Measure',
        req.params.measureId
      );

      res.json({ success: true, data: review });
    } catch (error) {
      next(error);
    }
  }
);

// Review Draft Measure (before saving)
router.post(
  '/review-draft-measure',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = reviewDraftMeasureSchema.parse(req.body);
      const review = await aiService.reviewDraftMeasure(
        data,
        req.user!.organizationId
      );

      // Log interaction
      await aiService.logAIInteraction(
        req.user!.id,
        'MEASURE_REVIEW',
        `Draft: ${data.title}`,
        JSON.stringify(review)
      );

      res.json({ success: true, data: review });
    } catch (error) {
      next(error);
    }
  }
);

// Alignment Suggestions
router.get(
  '/suggest-alignment/:goalId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const suggestions = await aiService.suggestAlignment(
        req.params.goalId,
        req.user!.organizationId
      );

      // Log interaction
      await aiService.logAIInteraction(
        req.user!.id,
        'ALIGNMENT_SUGGESTION',
        `Goal ID: ${req.params.goalId}`,
        JSON.stringify(suggestions),
        'Goal',
        req.params.goalId
      );

      res.json({ success: true, data: suggestions });
    } catch (error) {
      next(error);
    }
  }
);

// Progress Summary Generator
router.get(
  '/progress-summary/:goalId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await aiService.generateProgressSummary(
        req.params.goalId,
        req.user!.organizationId
      );

      // Log interaction
      await aiService.logAIInteraction(
        req.user!.id,
        'PROGRESS_SUMMARY',
        `Goal ID: ${req.params.goalId}`,
        summary,
        'Goal',
        req.params.goalId
      );

      res.json({ success: true, data: { summary } });
    } catch (error) {
      next(error);
    }
  }
);

// Natural Language Chat
router.post(
  '/chat',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { messages } = chatSchema.parse(req.body);
      const response = await aiService.chat(messages, req.user!.organizationId);

      // Log interaction
      const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
      await aiService.logAIInteraction(
        req.user!.id,
        'CHAT',
        lastUserMessage?.content || '',
        response
      );

      res.json({ success: true, data: { response } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
