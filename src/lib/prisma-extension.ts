import { Prisma } from '@prisma/client';
import { encrypt, decrypt, hash, encryptBuffer, decryptBuffer } from './encryption';
import logger from '@/lib/logger';

export const encryptionExtension = Prisma.defineExtension((client: any) => {
    return client.$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }: any) {
                    const params = args as any;
                    // --- WRITE OPERATIONS ---
                    if (['create', 'update', 'upsert', 'createMany'].includes(operation) && params.data) {
                        const processData = (data: any) => {
                            // User encryption
                            if (model === 'User') {
                                if (data.email && !/^[0-9a-f]{32}:[0-9a-f]+$/.test(data.email)) {
                                    data.emailHash = hash(data.email);
                                    data.email = encrypt(data.email);
                                }
                                if (data.name && !/^[0-9a-f]{32}:[0-9a-f]+$/.test(data.name)) data.name = encrypt(data.name);
                            }
                            // Case encryption
                            if (model === 'Case') {
                                if (data.clientName && !/^[0-9a-f]{32}:[0-9a-f]+$/.test(data.clientName)) data.clientName = encrypt(data.clientName);
                                if (data.medicalCondition && !/^[0-9a-f]{32}:[0-9a-f]+$/.test(data.medicalCondition)) data.medicalCondition = encrypt(data.medicalCondition);
                                if (data.clientEmail && !/^[0-9a-f]{32}:[0-9a-f]+$/.test(data.clientEmail)) {
                                    data.clientEmailHash = hash(data.clientEmail);
                                    data.clientEmail = encrypt(data.clientEmail);
                                }
                                if (data.clientPhone && !/^[0-9a-f]{32}:[0-9a-f]+$/.test(data.clientPhone)) {
                                    data.clientPhoneHash = hash(data.clientPhone);
                                    data.clientPhone = encrypt(data.clientPhone);
                                }
                                if (data.description && !/^[0-9a-f]{32}:[0-9a-f]+$/.test(data.description)) data.description = encrypt(data.description);
                                // Note: 'reason' is part of description in current route logic, but if adding field, handle it.
                                // Currently 'reason' is not in schema directly separately (it's concatenated).
                            }
                            // Note encryption
                            if (model === 'Note') {
                                if (data.content && !/^[0-9a-f]{32}:[0-9a-f]+$/.test(data.content)) data.content = encrypt(data.content);
                            }
                            // Document encryption
                            if (model === 'Document') {
                                if (data.fileData) {
                                    // Ensure strictly Buffer for encryption
                                    const buf = Buffer.isBuffer(data.fileData) ? data.fileData : Buffer.from(data.fileData);
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
                                if (data.oldValue && !/^[0-9a-f]{32}:[0-9a-f]+$/.test(data.oldValue)) data.oldValue = encrypt(data.oldValue);
                                if (data.newValue && !/^[0-9a-f]{32}:[0-9a-f]+$/.test(data.newValue)) data.newValue = encrypt(data.newValue);
                            }
                            // MessageAttachment encryption
                            if (model === 'MessageAttachment') {
                                if (data.data) {
                                    const buf = Buffer.isBuffer(data.data) ? data.data : Buffer.from(data.data as ArrayBuffer);
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
                        const processWhere = (where: any) => {
                            if (model === 'User') {
                                if (where.email && typeof where.email === 'string') {
                                    where.emailHash = hash(where.email);
                                    delete where.email;
                                }
                            }
                            if (model === 'Case') {
                                if (where.clientEmail && typeof where.clientEmail === 'string') {
                                    where.clientEmailHash = hash(where.clientEmail);
                                    delete where.clientEmail;
                                }
                                if (where.clientPhone && typeof where.clientPhone === 'string') {
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

                    const decryptItem = (item: any) => {
                        if (!item) return item;

                        if (model === 'User') {
                            if (item.email) item.email = safeDecrypt(item.email, 'email', 'User');
                            if (item.name) item.name = safeDecrypt(item.name, 'name', 'User');
                        }
                        if (model === 'Case') {
                            if (item.clientName) item.clientName = safeDecrypt(item.clientName, 'clientName', 'Case');
                            if (item.medicalCondition) item.medicalCondition = safeDecrypt(item.medicalCondition, 'medicalCondition', 'Case');
                            if (item.clientEmail) item.clientEmail = safeDecrypt(item.clientEmail, 'clientEmail', 'Case');
                            if (item.clientPhone) item.clientPhone = safeDecrypt(item.clientPhone, 'clientPhone', 'Case');
                            if (item.description) item.description = safeDecrypt(item.description, 'description', 'Case');
                        }
                        if (model === 'Note') {
                            if (item.content) item.content = safeDecrypt(item.content, 'content', 'Note');
                        }
                        if (model === 'Document') {
                            if (item.fileData) {
                                try {
                                    const buf = Buffer.isBuffer(item.fileData) ? item.fileData : Buffer.from(item.fileData);
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
                                    const buf = Buffer.isBuffer(item.data) ? item.data : Buffer.from(item.data);
                                    item.data = decryptBuffer(buf);
                                } catch (e) {
                                    logger.error({ err: e }, '[encryption] Failed to decrypt MessageAttachment.data');
                                    item.data = null;
                                }
                            }
                        }
                        if (model === 'AuditLog') {
                            if (item.oldValue && !item.oldValue.startsWith('{')) item.oldValue = safeDecrypt(item.oldValue, 'oldValue', 'AuditLog');
                            if (item.newValue && !item.newValue.startsWith('{')) item.newValue = safeDecrypt(item.newValue, 'newValue', 'AuditLog');

                            // Recursively decrypt included relations
                            // The type of item.user is not strictly known here, but if it was included in query, it's an object.
                            if (item.user) {
                                if (item.user.email) item.user.email = safeDecrypt(item.user.email, 'email', 'User');
                                if (item.user.name) item.user.name = safeDecrypt(item.user.name, 'name', 'User');
                            }
                        }
                        return item;
                    };

                    if (Array.isArray(result)) {
                        return result.map(decryptItem);
                    }
                    return decryptItem(result);
                },
            },
        },
    });
});
