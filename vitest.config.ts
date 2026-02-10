/// <reference types="vitest" />
/// <reference types="vite/client" />
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      'opentype.js': 'opentype.js/dist/opentype.module.js'
    }
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      include: ['src/**'],
      exclude: ['src/index.ts', 'src/**/index.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
});
