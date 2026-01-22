import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as reportService from '../services/report.service';
import { authenticate } from '../middleware/auth';

const router = Router();

// Generate quarterly report
router.get(
  '/quarterly/:quarter',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { quarter } = req.params;
      const { format } = req.query;

      // Validate quarter format
      if (!/^Q[1-4]-\d{4}$/.test(quarter)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid quarter format. Use Q1-2026 format.',
        });
      }

      const report = await reportService.generateQuarterlyReport(
        req.user!.organizationId,
        quarter
      );

      if (format === 'text') {
        const text = reportService.formatReportForPowerPoint(report);
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="OKR-Report-${quarter}.txt"`);
        return res.send(text);
      }

      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }
);

// Generate annual report
router.get(
  '/annual/:year',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const year = parseInt(req.params.year);
      const { format } = req.query;

      if (isNaN(year) || year < 2000 || year > 2100) {
        return res.status(400).json({
          success: false,
          error: 'Invalid year. Must be between 2000 and 2100.',
        });
      }

      const report = await reportService.generateAnnualReport(
        req.user!.organizationId,
        year
      );

      if (format === 'text') {
        const text = reportService.formatReportForPowerPoint(report);
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="OKR-Report-${year}.txt"`);
        return res.send(text);
      }

      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
