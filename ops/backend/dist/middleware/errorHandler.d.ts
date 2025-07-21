import { Request, Response, NextFunction } from 'express';
export interface ErrorWithCode extends Error {
    code?: number;
    statusCode?: number;
}
export declare const errorHandler: (err: ErrorWithCode, req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map