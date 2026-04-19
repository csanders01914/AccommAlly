import { Prisma } from '@prisma/client';
import { encrypt, decrypt, hash, encryptBuffer, decryptBuffer } from './encryption';
import logger from '@/lib/logger';

type DbRecord = Record<string, unknown>;

type OperationArgs = {
    data?: DbRecord | DbRecord[];
    where?: DbRecord;
    [key: string]: unknown;
};

export const encryptionExtension = Prisma.defineExtension((client) => {
    return client.$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }: {
                    model: string;
                    operation: string;
                    args: OperationArgs;
                    query: (args: OperationArgs) => Promise<unknown>;
                }) {
                    const params = args;
                    // --- WRITE OPERATIONS ---
                    if (['create', 'update', 'upsert', 'createMany'].includes(operation) && params.data) {
                        const processData = (data: DbRecord) => {
                            // User encryption
                            if (model === 'User') {
                                if (typeof data.email === 'string' && !/^[0-9a-f]{24}:[0-9a-f]{32}:/.test(data.email)) {
                                    data.emailHash = hash(data.email);
                                    data.email = encrypt(data.email);
                                }
                                if (typeof data.name === 'string' && !/^[0-9a-f]{24}:[0-9a-f]{32}:/.test(data.name)) data.name = encrypt(data.name);
                            }
                            // Case encryption
                            if (model === 'Case') {
                                if (typeof data.clientName === 'string' && !/^[0-9a-f]{24}:[0-9a-f]{32}:/.test(data.clientName)) data.clientName = encrypt(data.clientName);
                                if (typeof data.clientLastName === 'string' && !/^[0-9a-f]{24}:[0-9a-f]{32}:/.test(data.clientLastName)) data.clientLastName = encrypt(data.clientLastName);
                                if (typeof data.medicalCondition === 'string' && !/^[0-9a-f]{24}:[0-9a-f]{32}:/.test(data.medicalCondition)) data.medicalCondition = encrypt(data.medicalCondition);
                                if (typeof data.clientEmail === 'string' && !/^[0-9a-f]{24}:[0-9a-f]{32}:/.test(data.clientEmail)) {
                                    data.clientEmailHash = hash(data.clientEmail);
                                    data.clientEmail = encrypt(data.clientEmail);
                                }
                                if (typeof data.clientPhone === 'string' && !/^[0-9a-f]{24}:[0-9a-f]{32}:/.test(data.clientPhone)) {
                                    data.clientPhoneHash = hash(data.clientPhone);
                                    data.clientPhone = encrypt(data.clientPhone);
                                }
                                if (typeof data.description === 'string' && !/^[0-9a-f]{24}:[0-9a-f]{32}:/.test(data.description)) data.description = encrypt(data.description);
                                // Note: 'reason' is part of description in current route logic, but if adding field, handle it.
                                // Currently 'reason' is not in schema directly separately (it's concatenated).
                            }
                            // Note encryption
                            if (model === 'Note') {
                                if (typeof data.content === 'string' && !/^[0-9a-f]{24}:[0-9a-f]{32}:/.test(data.content)) data.content = encrypt(data.content);
                            }
                            // Document encryption
                            if (model === 'Document') {
                                if (data.fileData != null) {
                                    // Ensure strictly Buffer for encryption
                                    const buf = Buffer.isBuffer(data.fileData) ? data.fileData : Buffer.from(data.fileData as Buffer);
                                    // Basic check for already encrypted buffer (starts with 16 bytes IV)
                                    // It's harder to check buffer idempotency perfectly without attempting decrypt,
                                    // but we assume if it's Buffer it might be raw.
                                    // Since fileData is binary, we might skip idempotency check or rely on context.
                                    // For now, let's keep it as is, or check if it matches structure?
                                    // Encrypted buffer: 16 bytes IV + N bytes data.
                                    // If we re-encrypt, we prepend 16 bytes IV.
                                    // Let's assume binary files won't trigger double encryption easily via JSON data flow.
                                    data.fileData = encryptBuffer(buf);
                                }
                            }
                            // AuditLog encryption
                            if (model === 'AuditLog') {
                                if (typeof data.oldValue === 'string' && !/^[0-9a-f]{24}:[0-9a-f]{32}:/.test(data.oldValue)) data.oldValue = encrypt(data.oldValue);
                                if (typeof data.newValue === 'string' && !/^[0-9a-f]{24}:[0-9a-f]{32}:/.test(data.newValue)) data.newValue = encrypt(data.newValue);
                            }
                            // MessageAttachment encryption
                            if (model === 'MessageAttachment') {
                                if (data.data != null) {
                                    const buf = Buffer.isBuffer(data.data) ? data.data : Buffer.from(data.data as Buffer);
                                    data.data = encryptBuffer(buf);
                                }
                            }
                        };

                        if (Array.isArray(params.data)) {
                            params.data.forEach(processData);
                        } else {
                            processData(params.data);
                        }
                    }

                    // --- READ OPERATIONS (Search mapping) ---
                    if (['findUnique', 'findFirst', 'findMany', 'count', 'groupBy'].includes(operation) && params.where) {
                        // ... existing search logic ...
                        const processWhere = (where: DbRecord) => {
                            if (model === 'User') {
                                if (typeof where.email === 'string') {
                                    where.emailHash = hash(where.email);
                                    delete where.email;
                                }
                            }
                            if (model === 'Case') {
                                if (typeof where.clientEmail === 'string') {
                                    where.clientEmailHash = hash(where.clientEmail);
                                    delete where.clientEmail;
                                }
                                if (typeof where.clientPhone === 'string') {
                                    where.clientPhoneHash = hash(where.clientPhone);
                                    delete where.clientPhone;
                                }
                            }
                        };
                        processWhere(params.where);
                    }

                    const result = await query(params);

                    // --- DECRYPT RESULTS ---
                    const safeDecrypt = (value: string, field: string, modelName: string): string => {
                        try {
                            return decrypt(value);
                        } catch (e) {
                            logger.error({ err: e, model: modelName, field }, '[encryption] Failed to decrypt field');
                            return '[decryption error]';
                        }
                    };

                    const decryptItem = (item: DbRecord | null): DbRecord | null => {
                        if (!item) return item;

                        if (model === 'User') {
                            if (typeof item.email === 'string') item.email = safeDecrypt(item.email, 'email', 'User');
                            if (typeof item.name === 'string') item.name = safeDecrypt(item.name, 'name', 'User');
                        }
                        if (model === 'Case') {
                            if (typeof item.clientName === 'string') item.clientName = safeDecrypt(item.clientName, 'clientName', 'Case');
                            if (typeof item.clientLastName === 'string') item.clientLastName = safeDecrypt(item.clientLastName, 'clientLastName', 'Case');
                            if (typeof item.medicalCondition === 'string') item.medicalCondition = safeDecrypt(item.medicalCondition, 'medicalCondition', 'Case');
                            if (typeof item.clientEmail === 'string') item.clientEmail = safeDecrypt(item.clientEmail, 'clientEmail', 'Case');
                            if (typeof item.clientPhone === 'string') item.clientPhone = safeDecrypt(item.clientPhone, 'clientPhone', 'Case');
                            if (typeof item.description === 'string') item.description = safeDecrypt(item.description, 'description', 'Case');
                        }
                        if (model === 'Note') {
                            if (typeof item.content === 'string') item.content = safeDecrypt(item.content, 'content', 'Note');
                        }
                        if (model === 'Document') {
                            if (item.fileData) {
                                try {
                                    const buf = Buffer.isBuffer(item.fileData) ? item.fileData : Buffer.from(item.fileData as Buffer);
                                    item.fileData = decryptBuffer(buf);
                                } catch (e) {
                                    logger.error({ err: e }, '[encryption] Failed to decrypt Document.fileData');
                                    item.fileData = null;
                                }
                            }
                        }
                        if (model === 'MessageAttachment') {
                            if (item.data) {
                                try {
                                    const buf = Buffer.isBuffer(item.data) ? item.data : Buffer.from(item.data as Buffer);
                                    item.data = decryptBuffer(buf);
                                } catch (e) {
                                    logger.error({ err: e }, '[encryption] Failed to decrypt MessageAttachment.data');
                                    item.data = null;
                                }
                            }
                        }
                        if (model === 'AuditLog') {
                            if (typeof item.oldValue === 'string' && !item.oldValue.startsWith('{')) item.oldValue = safeDecrypt(item.oldValue, 'oldValue', 'AuditLog');
                            if (typeof item.newValue === 'string' && !item.newValue.startsWith('{')) item.newValue = safeDecrypt(item.newValue, 'newValue', 'AuditLog');

                            // Recursively decrypt included relations
                            // The type of item.user is not strictly known here, but if it was included in query, it's an object.
                            if (item.user && typeof item.user === 'object' && item.user !== null) {
                                const user = item.user as DbRecord;
                                if (typeof user.email === 'string') user.email = safeDecrypt(user.email, 'email', 'User');
                                if (typeof user.name === 'string') user.name = safeDecrypt(user.name, 'name', 'User');
                            }
                        }
                        return item;
                    };

                    if (Array.isArray(result)) {
                        return (result as DbRecord[]).map(decryptItem);
                    }
                    return decryptItem(result as DbRecord | null);
                },
            },
        },
    });
});
