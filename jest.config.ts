/**
 * TetraCryptPQC Jest Configuration
 * TOP SECRET//COSMIC//THAUMIEL
 */

import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  transform: {
    '^.+\\.tsx?$': ['@swc/jest'],
    '^.+\\.cairo$': '<rootDir>/tests/transforms/cairo-transform.js'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFiles: ['<rootDir>/tests/setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupAfterEnv.ts'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/contracts/**/*'
  ],
  coverageReporters: ['text', 'lcov', 'json'],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
      diagnostics: {
        warnOnly: true
      }
    }
  },
  maxWorkers: '50%',
  testTimeout: 30000,
  verbose: true
};
