// eslint-disable-next-line @typescript-eslint/no-var-requires
const opentype = require('opentype.js');
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ErrorHandler } from 'error-handler';
import { IconFontLibrary } from './IconFontLibrary';
import type { IIconFontLibraryOptions } from './IconFontLibrary.types';

const SIMPLE_SQUARE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100"/></svg>';
const SIMPLE_CIRCLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"/></svg>';
const COMPLEX_MULTI_SUBPATH_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/></svg>';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'icon-font-test-'));
}

function cleanupTempDir(dirPath: string): void {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function createDefaultOptions(svgDir: string, outputDir: string): IIconFontLibraryOptions {
  return {
    familyName: 'TestIcons',
    outputDirectory: outputDir,
    svgDirectories: [svgDir],
  };
}

describe('IconFontLibrary', () => {
  let svgDir: string;
  let outputDir: string;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    svgDir = createTempDir();
    outputDir = createTempDir();
    warnSpy = vi.spyOn(ErrorHandler, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanupTempDir(svgDir);
    cleanupTempDir(outputDir);
    warnSpy.mockRestore();
  });

  describe('constructor defaults', () => {
    it('should use default ascender, descender, unitsPerEm, styleName, and ligatures', () => {
      fs.writeFileSync(path.join(svgDir, 'icon.svg'), SIMPLE_SQUARE_SVG);

      const library = new IconFontLibrary(createDefaultOptions(svgDir, outputDir));
      const result = library.generate();

      const font = opentype.parse(result.fontBuffer);

      expect(font.ascender).toBe(800);
      expect(font.descender).toBe(-200);
      expect(font.unitsPerEm).toBe(1000);
      expect(font.names.fontSubfamily.en).toBe('Regular');
    });

    it('should allow overriding ascender, descender, unitsPerEm, and styleName', () => {
      fs.writeFileSync(path.join(svgDir, 'icon.svg'), SIMPLE_SQUARE_SVG);

      const library = new IconFontLibrary({
        ...createDefaultOptions(svgDir, outputDir),
        ascender: 900,
        descender: -100,
        styleName: 'Bold',
        unitsPerEm: 2048,
      });
      const result = library.generate();

      const font = opentype.parse(result.fontBuffer);

      expect(font.ascender).toBe(900);
      expect(font.descender).toBe(-100);
      expect(font.unitsPerEm).toBe(2048);
      expect(font.names.fontSubfamily.en).toBe('Bold');
    });
  });

  describe('generate', () => {
    it('should generate a valid font from a single SVG', () => {
      fs.writeFileSync(path.join(svgDir, 'square.svg'), SIMPLE_SQUARE_SVG);

      const library = new IconFontLibrary(createDefaultOptions(svgDir, outputDir));
      const result = library.generate();

      expect(result.fontBuffer).toBeInstanceOf(ArrayBuffer);
      expect(result.fontBuffer.byteLength).toBeGreaterThan(0);
      expect(result.glyphNames).toEqual(['square']);
      expect(result.unicodeMap).toEqual({ square: 0xE000 });
    });

    it('should generate a font with multiple glyphs', () => {
      fs.writeFileSync(path.join(svgDir, 'circle.svg'), SIMPLE_CIRCLE_SVG);
      fs.writeFileSync(path.join(svgDir, 'square.svg'), SIMPLE_SQUARE_SVG);

      const library = new IconFontLibrary(createDefaultOptions(svgDir, outputDir));
      const result = library.generate();

      expect(result.glyphNames).toEqual(['circle', 'square']);
      expect(result.unicodeMap).toEqual({ circle: 0xE000, square: 0xE001 });
    });

    it('should sort glyphs alphabetically by file name', () => {
      fs.writeFileSync(path.join(svgDir, 'zebra.svg'), SIMPLE_SQUARE_SVG);
      fs.writeFileSync(path.join(svgDir, 'alpha.svg'), SIMPLE_CIRCLE_SVG);
      fs.writeFileSync(path.join(svgDir, 'middle.svg'), SIMPLE_SQUARE_SVG);

      const library = new IconFontLibrary(createDefaultOptions(svgDir, outputDir));
      const result = library.generate();

      expect(result.glyphNames).toEqual(['alpha', 'middle', 'zebra']);
      expect(result.unicodeMap).toEqual({
        alpha: 0xE000,
        middle: 0xE001,
        zebra: 0xE002,
      });
    });

    it('should set font family name correctly', () => {
      fs.writeFileSync(path.join(svgDir, 'icon.svg'), SIMPLE_SQUARE_SVG);

      const library = new IconFontLibrary({
        ...createDefaultOptions(svgDir, outputDir),
        familyName: 'MyCustomIcons',
      });
      const result = library.generate();

      const font = opentype.parse(result.fontBuffer);

      expect(font.names.fontFamily.en).toBe('MyCustomIcons');
    });

    it('should produce a round-trip parseable font', () => {
      fs.writeFileSync(path.join(svgDir, 'square.svg'), SIMPLE_SQUARE_SVG);

      const library = new IconFontLibrary(createDefaultOptions(svgDir, outputDir));
      const result = library.generate();

      const font = opentype.parse(result.fontBuffer);

      expect(font.numGlyphs).toBeGreaterThanOrEqual(2);
      expect(font.glyphs.get(0).name).toBe('.notdef');
    });
  });

  describe('unicode assignment', () => {
    it('should assign auto unicodes starting from 0xE000 by default', () => {
      fs.writeFileSync(path.join(svgDir, 'a.svg'), SIMPLE_SQUARE_SVG);
      fs.writeFileSync(path.join(svgDir, 'b.svg'), SIMPLE_CIRCLE_SVG);

      const library = new IconFontLibrary(createDefaultOptions(svgDir, outputDir));
      const result = library.generate();

      expect(result.unicodeMap).toEqual({ a: 0xE000, b: 0xE001 });
    });

    it('should support custom start code point for auto assignment', () => {
      fs.writeFileSync(path.join(svgDir, 'a.svg'), SIMPLE_SQUARE_SVG);
      fs.writeFileSync(path.join(svgDir, 'b.svg'), SIMPLE_CIRCLE_SVG);

      const library = new IconFontLibrary({
        ...createDefaultOptions(svgDir, outputDir),
        unicodeAssignment: { startCodePoint: 0xF000, strategy: 'auto' },
      });
      const result = library.generate();

      expect(result.unicodeMap).toEqual({ a: 0xF000, b: 0xF001 });
    });

    it('should support manual unicode assignment', () => {
      fs.writeFileSync(path.join(svgDir, 'icon-a.svg'), SIMPLE_SQUARE_SVG);
      fs.writeFileSync(path.join(svgDir, 'icon-b.svg'), SIMPLE_CIRCLE_SVG);

      const library = new IconFontLibrary({
        ...createDefaultOptions(svgDir, outputDir),
        unicodeAssignment: {
          mapping: { 'icon-a': 0xE100, 'icon-b': 0xE200 },
          strategy: 'manual',
        },
      });
      const result = library.generate();

      expect(result.unicodeMap).toEqual({ 'icon-a': 0xE100, 'icon-b': 0xE200 });
    });

    it('should handle error for manual mode with no mapping provided', () => {
      const handleSpy = vi.spyOn(ErrorHandler, 'handle').mockImplementation(() => {});
      fs.writeFileSync(path.join(svgDir, 'icon.svg'), SIMPLE_SQUARE_SVG);

      const library = new IconFontLibrary({
        ...createDefaultOptions(svgDir, outputDir),
        unicodeAssignment: { strategy: 'manual' },
      });

      const result = library.generate();

      expect(result).toBeUndefined();
      expect(handleSpy).toHaveBeenCalledTimes(1);
      handleSpy.mockRestore();
    });

    it('should handle error for unmapped files in manual mode', () => {
      const handleSpy = vi.spyOn(ErrorHandler, 'handle').mockImplementation(() => {});
      fs.writeFileSync(path.join(svgDir, 'mapped.svg'), SIMPLE_SQUARE_SVG);
      fs.writeFileSync(path.join(svgDir, 'unmapped.svg'), SIMPLE_CIRCLE_SVG);

      const library = new IconFontLibrary({
        ...createDefaultOptions(svgDir, outputDir),
        unicodeAssignment: {
          mapping: { mapped: 0xE000 },
          strategy: 'manual',
        },
      });

      const result = library.generate();

      expect(result).toBeUndefined();
      expect(handleSpy).toHaveBeenCalledTimes(1);
      handleSpy.mockRestore();
    });
  });

  describe('ligatures', () => {
    it('should enable ligatures by default', () => {
      fs.writeFileSync(path.join(svgDir, 'home.svg'), SIMPLE_SQUARE_SVG);

      const library = new IconFontLibrary(createDefaultOptions(svgDir, outputDir));
      const result = library.generate();

      const font = opentype.parse(result.fontBuffer);

      // With ligatures, there should be .notdef + character glyphs + icon glyph
      // "home" has 4 unique characters (h, o, m, e), so: 1 + 4 + 1 = 6 glyphs
      expect(font.numGlyphs).toBe(6);
    });

    it('should skip ligatures when disabled', () => {
      fs.writeFileSync(path.join(svgDir, 'home.svg'), SIMPLE_SQUARE_SVG);

      const library = new IconFontLibrary({
        ...createDefaultOptions(svgDir, outputDir),
        ligatures: false,
      });
      const result = library.generate();

      const font = opentype.parse(result.fontBuffer);

      // Without ligatures: .notdef + icon glyph = 2
      expect(font.numGlyphs).toBe(2);
    });
  });

  describe('error handling', () => {
    let handleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      handleSpy = vi.spyOn(ErrorHandler, 'handle').mockImplementation(() => {});
    });

    afterEach(() => {
      handleSpy.mockRestore();
    });

    it('should handle error when no SVG files found', () => {
      const library = new IconFontLibrary(createDefaultOptions(svgDir, outputDir));

      const result = library.generate();

      expect(result).toBeUndefined();
      expect(handleSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle error for non-existent SVG directory', () => {
      const fakePath = path.join(svgDir, 'nonexistent');

      const library = new IconFontLibrary({
        ...createDefaultOptions(svgDir, outputDir),
        svgDirectories: [fakePath],
      });

      const result = library.generate();

      expect(result).toBeUndefined();
      expect(handleSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateToFile', () => {
    it('should write an OTF file to the output directory', () => {
      fs.writeFileSync(path.join(svgDir, 'icon.svg'), SIMPLE_SQUARE_SVG);

      const library = new IconFontLibrary(createDefaultOptions(svgDir, outputDir));
      library.generateToFile();

      const outputPath = path.join(outputDir, 'TestIcons.otf');
      expect(fs.existsSync(outputPath)).toBe(true);

      const fileContent = fs.readFileSync(outputPath);
      expect(fileContent.length).toBeGreaterThan(0);
    });

    it('should derive output file name from familyName', () => {
      fs.writeFileSync(path.join(svgDir, 'icon.svg'), SIMPLE_SQUARE_SVG);

      const library = new IconFontLibrary({
        ...createDefaultOptions(svgDir, outputDir),
        familyName: 'CustomFont',
      });
      library.generateToFile();

      expect(fs.existsSync(path.join(outputDir, 'CustomFont.otf'))).toBe(true);
    });

    it('should create output directory if it does not exist', () => {
      fs.writeFileSync(path.join(svgDir, 'icon.svg'), SIMPLE_SQUARE_SVG);
      const nestedOutput = path.join(outputDir, 'nested', 'deep');

      const library = new IconFontLibrary({
        ...createDefaultOptions(svgDir, outputDir),
        outputDirectory: nestedOutput,
      });
      library.generateToFile();

      expect(fs.existsSync(path.join(nestedOutput, 'TestIcons.otf'))).toBe(true);
    });

    it('should produce a valid OTF that can be parsed back', () => {
      fs.writeFileSync(path.join(svgDir, 'icon.svg'), SIMPLE_SQUARE_SVG);

      const library = new IconFontLibrary(createDefaultOptions(svgDir, outputDir));
      library.generateToFile();

      const outputPath = path.join(outputDir, 'TestIcons.otf');
      const buffer = fs.readFileSync(outputPath);
      const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));

      expect(font.names.fontFamily.en).toBe('TestIcons');
    });
  });

  describe('end-to-end with complex multi-subpath SVG', () => {
    it('should generate a valid font from complex multi-subpath SVG', () => {
      fs.writeFileSync(path.join(svgDir, 'testicon.svg'), COMPLEX_MULTI_SUBPATH_SVG);

      const library = new IconFontLibrary(createDefaultOptions(svgDir, outputDir));
      const result = library.generate();

      const font = opentype.parse(result.fontBuffer);

      expect(font.names.fontFamily.en).toBe('TestIcons');
      expect(result.glyphNames).toEqual(['testicon']);
      expect(result.unicodeMap).toEqual({ testicon: 0xE000 });

      // With ligatures for "testicon" — unique chars: t,e,s,i,c,o,n = 7 unique chars
      // .notdef + 7 char glyphs + 1 icon glyph = 9
      expect(font.numGlyphs).toBe(9);

      const lastGlyph = font.glyphs.get(font.numGlyphs - 1);
      expect(lastGlyph.name).toBe('testicon');
      expect(lastGlyph.unicode).toBe(0xE000);
      expect(lastGlyph.advanceWidth).toBeGreaterThan(0);
    });

    it('should generate a font file from complex multi-subpath SVG', () => {
      fs.writeFileSync(path.join(svgDir, 'testicon.svg'), COMPLEX_MULTI_SUBPATH_SVG);

      const library = new IconFontLibrary(createDefaultOptions(svgDir, outputDir));
      library.generateToFile();

      const outputPath = path.join(outputDir, 'TestIcons.otf');
      expect(fs.existsSync(outputPath)).toBe(true);

      const buffer = fs.readFileSync(outputPath);
      const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));

      expect(font.names.fontFamily.en).toBe('TestIcons');
      expect(font.numGlyphs).toBeGreaterThan(1);
    });
  });
});
