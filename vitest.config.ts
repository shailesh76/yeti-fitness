import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['packages/**/*.test.ts', 'tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@yeti/database': path.resolve(__dirname, './packages/database'),
      '@yeti/training-engine': path.resolve(__dirname, './packages/training-engine/src'),
      '@yeti/sync': path.resolve(__dirname, './packages/sync/src'),
    }
  }
});
