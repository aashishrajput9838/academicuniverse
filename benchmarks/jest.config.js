/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: './tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'evaluators/**/*.ts',
    'metrics/**/*.ts',
    'statistics/**/*.ts',
    'ground-truth/**/*.ts',
    'exporters/**/*.ts',
    'logging/**/*.ts',
  ],
  coverageReporters: ['text', 'lcov'],
};
