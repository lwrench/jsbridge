"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleAuthMiddleware = exports.authMiddleware = void 0;
const crypto_1 = require("crypto");
const API_SECRET = process.env.API_SECRET || 'default-secret-key';
const authMiddleware = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const timestamp = req.headers['x-timestamp'];
    const signature = req.headers['x-signature'];
    if (!apiKey || !timestamp || !signature) {
        return res.status(401).json({
            code: 1003,
            message: 'Authentication required',
            data: null,
            timestamp: Date.now(),
            requestId: req.headers['x-request-id'] || 'unknown'
        });
    }
    // Verify timestamp (within 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const reqTime = parseInt(timestamp);
    if (Math.abs(now - reqTime) > 300) {
        return res.status(401).json({
            code: 1003,
            message: 'Request timestamp expired',
            data: null,
            timestamp: Date.now(),
            requestId: req.headers['x-request-id'] || 'unknown'
        });
    }
    // Generate expected signature
    const method = req.method;
    const url = req.originalUrl;
    const body = req.body ? JSON.stringify(req.body) : '';
    const signString = method + url + timestamp + body;
    const expectedSignature = (0, crypto_1.createHmac)('sha256', API_SECRET)
        .update(signString)
        .digest('hex');
    if (signature !== expectedSignature) {
        return res.status(401).json({
            code: 1004,
            message: 'Invalid signature',
            data: null,
            timestamp: Date.now(),
            requestId: req.headers['x-request-id'] || 'unknown'
        });
    }
    next();
};
exports.authMiddleware = authMiddleware;
// 简化的认证中间件，用于测试
const simpleAuthMiddleware = (req, res, next) => {
    const token = req.headers['authorization'];
    // 简单的 token 验证，生产环境应该使用更复杂的方案
    if (!token || !token.startsWith('Bearer ')) {
        return res.status(401).json({
            code: 1003,
            message: 'Authorization token required',
            data: null,
            timestamp: Date.now(),
            requestId: req.headers['x-request-id'] || 'unknown'
        });
    }
    const tokenValue = token.replace('Bearer ', '');
    // 为测试目的，接受任何非空的 token
    if (tokenValue === 'test-token' || tokenValue.length > 0) {
        next();
    }
    else {
        return res.status(401).json({
            code: 1004,
            message: 'Invalid token',
            data: null,
            timestamp: Date.now(),
            requestId: req.headers['x-request-id'] || 'unknown'
        });
    }
};
exports.simpleAuthMiddleware = simpleAuthMiddleware;
//# sourceMappingURL=auth.js.map