import prisma from './prisma';
import { randomUUID } from 'crypto';

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

        // Also log to console for immediate visibility in server logs
        console.error(`[TX: ${transactionId}] Error:`, message);

    } catch (loggingError) {
        // Fallback if DB logging fails
        console.error('FAILED TO LOG ERROR TO DB:', loggingError);
        console.error('ORIGINAL ERROR:', error);
    }

    return transactionId;
}
