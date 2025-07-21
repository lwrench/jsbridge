"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    const code = err.code || err.statusCode || 2001;
    const message = err.message || 'Internal server error';
    console.error(`Error ${code}:`, message, err.stack);
    res.status(code >= 2000 ? 500 : 400).json({
        code,
        message,
        data: null,
        timestamp: Date.now(),
        requestId: req.headers['x-request-id'] || 'unknown'
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map