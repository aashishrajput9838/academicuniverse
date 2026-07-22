/**
 * Jest configuration for backend TypeScript tests using CommonJS.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  silent: false,
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
      tsconfig: 'tsconfig.jest.json',
      },
    ],
  },
  moduleNameMapper: {
    '^uuid$': '<rootDir>/tests/mocks/uuid.cjs',
    '^dotenv$': '<rootDir>/tests/mocks/dotenv.cjs',
    '^pdf-parse$': '<rootDir>/tests/mocks/pdf-parse.cjs',
  },
};
