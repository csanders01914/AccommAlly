/**
 * Manual mock for 'jose' ESM module.
 * Implements SignJWT and jwtVerify using Node.js crypto for test isolation.
 */
import crypto from 'crypto';

class SignJWT {
    private payload: Record<string, any>;
    private protectedHeader: Record<string, any> = {};
    private expirationTime: string | undefined;

    constructor(payload: Record<string, any>) {
        this.payload = payload;
    }

    setProtectedHeader(header: Record<string, any>) {
        this.protectedHeader = header;
        return this;
    }

    setExpirationTime(time: string) {
        this.expirationTime = time;
        return this;
    }

    async sign(secret: Uint8Array): Promise<string> {
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', ...this.protectedHeader })).toString('base64url');

        // Add expiration
        const now = Math.floor(Date.now() / 1000);
        if (this.expirationTime) {
            const match = this.expirationTime.match(/^(\d+)([smhd])$/);
            if (match) {
                const val = parseInt(match[1]);
                const unit = match[2];
                const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
                this.payload.exp = now + val * (multipliers[unit] || 3600);
            }
        }
        this.payload.iat = now;

        const payload = Buffer.from(JSON.stringify(this.payload)).toString('base64url');
        const data = `${header}.${payload}`;
        const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
        return `${data}.${signature}`;
    }
}

async function jwtVerify(token: string, secret: Uint8Array): Promise<{ payload: Record<string, any> }> {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token');

    const [header, payload, signature] = parts;
    const data = `${header}.${payload}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('base64url');

    if (signature !== expectedSig) {
        throw new Error('Invalid signature');
    }

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());

    // Check expiration
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired');
    }

    return { payload: decoded };
}

export { SignJWT, jwtVerify };
