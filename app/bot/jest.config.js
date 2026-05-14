module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../..',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      { tsconfig: '<rootDir>/app/bot/tsconfig.json' },
    ],
  },
  collectCoverageFrom: [
    'app/bot/src/**/*.(t|j)s',
    '!app/bot/src/main.ts',
    '!app/bot/src/**/*.module.ts',
    '!app/bot/src/**/*.entity.ts',
    '!app/bot/src/**/*.types.ts',
    '!app/bot/src/**/*.interface.ts',
  ],
  coverageDirectory: '<rootDir>/app/bot/coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/app/bot/src/', '<rootDir>/test/bot/'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/app/bot/src/$1',
  },
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testTimeout: 10000,
  verbose: true,
};
