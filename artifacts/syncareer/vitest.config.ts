import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    // Page-level suites mount the real workspace shell under happy-dom, which
    // costs seconds per render on shared CI hardware. The default 5s budget
    // measured the machine, not the code, so whole suites failed on load.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
