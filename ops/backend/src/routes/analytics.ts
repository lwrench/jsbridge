import express, { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { AnalyticsService } from '../services/analyticsService';
import { ApiResponse } from '../types/api';

const router: Router = express.Router();
const analyticsService = new AnalyticsService();

// Get download statistics
router.get('/:packageId/downloads', authMiddleware, async (req, res) => {
  try {
    const { packageId } = req.params;
    const { startDate, endDate, granularity = 'day' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        code: 1001,
        message: 'Start date and end date are required',
        data: null,
        timestamp: Date.now(),
        requestId: (req.headers['x-request-id'] as string) || 'unknown'
      });
    }

    const analytics = await analyticsService.getDownloadStats(
      packageId,
      startDate as string,
      endDate as string,
      granularity as 'day' | 'hour'
    );

    const response: ApiResponse = {
      code: 0,
      message: 'success',
      data: analytics,
      timestamp: Date.now(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown'
    };

    res.json(response);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      code: 2001,
      message: err.message,
      data: null,
      timestamp: Date.now(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown'
    });
  }
});

export default router;