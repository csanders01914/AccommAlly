/**
 * Test setup — provides required environment variables for tests.
 */

// Set required env vars before any module is loaded
process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-testing-purposes-1234567890';
process.env.SUPER_ADMIN_JWT_SECRET = 'test-super-admin-secret-that-is-long-enough-for-testing-1234567890';
process.env.ENCRYPTION_KEY = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
process.env.NODE_ENV = 'test';
