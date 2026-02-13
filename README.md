# iconfontlibrary

A Node.js utility that packs SVG icons into OTF font files with ligature support.

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

// Generate and write to file
library.generateToFile();
```

This reads all `.svg` files from `./icons`, converts them into font glyphs, and writes `MyIcons.otf` to `./fonts`.

## API

### IconFontLibrary

The main entry point. Orchestrates the full pipeline from SVG files to font output.

```typescript
const library = new IconFontLibrary(options: IIconFontLibraryOptions);
```

#### Options

| Option              | Type                 | Default                | Description                                          |
| ------------------- | -------------------- | ---------------------- | ---------------------------------------------------- |
| `familyName`        | `string`             | **required**           | Font family name                                     |
| `svgDirectories`    | `string[]`           | **required**           | Directories containing SVG files                     |
| `outputDirectory`   | `string`             | **required**           | Where to write the `.otf` file                       |
| `ascender`          | `number`             | `800`                  | Font ascender value                                  |
| `descender`         | `number`             | `-200`                 | Font descender value                                 |
| `unitsPerEm`        | `number`             | `1000`                 | Font units per em                                    |
| `styleName`         | `string`             | `'Regular'`            | Font style name                                      |
| `ligatures`         | `boolean`            | `true`                 | Enable ligature support (icon name as ligature text) |
| `recursive`         | `boolean`            | `false`                | Scan SVG directories recursively                     |
| `unicodeAssignment` | `IUnicodeAssignment` | `{ strategy: 'auto' }` | Unicode codepoint assignment strategy                |

#### Unicode Assignment

```typescript
// Auto-assign codepoints starting from a given value (default: PUA range)
{ strategy: 'auto', startCodePoint: 0xe000 }

// Manually map icon names to codepoints
{ strategy: 'manual', mapping: { home: 0xe001, search: 0xe002 } }
```

#### Methods

**`generate(): IIconFontLibraryResult`** — Generates the font and returns the result without writing to disk.

```typescript
const result = library.generate();

result.fontBuffer; // ArrayBuffer — the OTF font data
result.glyphNames; // string[] — names of all generated glyphs
result.unicodeMap; // Record<string, number> — icon name to unicode codepoint mapping
```

**`generateToFile(): void`** — Generates the font and writes it to `{outputDirectory}/{familyName}.otf`.

### Individual Pipeline Components

Each stage of the pipeline is also exported for advanced use cases.

#### SvgLoader

Finds and reads SVG files from directories.

```typescript
const loader = new SvgLoader({ directoryPaths: ['./icons'], recursive: true });
const files = loader.load();
// [{ fileName: 'home', filePath: '/abs/path/home.svg', fileContent: '<svg>...</svg>' }]
```

#### SvgParser

Parses an SVG string into geometric shapes (lines, cubic/quadratic bezier curves).

Supports: `<path>`, `<rect>`, `<circle>`, `<ellipse>`, `<line>`, `<polygon>`, `<polyline>`, and `<g>` groups with cascading transforms.

```typescript
const parser = new SvgParser();
const { shapes, viewBox } = parser.parse(svgContent);
```

#### SvgNormalizer

Transforms shapes from SVG coordinate space (Y-down) to font coordinate space (Y-up), scaling to fit within the font's ascender/descender range.

```typescript
const normalizer = new SvgNormalizer();
const { shapes, advanceWidth } = normalizer.normalize(parsedShapes, {
  ascender: 800,
  descender: -200,
  unitsPerEm: 1000,
  viewBox
});
```

#### SvgWindingCorrector

Removes duplicate decorative layers (gradient backgrounds, shadows) and handles shape winding analysis.

```typescript
const corrector = new SvgWindingCorrector();
const cleanedShapes = corrector.correct(shapes);
```

#### SvgOpentypeTransformer

Converts normalized shapes into opentype.js glyphs and fonts with GSUB ligature substitution.

```typescript
const transformer = new SvgOpentypeTransformer();

const glyph = transformer.createGlyph({
  name: 'home',
  unicode: 0xe000,
  normalizedData: { advanceWidth: 800, shapes: normalizedShapes },
  ligature: 'home'
});

const font = transformer.createFont(glyphs, definitions, {
  familyName: 'MyIcons',
  styleName: 'Regular',
  ascender: 800,
  descender: -200,
  unitsPerEm: 1000
});
```

## How It Works

```
SVG files → SvgLoader → SvgParser → SvgNormalizer → SvgOpentypeTransformer → OTF font
```

1. **Load** — Reads `.svg` files from specified directories
2. **Parse** — Converts SVG markup into geometric primitives (lines, bezier curves) grouped into shapes
3. **Normalize** — Flips Y-axis, scales to font units, removes duplicate layers
4. **Transform** — Builds opentype.js glyphs with ligature substitution tables and assembles the font

## License

MIT
