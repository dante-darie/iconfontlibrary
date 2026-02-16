import { createUnplugin } from 'unplugin';
import { IconFontLibrary } from '@main';
import type { IIconFontLibraryOptions } from '@main';

export type UnpluginIconFontOptions = IIconFontLibraryOptions;

const plugins = createUnplugin((options: UnpluginIconFontOptions) => {
  let library: IconFontLibrary;

  return {
    name: 'unplugin-iconfontlibrary',

    buildStart() {
      library = new IconFontLibrary(options);
      library.generateToFile();
    },

    watchChange(id) {
      if (id.endsWith('.svg')) {
        library.generateToFile();
      }
    }
  };
});

export const unplugin = plugins;
export const vitePlugin = plugins.vite;
export const webpackPlugin = plugins.webpack;
export const rollupPlugin = plugins.rollup;
export const esbuildPlugin = plugins.esbuild;
