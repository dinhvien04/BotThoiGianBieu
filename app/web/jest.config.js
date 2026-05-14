const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: '<rootDir>/jest.environment.js',
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
  roots: ['<rootDir>/src', '<rootDir>/../../test/web'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^../../../app/web/src/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/components/dashboard/ErrorStates.tsx',
    'src/components/dashboard/Sidebar.tsx',
    'src/components/dashboard/Toast.tsx',
    'src/lib/mock-data.ts',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/../../test/web/**/*.test.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 10,
      statements: 10,
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
