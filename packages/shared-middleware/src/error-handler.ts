/**
 * Global Error Handler Middleware
 */
import { Request, Response, NextFunction } from 'express';
import { AppError } from '@sustainpro/shared-utils';

interface ErrorResponse {
    success: false;
    error: string;
    code?: string;
    errors?: Array<{ field: string; message: string }>;
    stack?: string;
}

/**
 * Express error handling middleware
 */
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err);

    // Handle known operational errors
    if (err instanceof AppError) {
        const response: ErrorResponse = {
            success: false,
            error: err.message,
            code: err.code,
        };

        // Include validation errors if present
        if ('errors' in err) {
            response.errors = (err as any).errors;
        }

        res.status(err.statusCode).json(response);
        return;
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        res.status(401).json({
            success: false,
            error: 'Invalid token',
            code: 'INVALID_TOKEN',
        });
        return;
    }

    if (err.name === 'TokenExpiredError') {
        res.status(401).json({
            success: false,
            error: 'Token expired',
            code: 'TOKEN_EXPIRED',
        });
        return;
    }

    // Handle unexpected errors
    const response: ErrorResponse = {
        success: false,
        error: 'Internal server error',
    };

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
        response.error = err.message;
    }

    res.status(500).json(response);
};

/**
 * 404 Not Found Handler
 */
export const notFoundHandler = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.path} not found`,
        code: 'ROUTE_NOT_FOUND',
    });
};
