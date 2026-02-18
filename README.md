# iconfontlibrary

A Node.js utility that packs SVG icons into OTF font files with ligature support. Drop in your SVGs, get a font file and ready-to-use CSS/SCSS/JS/TS bindings. Ligatures are automatically inferred from your SVG file names.

## Installation

```bash
npm install iconfontlibrary
```

## Quick Start

```typescript
import { IconFontLibrary } from 'iconfontlibrary';

const library = new IconFontLibrary({
  familyName: 'MyIcons',
  svgDirectories: ['./icons'],
  outputDirectory: './fonts'
});

library.generateToFile();
```

This reads all `.svg` files from `./icons` and writes the following to `./fonts`:

| File                  | Description                            |
| --------------------- | -------------------------------------- |
| `MyIcons.otf`         | The font file                          |
| `MyIcons.css`         | CSS with `@font-face` and icon classes |
| `MyIcons.module.scss` | SCSS module with icon variables        |
| `MyIcons.mjs`         | ESM icon map                           |
| `MyIcons.cjs`         | CJS icon map                           |
| `MyIcons.ts`          | TypeScript icon map with types         |
| `MyIcons.json`        | JSON icon map                          |

## Bundler Plugins

This library has support for all major bundlers via [unplugin](https://github.com/unjs/unplugin). The plugins generate the font on build start and automatically regenerate when `.svg` files change (add, update, remove).

### Vite

```typescript
import { vitePlugin } from 'iconfontlibrary';

export default defineConfig({
  plugins: [
    vitePlugin({
      familyName: 'MyIcons',
      svgDirectories: ['./icons'],
      outputDirectory: './fonts'
    })
  ]
});
```

### Webpack

```typescript
import { webpackPlugin } from 'iconfontlibrary';

module.exports = {
  plugins: [
    webpackPlugin({
      familyName: 'MyIcons',
      svgDirectories: ['./icons'],
      outputDirectory: './fonts'
    })
  ]
};
```

### Rollup

```typescript
import { rollupPlugin } from 'iconfontlibrary';

export default {
  plugins: [
    rollupPlugin({
      familyName: 'MyIcons',
      svgDirectories: ['./icons'],
      outputDirectory: './fonts'
    })
  ]
};
```

### esbuild

```typescript
import { esbuildPlugin } from 'iconfontlibrary';
import esbuild from 'esbuild';

esbuild.build({
  plugins: [
    esbuildPlugin({
      familyName: 'MyIcons',
      svgDirectories: ['./icons'],
      outputDirectory: './fonts'
    })
  ]
});
```

## Options

All options are shared between `IconFontLibrary` and the bundler plugins.

| Option              | Type                 | Default                | Description                                          |
| ------------------- | -------------------- | ---------------------- | ---------------------------------------------------- |
| `familyName`        | `string`             | **required**           | Font family name                                     |
| `svgDirectories`    | `string[]`           | **required**           | Directories containing SVG files                     |
| `outputDirectory`   | `string`             | **required**           | Where to write the output files                      |
| `ascender`          | `number`             | `800`                  | Font ascender value                                  |
| `descender`         | `number`             | `-200`                 | Font descender value                                 |
| `unitsPerEm`        | `number`             | `1000`                 | Font units per em                                    |
| `styleName`         | `string`             | `'Regular'`            | Font style name                                      |
| `ligatures`         | `boolean`            | `true`                 | Enable ligature support (icon name as ligature text) |
| `recursive`         | `boolean`            | `false`                | Scan SVG directories recursively                     |
| `unicodeAssignment` | `IUnicodeAssignment` | `{ strategy: 'auto' }` | Unicode codepoint assignment strategy                |

### Unicode Assignment

By default, codepoints are auto-assigned starting from the Private Use Area (`U+E000`). You can customize the starting point or provide a manual mapping:

```typescript
// Auto-assign starting from a custom codepoint
{ strategy: 'auto', startCodePoint: 0xf000 }

// Manual mapping
{ strategy: 'manual', mapping: { home: 0xe001, search: 0xe002 } }
```

### Programmatic API

If you need the font buffer without writing to disk, use `generate()`:

```typescript
const result = library.generate();

result.fontBuffer; // ArrayBuffer — the OTF font data
result.glyphNames; // string[] — names of all generated glyphs
result.unicodeMap; // Record<string, number> — icon name → unicode codepoint
```
