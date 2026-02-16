import { createUnplugin } from 'unplugin';
import { IconFontLibrary } from '@main';
import type { IIconFontLibraryOptions } from '@main';

export type UnpluginIconFontOptions = IIconFontLibraryOptions;

const DEBOUNCE_MS = 200;

const plugins = createUnplugin((options: UnpluginIconFontOptions) => {
  let library: IconFontLibrary;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  return {
    name: 'unplugin-iconfontlibrary',

    buildStart() {
      library = new IconFontLibrary(options);
      library.generateToFile();
    },

    watchChange(id) {
      if (id.endsWith('.svg')) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => library.generateToFile(), DEBOUNCE_MS);
      }
    }
  };
});

export const unplugin = plugins;
export const vitePlugin = plugins.vite;
export const webpackPlugin = plugins.webpack;
export const rollupPlugin = plugins.rollup;
export const esbuildPlugin = plugins.esbuild;
