"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const analyticsService_1 = require("../services/analyticsService");
const router = express_1.default.Router();
const analyticsService = new analyticsService_1.AnalyticsService();
// Get download statistics
router.get('/:packageId/downloads', auth_1.authMiddleware, async (req, res) => {
    try {
        const { packageId } = req.params;
        const { startDate, endDate, granularity = 'day' } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({
                code: 1001,
                message: 'Start date and end date are required',
                data: null,
                timestamp: Date.now(),
                requestId: req.headers['x-request-id'] || 'unknown'
            });
        }
        const analytics = await analyticsService.getDownloadStats(packageId, startDate, endDate, granularity);
        const response = {
            code: 0,
            message: 'success',
            data: analytics,
            timestamp: Date.now(),
            requestId: req.headers['x-request-id'] || 'unknown'
        };
        res.json(response);
    }
    catch (error) {
        const err = error;
        res.status(500).json({
            code: 2001,
            message: err.message,
            data: null,
            timestamp: Date.now(),
            requestId: req.headers['x-request-id'] || 'unknown'
        });
    }
});
exports.default = router;
//# sourceMappingURL=analytics.js.map