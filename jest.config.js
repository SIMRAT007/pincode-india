/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/example/'],
  collectCoverageFrom: ['src/**/*.ts', '!src/NativePincodeIndia.ts'],
  coverageReporters: ['text', 'lcov'],
};
