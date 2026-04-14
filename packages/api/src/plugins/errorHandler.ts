// Error Handler Plugin - Standardized API error handling

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

// Custom error classes
export class ApiError extends Error {
    statusCode: number;
    code?: string;

    constructor(message: string, statusCode: number, code?: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'ApiError';
    }
}

export class NotFoundError extends ApiError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends ApiError {
    constructor(message = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
        this.name = 'ForbiddenError';
    }
}

export class ValidationError extends ApiError {
    constructor(message = 'Validation failed') {
        super(message, 400, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
    }
}

export class ConflictError extends ApiError {
    constructor(message = 'Conflict') {
        super(message, 409, 'CONFLICT');
        this.name = 'ConflictError';
    }
}

// Error handler plugin
async function errorHandlerPlugin(fastify: FastifyInstance) {
    fastify.setErrorHandler(async (error: Error, request: FastifyRequest, reply: FastifyReply) => {
        // Log error for debugging
        request.log.error(error);

        // Handle custom ApiError
        if (error instanceof ApiError) {
            return reply.status(error.statusCode).send({
                error: error.message,
                code: error.code,
                statusCode: error.statusCode
            });
        }

        // Handle JWT errors
        if (error.name === 'UnauthorizedError' || error.message?.includes('jwt')) {
            return reply.status(401).send({
                error: 'Unauthorized',
                code: 'UNAUTHORIZED',
                statusCode: 401
            });
        }

        // Handle Fastify validation errors
        if ((error as any).validation) {
            return reply.status(400).send({
                error: 'Validation failed',
                code: 'VALIDATION_ERROR',
                statusCode: 400,
                details: (error as any).validation
            });
        }

        // Default to internal server error
        return reply.status(500).send({
            error: 'Internal Server Error',
            code: 'INTERNAL_ERROR',
            statusCode: 500
        });
    });
}

export default fp(errorHandlerPlugin, {
    name: 'error-handler'
});
