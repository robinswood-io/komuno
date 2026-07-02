import { beforeAll } from 'vitest';

// Set dummy DATABASE_URL for tests
beforeAll(() => {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
  }
});

// Suppress console errors during tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      args[0]?.toString().includes('DATABASE_URL') ||
      args[0]?.toString().includes('database')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});
