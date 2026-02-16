import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import handlebars from '@yoichiro/vite-plugin-handlebars';

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [tsconfigPaths(), handlebars() as any],
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
      exclude: ['src/index.ts', 'src/**/index.ts', 'src/plugins.ts', 'src/**/*.hbs', 'src/types/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
});
