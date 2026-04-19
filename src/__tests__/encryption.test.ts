import { encrypt, decrypt, hash, encryptBuffer, decryptBuffer } from '@/lib/encryption';

describe('Encryption Module', () => {
    const testText = 'Hello, this is sensitive PII data!';
    const testTextAlt = 'Another piece of data with special chars: @#$%^&*()';

    describe('encrypt / decrypt', () => {
        it('should encrypt and decrypt text correctly', () => {
            const encrypted = encrypt(testText);
            expect(encrypted).not.toBe(testText);
            expect(encrypted).toContain(':'); // GCM format has colons

            const decrypted = decrypt(encrypted);
            expect(decrypted).toBe(testText);
        });

        it('should produce different ciphertexts for the same input (random IV)', () => {
            const enc1 = encrypt(testText);
            const enc2 = encrypt(testText);
            expect(enc1).not.toBe(enc2);
        });

        it('should handle empty strings', () => {
            expect(encrypt('')).toBe('');
            expect(decrypt('')).toBe('');
        });

        it('should handle null/undefined gracefully', () => {
            expect(encrypt(null as any)).toBeFalsy();
            expect(decrypt(null as any)).toBeFalsy();
        });

        it('should handle special characters', () => {
            const decrypted = decrypt(encrypt(testTextAlt));
            expect(decrypted).toBe(testTextAlt);
        });

        it('should handle Unicode text', () => {
            const unicode = '日本語テスト 🔐 données sensibles';
            const decrypted = decrypt(encrypt(unicode));
            expect(decrypted).toBe(unicode);
        });

        it('should produce GCM format (iv:authTag:ciphertext)', () => {
            const encrypted = encrypt(testText);
            const parts = encrypted.split(':');
            expect(parts.length).toBe(3);
            expect(parts[0].length).toBe(24); // 12-byte IV = 24 hex chars
            expect(parts[1].length).toBe(32); // 16-byte auth tag = 32 hex chars
        });

        it('should return original text if decryption fails', () => {
            const corrupted = 'not-valid-encrypted-data';
            expect(decrypt(corrupted)).toBe(corrupted);
        });
    });

    describe('Legacy CBC backwards compatibility', () => {
        it('should decrypt legacy CBC format (32-hex-char IV)', () => {
            // Simulate legacy CBC format by creating one with the old algorithm
            const crypto = require('crypto');
            const keyHex = process.env.ENCRYPTION_KEY!;
            const key = Buffer.from(keyHex, 'hex');
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
            let encrypted = cipher.update(testText, 'utf8');
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            const legacyCiphertext = iv.toString('hex') + ':' + encrypted.toString('hex');

            // decrypt() should auto-detect CBC format and decrypt correctly
            const decrypted = decrypt(legacyCiphertext);
            expect(decrypted).toBe(testText);
        });
    });

    describe('hash', () => {
        it('should produce deterministic hashes', () => {
            const hash1 = hash('test@example.com');
            const hash2 = hash('test@example.com');
            expect(hash1).toBe(hash2);
        });

        it('should produce different hashes for different inputs', () => {
            const hash1 = hash('user1@example.com');
            const hash2 = hash('user2@example.com');
            expect(hash1).not.toBe(hash2);
        });

        it('should produce 64-char hex strings', () => {
            const h = hash('test');
            expect(h.length).toBe(64);
            expect(/^[a-f0-9]+$/.test(h)).toBe(true);
        });
    });

    describe('encryptBuffer / decryptBuffer', () => {
        it('should encrypt and decrypt buffers correctly', () => {
            const original = Buffer.from('Binary data for file encryption test');
            const encrypted = encryptBuffer(original);
            expect(encrypted).not.toEqual(original);
            expect(encrypted.length).toBeGreaterThan(original.length); // IV + authTag overhead

            const decrypted = decryptBuffer(encrypted);
            expect(decrypted).toEqual(original);
        });

        it('should handle small buffers', () => {
            const small = Buffer.from([0x01, 0x02, 0x03]);
            const encrypted = encryptBuffer(small);
            expect(encrypted.length).toBeGreaterThan(small.length);
            const decrypted = decryptBuffer(encrypted);
            expect(decrypted).toEqual(small);
        });
    });
});

describe('decrypt — error handling', () => {
    it('throws when given garbage that looks like GCM format', () => {
        // 24-char hex IV + colon + 32-char hex authTag + colon + garbage ciphertext
        const fakeGcm = 'a'.repeat(24) + ':' + 'b'.repeat(32) + ':' + 'c'.repeat(16);
        expect(() => decrypt(fakeGcm)).toThrow();
    });

    it('throws when given garbage that looks like CBC format', () => {
        // 32-char hex IV + colon + garbage ciphertext
        const fakeCbc = 'a'.repeat(32) + ':' + 'b'.repeat(32);
        expect(() => decrypt(fakeCbc)).toThrow();
    });

    it('returns empty string unchanged', () => {
        expect(decrypt('')).toBe('');
    });

    it('returns plaintext unchanged when format is unrecognized', () => {
        expect(decrypt('hello world')).toBe('hello world');
    });
});

describe('decryptBuffer — error handling', () => {
    it('throws when given a buffer that looks encrypted but has wrong key', () => {
        // 12-byte IV + 16-byte authTag + 1-byte ciphertext = 29+ bytes — will be treated as GCM
        const fakeEncrypted = Buffer.alloc(30, 0xab);
        expect(() => decryptBuffer(fakeEncrypted)).toThrow();
    });
});
