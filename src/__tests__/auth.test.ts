import { signToken, verifyToken, hashPassword, comparePassword } from '@/lib/auth';

describe('Auth Module', () => {
 describe('signToken / verifyToken', () => {
 it('should sign and verify a JWT token', async () => {
 const payload = { id: 'user-1', email: 'test@example.com', role: 'ADMIN', tenantId: 'tenant-1' };
 const token = await signToken(payload);

 expect(token).toBeTruthy();
 expect(typeof token).toBe('string');
 expect(token.split('.').length).toBe(3); // JWT format: header.payload.signature

 const decoded = await verifyToken(token);
 expect(decoded).toBeTruthy();
 expect(decoded.id).toBe('user-1');
 expect(decoded.email).toBe('test@example.com');
 expect(decoded.role).toBe('ADMIN');
 expect(decoded.tenantId).toBe('tenant-1');
 });

 it('should reject a tampered token', async () => {
 const token = await signToken({ id: 'user-2', email: 'a@b.com', role: 'USER', tenantId: 't1' });
 const tampered = token.slice(0, -5) + 'XXXXX';

 const result = await verifyToken(tampered);
 expect(result).toBeNull();
 });

 it('should reject a completely invalid token', async () => {
 const result = await verifyToken('not-a-jwt-token');
 expect(result).toBeNull();
 });

 it('should reject an empty string', async () => {
 const result = await verifyToken('');
 expect(result).toBeNull();
 });
 });

 describe('hashPassword / comparePassword', () => {
 it('should hash a password and verify it', async () => {
 const password = 'MySecurePassword123!';
 const hashed = await hashPassword(password);

 expect(hashed).not.toBe(password);
 expect(hashed.startsWith('$2')).toBe(true); // bcrypt prefix

 const isMatch = await comparePassword(password, hashed);
 expect(isMatch).toBe(true);
 });

 it('should reject an incorrect password', async () => {
 const hashed = await hashPassword('correct-password');
 const isMatch = await comparePassword('wrong-password', hashed);
 expect(isMatch).toBe(false);
 });

 it('should produce different hashes for the same password (salt)', async () => {
 const hash1 = await hashPassword('same-password');
 const hash2 = await hashPassword('same-password');
 expect(hash1).not.toBe(hash2);

 // But both should verify correctly
 expect(await comparePassword('same-password', hash1)).toBe(true);
 expect(await comparePassword('same-password', hash2)).toBe(true);
 });
 });
});
