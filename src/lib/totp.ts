
import { authenticator } from '@otplib/preset-default';

export const generateSecret = (email: string) => {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(email, 'AccommAlly', secret);
    return { secret, otpauth };
};

export const verifyToken = (token: string, secret: string) => {
    try {
        return authenticator.verify({ token, secret });
    } catch (e) {
        return false;
    }
};

export const generateRecoveryCodes = () => {
    return Array.from({ length: 10 }, () =>
        Math.random().toString(36).substring(2, 10).toUpperCase()
    );
};
