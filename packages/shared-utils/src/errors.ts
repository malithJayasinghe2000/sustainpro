/**
 * Custom error classes for consistent error handling across services
 */

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly code?: string;

    constructor(
        statusCode: number,
        message: string,
        isOperational = true,
        code?: string
    ) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.code = code;

        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string, id?: string) {
        const message = id
            ? `${resource} with id '${id}' not found`
            : `${resource} not found`;
        super(404, message, true, 'NOT_FOUND');
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(401, message, true, 'UNAUTHORIZED');
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(403, message, true, 'FORBIDDEN');
    }
}

export class BadRequestError extends AppError {
    constructor(message: string) {
        super(400, message, true, 'BAD_REQUEST');
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(409, message, true, 'CONFLICT');
    }
}

export class ValidationError extends AppError {
    public readonly errors: Array<{ field: string; message: string }>;

    constructor(errors: Array<{ field: string; message: string }>) {
        super(400, 'Validation failed', true, 'VALIDATION_ERROR');
        this.errors = errors;
    }
}

export class ServiceUnavailableError extends AppError {
    constructor(service: string) {
        super(503, `${service} is temporarily unavailable`, true, 'SERVICE_UNAVAILABLE');
    }
}
