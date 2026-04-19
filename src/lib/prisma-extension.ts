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

                    const isAlreadyEncrypted = (v: string): boolean =>
                        /^[0-9a-f]{24}:[0-9a-f]{32}:/.test(v) || // GCM: 24-char IV + 32-char authTag + ciphertext
                        /^[0-9a-f]{32}:[0-9a-f]+$/.test(v);        // CBC legacy: 32-char IV + ciphertext

                    // --- WRITE OPERATIONS ---
                    if (['create', 'update', 'upsert', 'createMany'].includes(operation) && params.data) {
                        const processData = (data: DbRecord) => {
                            // User encryption
                            if (model === 'User') {
                                if (typeof data.email === 'string' && data.email.length > 0 && !isAlreadyEncrypted(data.email)) {
                                    data.emailHash = hash(data.email);
                                    data.email = encrypt(data.email);
                                }
                                if (typeof data.name === 'string' && data.name.length > 0 && !isAlreadyEncrypted(data.name)) data.name = encrypt(data.name);
                            }
                            // Case encryption
                            if (model === 'Case') {
                                if (typeof data.clientName === 'string' && data.clientName.length > 0 && !isAlreadyEncrypted(data.clientName)) data.clientName = encrypt(data.clientName);
                                if (typeof data.clientLastName === 'string' && data.clientLastName.length > 0 && !isAlreadyEncrypted(data.clientLastName)) data.clientLastName = encrypt(data.clientLastName);
                                if (typeof data.medicalCondition === 'string' && data.medicalCondition.length > 0 && !isAlreadyEncrypted(data.medicalCondition)) data.medicalCondition = encrypt(data.medicalCondition);
                                if (typeof data.clientEmail === 'string' && data.clientEmail.length > 0 && !isAlreadyEncrypted(data.clientEmail)) {
                                    data.clientEmailHash = hash(data.clientEmail);
                                    data.clientEmail = encrypt(data.clientEmail);
                                }
                                if (typeof data.clientPhone === 'string' && data.clientPhone.length > 0 && !isAlreadyEncrypted(data.clientPhone)) {
                                    data.clientPhoneHash = hash(data.clientPhone);
                                    data.clientPhone = encrypt(data.clientPhone);
                                }
                                if (typeof data.description === 'string' && data.description.length > 0 && !isAlreadyEncrypted(data.description)) data.description = encrypt(data.description);
                                // Note: 'reason' is part of description in current route logic, but if adding field, handle it.
                                // Currently 'reason' is not in schema directly separately (it's concatenated).
                            }
                            // Note encryption
                            if (model === 'Note') {
                                if (typeof data.content === 'string' && data.content.length > 0 && !isAlreadyEncrypted(data.content)) data.content = encrypt(data.content);
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
                                if (typeof data.oldValue === 'string' && data.oldValue.length > 0 && !isAlreadyEncrypted(data.oldValue)) data.oldValue = encrypt(data.oldValue);
                                if (typeof data.newValue === 'string' && data.newValue.length > 0 && !isAlreadyEncrypted(data.newValue)) data.newValue = encrypt(data.newValue);
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

                    const decryptUser = (user: DbRecord | null | undefined): void => {
                        if (!user || typeof user !== 'object') return;
                        if (typeof user.email === 'string') user.email = safeDecrypt(user.email, 'email', 'User');
                        if (typeof user.name === 'string') user.name = safeDecrypt(user.name, 'name', 'User');
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
                            decryptUser(item.createdBy as DbRecord);
                            if (Array.isArray(item.tasks)) {
                                (item.tasks as DbRecord[]).forEach(task => {
                                    decryptUser(task.assignedTo as DbRecord);
                                    decryptUser(task.createdBy as DbRecord);
                                });
                            }
                            if (Array.isArray(item.notes)) {
                                (item.notes as DbRecord[]).forEach(note => {
                                    if (typeof note.content === 'string') note.content = safeDecrypt(note.content, 'content', 'Note');
                                    decryptUser(note.author as DbRecord);
                                });
                            }
                            if (Array.isArray(item.documents)) {
                                (item.documents as DbRecord[]).forEach(doc => {
                                    decryptUser(doc.uploadedBy as DbRecord);
                                });
                            }
                        }
                        if (model === 'Task') {
                            decryptUser(item.assignedTo as DbRecord);
                            decryptUser(item.createdBy as DbRecord);
                        }
                        if (model === 'Note') {
                            if (typeof item.content === 'string') item.content = safeDecrypt(item.content, 'content', 'Note');
                            decryptUser(item.author as DbRecord);
                        }
                        if (model === 'Document') {
                            decryptUser(item.uploadedBy as DbRecord);
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
                        if (model === 'Message') {
                            decryptUser(item.sender as DbRecord);
                            decryptUser(item.recipient as DbRecord);
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
                            decryptUser(item.user as DbRecord);
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
