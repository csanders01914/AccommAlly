import prisma from './prisma';
import { randomUUID } from 'crypto';
import logger from '@/lib/logger';

interface ErrorDetails {
    message: string;
    stack?: string;
    path?: string;
    method?: string;
    statusCode?: number;
    metadata?: Record<string, any>;
    userId?: string;
}

/**
 * Logs an error to the database and returns a Transaction ID.
 */
export async function logError(error: Error | any, context?: Partial<ErrorDetails>): Promise<string> {
    const transactionId = randomUUID();

    // Extract error info
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    // Default context
    const {
        path,
        method,
        statusCode = 500,
        metadata,
        userId
    } = context || {};

    try {
        await prisma.errorLog.create({
            data: {
                transactionId,
                message,
                stack,
                path,
                method,
                statusCode,
                metadata: metadata ? JSON.stringify(metadata) : undefined,
                userId
            }
        });

        // Also log for immediate visibility in server logs
        logger.error({ transactionId }, message);

    } catch (loggingError) {
        // Fallback if DB logging fails
        logger.error({ err: loggingError }, 'FAILED TO LOG ERROR TO DB');
        logger.error({ err: error }, 'ORIGINAL ERROR');
    }

    return transactionId;
}
