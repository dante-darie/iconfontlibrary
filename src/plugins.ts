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
export const vite = plugins.vite;
export const webpack = plugins.webpack;
export const rollup = plugins.rollup;
export const esbuild = plugins.esbuild;

export default plugins;
