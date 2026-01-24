import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { authenticate } from '../middleware/auth';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, name } = loginSchema.parse(req.body);
    const result = await authService.loginOrCreate(email, name);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(
      data.email,
      data.password,
      data.firstName,
      data.lastName,
      data.organizationId
    );
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.getCurrentUser(req.user!.id);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
