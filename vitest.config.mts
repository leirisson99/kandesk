import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(import.meta.dirname, 'src/shared'),
      '@application': resolve(import.meta.dirname, 'src/application'),
      '@infrastructure': resolve(import.meta.dirname, 'src/infrastructure'),
    },
  },
  test: { include: ['src/**/*.test.ts', 'extension/**/*.test.js'] },
});
