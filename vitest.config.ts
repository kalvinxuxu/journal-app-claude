import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentMatchGlobs: [['backend/src/migration/**/*.test.ts', 'node']],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'backend/src/migration/**/*.test.ts', 'backend/src/companion/**/*.test.ts'],
    globals: true,
  },
});
