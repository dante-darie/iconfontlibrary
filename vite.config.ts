/// <reference types="vitest" />
/// <reference types="vite/client" />
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import handlebars from '@yoichiro/vite-plugin-handlebars';

export default defineConfig({
  plugins: [tsconfigPaths(), handlebars()],
  resolve: {
    alias: {
      'opentype.js': 'opentype.js/dist/opentype.module.js'
    }
  },
  build: {
    lib: {
      entry: 'src/index.ts'
    },
    rollupOptions: {
      external: ['cheerio', 'geometric-library', 'handlebars', 'handlebars/runtime', 'opentype.js', 'unplugin', 'fs', 'path'],
      output: [
        {
          format: 'es',
          entryFileNames: '[name].mjs',
          chunkFileNames: 'shared.mjs',
          exports: 'named'
        },
        {
          format: 'cjs',
          entryFileNames: '[name].cjs',
          chunkFileNames: 'shared.cjs',
          exports: 'named'
        }
      ]
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
