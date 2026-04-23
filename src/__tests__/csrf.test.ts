/**
 * @jest-environment node
 */
import { generateCsrfToken, validateCsrf } from '@/lib/csrf';

// Helper to create a mock NextRequest
function createMockRequest(
 method: string,
 cookieToken?: string,
 headerToken?: string
): any {
 return {
 method,
 cookies: {
 get: (name: string) => cookieToken ? { value: cookieToken } : undefined,
 },
 headers: {
 get: (name: string) => {
 if (name === 'x-csrf-token') return headerToken || null;
 return null;
 },
 },
 };
}

describe('CSRF Module', () => {
 describe('generateCsrfToken', () => {
 it('should generate a 64-char hex string (32 bytes)', () => {
 const token = generateCsrfToken();
 expect(token.length).toBe(64);
 expect(/^[a-f0-9]+$/.test(token)).toBe(true);
 });

 it('should generate unique tokens', () => {
 const tokens = new Set(Array.from({ length: 100 }, () => generateCsrfToken()));
 expect(tokens.size).toBe(100);
 });
 });

 describe('validateCsrf', () => {
 it('should allow GET requests without CSRF token', () => {
 const req = createMockRequest('GET');
 const result = validateCsrf(req);
 expect(result.valid).toBe(true);
 });

 it('should allow HEAD requests without CSRF token', () => {
 const req = createMockRequest('HEAD');
 expect(validateCsrf(req).valid).toBe(true);
 });

 it('should allow OPTIONS requests without CSRF token', () => {
 const req = createMockRequest('OPTIONS');
 expect(validateCsrf(req).valid).toBe(true);
 });

 it('should reject POST without CSRF cookie', () => {
 const req = createMockRequest('POST', undefined, 'some-token');
 const result = validateCsrf(req);
 expect(result.valid).toBe(false);
 expect(result.error).toContain('cookie');
 });

 it('should reject POST without CSRF header', () => {
 const req = createMockRequest('POST', 'some-token', undefined);
 const result = validateCsrf(req);
 expect(result.valid).toBe(false);
 expect(result.error).toContain('header');
 });

 it('should reject POST when tokens do not match', () => {
 const req = createMockRequest('POST', 'token-a', 'token-b');
 const result = validateCsrf(req);
 expect(result.valid).toBe(false);
 expect(result.error).toContain('mismatch');
 });

 it('should accept POST when tokens match', () => {
 const token = generateCsrfToken();
 const req = createMockRequest('POST', token, token);
 const result = validateCsrf(req);
 expect(result.valid).toBe(true);
 });

 it('should validate PATCH requests', () => {
 const token = generateCsrfToken();
 const req = createMockRequest('PATCH', token, token);
 expect(validateCsrf(req).valid).toBe(true);
 });

 it('should validate DELETE requests', () => {
 const token = generateCsrfToken();
 const req = createMockRequest('DELETE', token, token);
 expect(validateCsrf(req).valid).toBe(true);
 });

 it('should reject tokens of different lengths', () => {
 const req = createMockRequest('POST', 'short', 'much-longer-token-value');
 const result = validateCsrf(req);
 expect(result.valid).toBe(false);
 });
 });
});
