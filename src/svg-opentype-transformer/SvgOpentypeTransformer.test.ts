// eslint-disable-next-line @typescript-eslint/no-var-requires
const opentype = require('opentype.js');
import { Line, Point, CubicBezierCurve, QuadraticBezierCurve } from 'geometric-library';
import { SvgParser } from '@svg-parser';
import { SvgNormalizer } from '@svg-normalizer';
import type { ISvgNormalizerResult } from '@svg-normalizer';
import { SvgOpentypeTransformer } from './SvgOpentypeTransformer';
import type { IGlyphDefinition, IFontOptions } from './SvgOpentypeTransformer.types';

const COMPLEX_MULTI_SUBPATH_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/></svg>';

const DEFAULT_FONT_OPTIONS: IFontOptions = {
  ascender: 800,
  descender: -200,
  familyName: 'TestFont',
  styleName: 'Regular',
  unitsPerEm: 1000
};

function createSimpleSquareNormalizedData(): ISvgNormalizerResult {
  return {
    advanceWidth: 1000,
    shapes: [
      {
        figures: [
          new Line([new Point([0, 800]), new Point([1000, 800])]),
          new Line([new Point([1000, 800]), new Point([1000, -200])]),
          new Line([new Point([1000, -200]), new Point([0, -200])]),
          new Line([new Point([0, -200]), new Point([0, 800])])
        ],
        isClosed: true
      }
    ]
  };
}

function createSimpleCurveNormalizedData(): ISvgNormalizerResult {
  return {
    advanceWidth: 500,
    shapes: [
      {
        figures: [new CubicBezierCurve([new Point([0, 0]), new Point([100, 200]), new Point([300, 200]), new Point([500, 0])])],
        isClosed: false
      }
    ]
  };
}

describe('SvgOpentypeTransformer', () => {
  let transformer: SvgOpentypeTransformer;

  beforeEach(() => {
    transformer = new SvgOpentypeTransformer();
  });

  describe('createPath', () => {
    it('should create a path with moveTo and lineTo for line figures', () => {
      const normalizedData = createSimpleSquareNormalizedData();
      const path = transformer.createPath(normalizedData);

      expect(path.commands).toHaveLength(6);
      expect(path.commands[0].type).toBe('M');
      expect(path.commands[1].type).toBe('L');
      expect(path.commands[2].type).toBe('L');
      expect(path.commands[3].type).toBe('L');
      expect(path.commands[4].type).toBe('L');
      expect(path.commands[5].type).toBe('Z');
    });

    it('should emit bezierCurveTo (C) for cubic bezier curves', () => {
      const normalizedData = createSimpleCurveNormalizedData();
      const path = transformer.createPath(normalizedData);

      expect(path.commands).toHaveLength(2);
      expect(path.commands[0].type).toBe('M');
      expect(path.commands[1].type).toBe('C');
    });

    it('should emit quadraticCurveTo (Q) for quadratic bezier curves', () => {
      const normalizedData: ISvgNormalizerResult = {
        advanceWidth: 500,
        shapes: [
          {
            figures: [new QuadraticBezierCurve([new Point([0, 0]), new Point([250, 400]), new Point([500, 0])])],
            isClosed: false
          }
        ]
      };
      const path = transformer.createPath(normalizedData);

      expect(path.commands).toHaveLength(2);
      expect(path.commands[0].type).toBe('M');
      expect(path.commands[1].type).toBe('Q');
    });

    it('should close path for closed shapes', () => {
      const normalizedData = createSimpleSquareNormalizedData();
      const path = transformer.createPath(normalizedData);

      const lastCommand = path.commands[path.commands.length - 1];
      expect(lastCommand.type).toBe('Z');
    });

    it('should not close path for open shapes', () => {
      const normalizedData = createSimpleCurveNormalizedData();
      const path = transformer.createPath(normalizedData);

      const lastCommand = path.commands[path.commands.length - 1];
      expect(lastCommand.type).not.toBe('Z');
    });

    it('should skip shapes with empty figures', () => {
      const normalizedData: ISvgNormalizerResult = {
        advanceWidth: 500,
        shapes: [
          { figures: [], isClosed: false },
          {
            figures: [new Line([new Point([0, 0]), new Point([100, 100])])],
            isClosed: false
          }
        ]
      };
      const path = transformer.createPath(normalizedData);

      const moveToCommands = path.commands.filter((cmd) => cmd.type === 'M');
      expect(moveToCommands).toHaveLength(1);
    });

    it('should handle multiple shapes with separate moveTo commands', () => {
      const normalizedData: ISvgNormalizerResult = {
        advanceWidth: 500,
        shapes: [
          {
            figures: [new Line([new Point([0, 0]), new Point([100, 100])])],
            isClosed: false
          },
          {
            figures: [new Line([new Point([200, 200]), new Point([300, 300])])],
            isClosed: false
          }
        ]
      };
      const path = transformer.createPath(normalizedData);

      const moveToCommands = path.commands.filter((cmd) => cmd.type === 'M');
      expect(moveToCommands).toHaveLength(2);
    });

    it('should only emit moveTo for the first figure of each shape', () => {
      const normalizedData: ISvgNormalizerResult = {
        advanceWidth: 500,
        shapes: [
          {
            figures: [new Line([new Point([0, 0]), new Point([100, 0])]), new Line([new Point([100, 0]), new Point([100, 100])])],
            isClosed: false
          }
        ]
      };
      const path = transformer.createPath(normalizedData);

      expect(path.commands).toHaveLength(3);
      expect(path.commands[0].type).toBe('M');
      expect(path.commands[1].type).toBe('L');
      expect(path.commands[2].type).toBe('L');
    });
  });

  describe('createGlyph', () => {
    it('should create a glyph with correct properties', () => {
      const definition: IGlyphDefinition = {
        name: 'test-icon',
        normalizedData: createSimpleSquareNormalizedData(),
        unicode: 0xe000
      };

      const glyph = transformer.createGlyph(definition);

      expect(glyph.name).toBe('test-icon');
      expect(glyph.unicode).toBe(0xe000);
      expect(glyph.advanceWidth).toBe(1000);
      expect(glyph.path.commands.length).toBeGreaterThan(0);
    });
  });

  describe('createFont', () => {
    it('should create a font with .notdef glyph prepended', () => {
      const definition: IGlyphDefinition = {
        name: 'test-icon',
        normalizedData: createSimpleSquareNormalizedData(),
        unicode: 0xe000
      };
      const glyph = transformer.createGlyph(definition);

      const font = transformer.createFont([glyph], [definition], DEFAULT_FONT_OPTIONS);

      expect(font.glyphs.length).toBe(2);
      expect(font.glyphs.get(0).name).toBe('.notdef');
    });

    it('should set font metadata correctly', () => {
      const definition: IGlyphDefinition = {
        name: 'test-icon',
        normalizedData: createSimpleSquareNormalizedData(),
        unicode: 0xe000
      };
      const glyph = transformer.createGlyph(definition);

      const font = transformer.createFont([glyph], [definition], DEFAULT_FONT_OPTIONS);

      expect(font.names.fontFamily.en).toBe('TestFont');
      expect(font.names.fontSubfamily.en).toBe('Regular');
      expect(font.unitsPerEm).toBe(1000);
      expect(font.ascender).toBe(800);
      expect(font.descender).toBe(-200);
    });

    it('should create character glyphs for ligature support', () => {
      const definition: IGlyphDefinition = {
        ligature: 'ab',
        name: 'test-icon',
        normalizedData: createSimpleSquareNormalizedData(),
        unicode: 0xe000
      };
      const glyph = transformer.createGlyph(definition);

      const font = transformer.createFont([glyph], [definition], DEFAULT_FONT_OPTIONS);

      expect(font.glyphs.length).toBe(4);
    });

    it('should deduplicate character glyphs across ligature definitions', () => {
      const definition1: IGlyphDefinition = {
        ligature: 'abc',
        name: 'icon-1',
        normalizedData: createSimpleSquareNormalizedData(),
        unicode: 0xe000
      };
      const definition2: IGlyphDefinition = {
        ligature: 'abd',
        name: 'icon-2',
        normalizedData: createSimpleSquareNormalizedData(),
        unicode: 0xe001
      };
      const glyph1 = transformer.createGlyph(definition1);
      const glyph2 = transformer.createGlyph(definition2);

      const font = transformer.createFont([glyph1, glyph2], [definition1, definition2], DEFAULT_FONT_OPTIONS);

      expect(font.glyphs.length).toBe(7);
    });
  });

  describe('ligature edge cases', () => {
    it('should skip ligature when icon glyph unicode does not match any glyph', () => {
      const definition: IGlyphDefinition = {
        ligature: 'test',
        name: 'test-icon',
        normalizedData: createSimpleSquareNormalizedData(),
        unicode: 0xe000
      };
      // Create glyph with a different unicode than the definition expects
      const mismatchedGlyph = transformer.createGlyph({ ...definition, unicode: 0xffff });

      // Should not throw — the mismatched glyph is silently skipped
      const font = transformer.createFont([mismatchedGlyph], [definition], DEFAULT_FONT_OPTIONS);

      expect(font).toBeDefined();
    });

    it('should skip ligature when a character glyph is missing', () => {
      const definition: IGlyphDefinition = {
        ligature: 'ab',
        name: 'test-icon',
        normalizedData: createSimpleSquareNormalizedData(),
        unicode: 0xe000
      };
      const glyph = transformer.createGlyph(definition);

      // Manually remove character glyphs by providing an empty definitions list
      // but the glyph still has the ligature — this forces the character lookup to fail
      const font = transformer.createFont([glyph], [{ ...definition, ligature: '\u{10FFFF}' }], DEFAULT_FONT_OPTIONS);

      expect(font).toBeDefined();
    });
  });

  describe('round-trip test', () => {
    it('should produce a valid font that can be parsed back', () => {
      const definition: IGlyphDefinition = {
        name: 'square',
        normalizedData: createSimpleSquareNormalizedData(),
        unicode: 0xe000
      };
      const glyph = transformer.createGlyph(definition);
      const font = transformer.createFont([glyph], [definition], DEFAULT_FONT_OPTIONS);

      const arrayBuffer = font.toArrayBuffer();
      const parsedFont = opentype.parse(arrayBuffer);

      expect(parsedFont.names.fontFamily.en).toBe('TestFont');
      expect(parsedFont.unitsPerEm).toBe(1000);
      expect(parsedFont.numGlyphs).toBe(2);
    });

    it('should preserve exact integer line coordinates through CFF round-trip', () => {
      const normalizedData: ISvgNormalizerResult = {
        advanceWidth: 500,
        shapes: [
          {
            figures: [
              new Line([new Point([10, 700]), new Point([490, 700])]),
              new Line([new Point([490, 700]), new Point([490, -100])]),
              new Line([new Point([490, -100]), new Point([10, -100])]),
              new Line([new Point([10, -100]), new Point([10, 700])])
            ],
            isClosed: true
          }
        ]
      };

      const definition: IGlyphDefinition = {
        name: 'test-rect',
        normalizedData,
        unicode: 0xe000
      };
      const glyph = transformer.createGlyph(definition);
      const font = transformer.createFont([glyph], [definition], DEFAULT_FONT_OPTIONS);

      const arrayBuffer = font.toArrayBuffer();
      const parsedFont = opentype.parse(arrayBuffer);

      const parsedGlyph = parsedFont.glyphs.get(1);
      const commands = parsedGlyph.path.commands;

      expect(commands[0]).toMatchObject({ type: 'M', x: 10, y: 700 });

      const lineCoords = commands.filter((cmd: { type: string }) => cmd.type === 'L').map((cmd: { x: number; y: number }) => ({ x: cmd.x, y: cmd.y }));

      expect(lineCoords).toContainEqual({ x: 490, y: 700 });
      expect(lineCoords).toContainEqual({ x: 490, y: -100 });
      expect(lineCoords).toContainEqual({ x: 10, y: -100 });

      expect(parsedGlyph.advanceWidth).toBe(500);
    });

    it('should preserve cubic bezier control points through CFF round-trip', () => {
      const normalizedData: ISvgNormalizerResult = {
        advanceWidth: 600,
        shapes: [
          {
            figures: [new CubicBezierCurve([new Point([50, 300]), new Point([150, 700]), new Point([450, 700]), new Point([550, 300])]), new Line([new Point([550, 300]), new Point([50, 300])])],
            isClosed: true
          }
        ]
      };

      const definition: IGlyphDefinition = {
        name: 'test-curve',
        normalizedData,
        unicode: 0xe001
      };
      const glyph = transformer.createGlyph(definition);
      const font = transformer.createFont([glyph], [definition], DEFAULT_FONT_OPTIONS);

      const arrayBuffer = font.toArrayBuffer();
      const parsedFont = opentype.parse(arrayBuffer);

      const parsedGlyph = parsedFont.glyphs.get(1);
      const commands = parsedGlyph.path.commands;

      expect(commands[0]).toMatchObject({ type: 'M', x: 50, y: 300 });

      const curveCmd = commands.find((cmd: { type: string }) => cmd.type === 'C');
      expect(curveCmd).toMatchObject({
        type: 'C',
        x: 550,
        y: 300,
        x1: 150,
        y1: 700,
        x2: 450,
        y2: 700
      });

      expect(parsedGlyph.advanceWidth).toBe(600);
    });

    it('should round-trip with complex multi-subpath SVG data', () => {
      const parser = new SvgParser();
      const normalizer = new SvgNormalizer();

      const parseResult = parser.parse(COMPLEX_MULTI_SUBPATH_SVG);
      const normalizedData = normalizer.normalize(parseResult.shapes, {
        ascender: 800,
        descender: -200,
        unitsPerEm: 1000
      });

      const definition: IGlyphDefinition = {
        ligature: 'testicon',
        name: 'testicon',
        normalizedData,
        unicode: 0xe000
      };
      const glyph = transformer.createGlyph(definition);
      const font = transformer.createFont([glyph], [definition], DEFAULT_FONT_OPTIONS);

      const arrayBuffer = font.toArrayBuffer();
      const parsedFont = opentype.parse(arrayBuffer);

      expect(parsedFont.names.fontFamily.en).toBe('TestFont');
      expect(parsedFont.numGlyphs).toBeGreaterThan(1);

      const iconGlyph = parsedFont.glyphs.get(parsedFont.numGlyphs - 1);
      expect(iconGlyph.name).toBe('testicon');
      expect(iconGlyph.unicode).toBe(0xe000);
      expect(iconGlyph.advanceWidth).toBeGreaterThan(0);
    });
  });
});
