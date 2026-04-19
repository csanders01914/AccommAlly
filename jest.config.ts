import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        // Mock jose with our manual implementation for tests
        '^jose$': '<rootDir>/src/__tests__/__mocks__/jose.ts',
        // Mock next/headers
        '^next/headers$': '<rootDir>/src/__tests__/__mocks__/next-headers.ts',
        // Mock next/server
        '^next/server$': '<rootDir>/src/__tests__/__mocks__/next-server.ts',
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: 'tsconfig.json',
            isolatedModules: true,
        }],
    },
    transformIgnorePatterns: ['/node_modules/'],
    setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
};

export default config;
