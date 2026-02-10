import { Line, Point, CubicBezierCurve } from 'geometric-library';
import { SvgParser } from '@svg-parser';
import type { ISvgShape } from '@svg-parser';
import { SvgNormalizer } from './SvgNormalizer';
import type { ISvgNormalizerOptions } from './SvgNormalizer.types';

const COMPLEX_MULTI_SUBPATH_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/></svg>';

const DRIBBLE_SVG = '<svg fill="#000000" height="800px" width="800px" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="-271 273 255.9 256"><path d="M-18.7,374.8c-1.7-8.2-4.2-16.2-7.5-24c-3.2-7.6-7.2-14.8-11.8-21.6c-4.6-6.8-9.8-13-15.5-18.8c-5.8-5.8-12.2-11.1-18.8-15.5c-6.8-4.6-14.2-8.6-21.6-11.8c-7.7-3.3-15.7-5.8-24-7.5c-8.4-1.7-17-2.6-25.7-2.6s-17.3,0.9-25.7,2.6c-8.2,1.7-16.2,4.2-23.9,7.5c-7.6,3.2-14.8,7.2-21.6,11.8c-6.8,4.6-13.1,9.8-18.8,15.5s-11,12.2-15.5,18.8c-4.6,6.8-8.6,14-11.8,21.6c-3.3,7.7-5.8,15.7-7.5,24c-1.7,8.4-2.6,17-2.6,25.7s0.9,17.3,2.6,25.7c1.7,8.2,4.2,16.2,7.5,23.9c3.2,7.6,7.2,14.8,11.8,21.7c4.6,6.8,9.8,13,15.5,18.8c5.8,5.8,12.2,11,18.8,15.5c6.8,4.6,14.2,8.6,21.6,11.8c7.7,3.3,15.7,5.8,23.9,7.5c8.4,1.7,17,2.6,25.7,2.6s17.2-0.9,25.7-2.6c8.2-1.7,16.2-4.2,24-7.5c7.6-3.2,14.8-7.2,21.6-11.8c6.8-4.6,13.1-9.8,18.8-15.5c5.8-5.8,11-12.2,15.5-18.8c4.6-6.8,8.6-14.1,11.8-21.7c3.3-7.7,5.8-15.7,7.5-23.9c1.7-8.4,2.6-17,2.6-25.7S-17,383.2-18.7,374.8z M-143.6,291.6c27.6,0,52.7,10.3,71.9,27.2c-0.3,0.4-15.7,24-56.9,39.4c-18.6-34.2-39.1-61.4-40.8-63.6C-161.1,292.7-152.5,291.6-143.6,291.6z M-169.9,294.8C-169.9,294.7-169.8,294.7-169.9,294.8L-169.9,294.8z M-190.1,302c1.5,1.9,21.6,29.3,40.5,62.8c-52.3,13.8-97.7,13.3-100.5,13.2C-243.2,344.3-220.5,316.3-190.1,302z M-224.7,473.2c-17.3-19.2-27.9-44.7-27.9-72.7c0-1.2,0.1-2.3,0.1-3.4c1.9,0,55.7,1.3,111.8-15.5c3.1,6.1,6.1,12.4,8.9,18.5c-1.4,0.4-2.9,0.8-4.3,1.3C-194.9,420.4-224.7,473.2-224.7,473.2z M-143.6,509.4c-25.4,0-48.5-8.7-67-23.1c0.4-0.8,21.5-45.7,85.5-68c0.2-0.1,0.5-0.2,0.7-0.2c15.3,39.8,21.6,73.1,23.2,82.7C-114.2,506.3-128.6,509.4-143.6,509.4z M-82.8,490.8c-1.1-6.6-6.9-38.5-21.2-77.8c35.2-5.6,65.7,4,67.9,4.8C-40.9,448.1-58.4,474.3-82.8,490.8z M-110.6,395.8c-0.8-1.9-1.6-3.7-2.4-5.6c-2.3-5.4-4.7-10.6-7.3-15.8c43-17.5,60.5-42.8,60.7-43.1c15.2,18.6,24.5,42.3,24.8,68.1C-36.3,399.1-73.2,391.1-110.6,395.8z"/></svg>';

const DEFAULT_OPTIONS: ISvgNormalizerOptions = {
  ascender: 800,
  descender: -200,
  unitsPerEm: 1000,
};

function createRectShape(x1: number, y1: number, x2: number, y2: number): ISvgShape {
  return {
    figures: [
      new Line([new Point([x1, y1]), new Point([x2, y1])]),
      new Line([new Point([x2, y1]), new Point([x2, y2])]),
      new Line([new Point([x2, y2]), new Point([x1, y2])]),
      new Line([new Point([x1, y2]), new Point([x1, y1])]),
    ],
    isClosed: true,
  };
}

function createSquareShapes(x: number, y: number, size: number): ISvgShape[] {
  const topLeft = new Point([x, y]);
  const topRight = new Point([x + size, y]);
  const bottomRight = new Point([x + size, y + size]);
  const bottomLeft = new Point([x, y + size]);

  const figures = [
    new Line([topLeft, topRight]),
    new Line([topRight, bottomRight]),
    new Line([bottomRight, bottomLeft]),
    new Line([bottomLeft, topLeft]),
  ];

  return [{ figures, isClosed: true }];
}

function getPointFromFigure(figure: Line | CubicBezierCurve, index: number): { x: number; y: number } {
  const values = figure.values as { x: number; y: number }[];
  return { x: values[index].x, y: values[index].y };
}

describe('SvgNormalizer', () => {
  let normalizer: SvgNormalizer;

  beforeEach(() => {
    normalizer = new SvgNormalizer();
  });

  describe('simple square normalization', () => {
    it('should scale a 100x100 square at origin to fill the font height', () => {
      const shapes = createSquareShapes(0, 0, 100);
      const result = normalizer.normalize(shapes, DEFAULT_OPTIONS);

      expect(result.advanceWidth).toBe(1000);
      expect(result.shapes).toHaveLength(1);

      // After winding correction (CW→CCW), figure order is reversed.
      // Verify all 4 corners are present at the expected scaled coordinates.
      const allPoints = result.shapes[0].figures.flatMap((fig) => {
        const vals = fig.values as { x: number; y: number }[];
        return vals.map((v) => ({ x: v.x, y: v.y }));
      });

      const xs = allPoints.map((p) => p.x);
      const ys = allPoints.map((p) => p.y);

      expect(Math.min(...xs)).toBeCloseTo(0);
      expect(Math.max(...xs)).toBeCloseTo(1000);
      expect(Math.min(...ys)).toBeCloseTo(-200);
      expect(Math.max(...ys)).toBeCloseTo(800);
    });

    it('should preserve isClosed on shapes', () => {
      const shapes = createSquareShapes(0, 0, 100);
      const result = normalizer.normalize(shapes, DEFAULT_OPTIONS);

      expect(result.shapes[0].isClosed).toBe(true);
    });
  });

  describe('non-square rectangle', () => {
    it('should normalize a tall rectangle (width < height)', () => {
      const shapes: ISvgShape[] = [{
        figures: [
          new Line([new Point([0, 0]), new Point([50, 0])]),
          new Line([new Point([50, 0]), new Point([50, 100])]),
          new Line([new Point([50, 100]), new Point([0, 100])]),
          new Line([new Point([0, 100]), new Point([0, 0])]),
        ],
        isClosed: true,
      }];

      const result = normalizer.normalize(shapes, DEFAULT_OPTIONS);

      expect(result.advanceWidth).toBe(500);
    });

    it('should normalize a wide rectangle (width > height)', () => {
      const shapes: ISvgShape[] = [{
        figures: [
          new Line([new Point([0, 0]), new Point([200, 0])]),
          new Line([new Point([200, 0]), new Point([200, 100])]),
          new Line([new Point([200, 100]), new Point([0, 100])]),
          new Line([new Point([0, 100]), new Point([0, 0])]),
        ],
        isClosed: true,
      }];

      const result = normalizer.normalize(shapes, DEFAULT_OPTIONS);

      expect(result.advanceWidth).toBe(2000);
    });
  });

  describe('non-origin figures', () => {
    it('should left-align figures that do not start at origin', () => {
      const shapes = createSquareShapes(50, 50, 100);
      const result = normalizer.normalize(shapes, DEFAULT_OPTIONS);

      const firstFigure = result.shapes[0].figures[0] as Line;
      const startPoint = getPointFromFigure(firstFigure, 0);

      expect(startPoint.x).toBeCloseTo(0);
    });
  });

  describe('Y-flip verification', () => {
    it('should flip Y coordinates (SVG top y=0 becomes font top = ascender)', () => {
      const shapes = createSquareShapes(0, 0, 100);
      const result = normalizer.normalize(shapes, DEFAULT_OPTIONS);

      const topEdgeFigure = result.shapes[0].figures[0] as Line;
      const topLeftPoint = getPointFromFigure(topEdgeFigure, 0);

      expect(topLeftPoint.y).toBeCloseTo(800);
    });

    it('should map SVG bottom (max Y) to font descender', () => {
      const shapes = createSquareShapes(0, 0, 100);
      const result = normalizer.normalize(shapes, DEFAULT_OPTIONS);

      const bottomRightFigure = result.shapes[0].figures[1] as Line;
      const endPoint = getPointFromFigure(bottomRightFigure, 1);

      expect(endPoint.y).toBeCloseTo(-200);
    });
  });

  describe('advance width calculation', () => {
    it('should compute advance width based on SVG width and scale factor', () => {
      const shapes: ISvgShape[] = [{
        figures: [
          new Line([new Point([0, 0]), new Point([448, 0])]),
          new Line([new Point([448, 0]), new Point([448, 512])]),
          new Line([new Point([448, 512]), new Point([0, 512])]),
          new Line([new Point([0, 512]), new Point([0, 0])]),
        ],
        isClosed: true,
      }];

      const result = normalizer.normalize(shapes, DEFAULT_OPTIONS);

      expect(result.advanceWidth).toBe(875);
    });
  });

  describe('error handling', () => {
    it('should throw on empty shapes array', () => {
      expect(() => normalizer.normalize([], DEFAULT_OPTIONS)).toThrow('SVG_NORMALIZER_EMPTY_INPUT');
    });

    it('should throw on zero-height bounding box', () => {
      const shapes: ISvgShape[] = [{
        figures: [
          new Line([new Point([0, 0]), new Point([100, 0])]),
        ],
        isClosed: false,
      }];

      expect(() => normalizer.normalize(shapes, DEFAULT_OPTIONS)).toThrow('SVG_NORMALIZER_ZERO_DIMENSION');
    });

    it('should throw on zero-width bounding box', () => {
      const shapes: ISvgShape[] = [{
        figures: [
          new Line([new Point([0, 0]), new Point([0, 100])]),
        ],
        isClosed: false,
      }];

      expect(() => normalizer.normalize(shapes, DEFAULT_OPTIONS)).toThrow('SVG_NORMALIZER_ZERO_DIMENSION');
    });
  });

  describe('dribble SVG integration', () => {
    it('should maintain figure connectivity for multi-subpath SVG', () => {
      const parser = new SvgParser();
      const parseResult = parser.parse(DRIBBLE_SVG);
      const result = normalizer.normalize(parseResult.shapes, DEFAULT_OPTIONS);

      expect(result.shapes.length).toBeGreaterThan(0);

      for (let s = 0; s < result.shapes.length; s++) {
        const shape = result.shapes[s];

        for (const figure of shape.figures) {
          const values = figure.values as { x: number; y: number }[];

          for (let v = 0; v < values.length; v++) {
            expect(Number.isFinite(values[v].x)).toBe(true);
            expect(Number.isFinite(values[v].y)).toBe(true);
          }
        }

        for (let i = 0; i < shape.figures.length - 1; i++) {
          const currentValues = shape.figures[i].values as { x: number; y: number }[];
          const nextValues = shape.figures[i + 1].values as { x: number; y: number }[];

          const currentEnd = currentValues[currentValues.length - 1];
          const nextStart = nextValues[0];

          expect(currentEnd.x).toBeCloseTo(nextStart.x, 5);
          expect(currentEnd.y).toBeCloseTo(nextStart.y, 5);
        }
      }
    });
  });

  describe('complex multi-subpath SVG integration', () => {
    it('should normalize parsed complex multi-subpath SVG shapes', () => {
      const parser = new SvgParser();
      const parseResult = parser.parse(COMPLEX_MULTI_SUBPATH_SVG);
      const result = normalizer.normalize(parseResult.shapes, DEFAULT_OPTIONS);

      expect(result.advanceWidth).toBeGreaterThan(0);
      expect(result.shapes.length).toBeGreaterThan(0);

      result.shapes.forEach((shape) => {
        expect(shape.figures.length).toBeGreaterThan(0);
      });
    });

    it('should produce shapes within ascender/descender bounds', () => {
      const parser = new SvgParser();
      const parseResult = parser.parse(COMPLEX_MULTI_SUBPATH_SVG);
      const result = normalizer.normalize(parseResult.shapes, DEFAULT_OPTIONS);

      for (const shape of result.shapes) {
        for (const figure of shape.figures) {
          const bbox = figure.boundingBox;
          expect(bbox.yMin).toBeGreaterThanOrEqual(-200 - 1);
          expect(bbox.yMax).toBeLessThanOrEqual(800 + 1);
          expect(bbox.xMin).toBeGreaterThanOrEqual(-1);
        }
      }
    });

    it('should maintain figure connectivity after normalization', () => {
      const parser = new SvgParser();
      const parseResult = parser.parse(COMPLEX_MULTI_SUBPATH_SVG);
      const result = normalizer.normalize(parseResult.shapes, DEFAULT_OPTIONS);

      for (const shape of result.shapes) {
        // All coordinate values should be finite numbers
        for (const figure of shape.figures) {
          const values = figure.values as { x: number; y: number }[];

          for (const point of values) {
            expect(Number.isFinite(point.x)).toBe(true);
            expect(Number.isFinite(point.y)).toBe(true);
          }
        }

        // Consecutive figures should have matching endpoints
        for (let i = 0; i < shape.figures.length - 1; i++) {
          const currentValues = shape.figures[i].values as { x: number; y: number }[];
          const nextValues = shape.figures[i + 1].values as { x: number; y: number }[];

          const currentEnd = currentValues[currentValues.length - 1];
          const nextStart = nextValues[0];

          expect(currentEnd.x).toBeCloseTo(nextStart.x, 5);
          expect(currentEnd.y).toBeCloseTo(nextStart.y, 5);
        }
      }
    });
  });

  describe('duplicate background removal before scaling', () => {
    it('should compute advance width based on icon extent, not background extent', () => {
      // 2 duplicate wide backgrounds + 1 narrower icon
      // Without fix: bbox includes backgrounds → wrong scale/advanceWidth
      // With fix: backgrounds removed first → bbox based on icon only
      const bg1 = createRectShape(0, 0, 2000, 1000);
      const bg2 = createRectShape(0, 0, 2000, 1000);
      const icon = createRectShape(500, 200, 1500, 800);

      const result = normalizer.normalize([bg1, bg2, icon], DEFAULT_OPTIONS);

      // Backgrounds removed → icon only (width=1000, height=600)
      // scaleFactor = fontHeight(1000) / svgHeight(600) = 5/3
      // advanceWidth = round(1000 * 5/3) = round(1666.67) = 1667
      expect(result.shapes).toHaveLength(1);
      expect(result.advanceWidth).toBe(1667);
    });

    it('should scale icon shapes to span full font height when backgrounds are removed', () => {
      const bg1 = createRectShape(0, 0, 1000, 1000);
      const bg2 = createRectShape(0, 0, 1000, 1000);
      const icon = createRectShape(100, 200, 900, 800);

      const result = normalizer.normalize([bg1, bg2, icon], DEFAULT_OPTIONS);

      expect(result.shapes).toHaveLength(1);

      // Collect Y and X extremes from all figures
      let minY = Infinity;
      let maxY = -Infinity;
      let minX = Infinity;

      for (const figure of result.shapes[0].figures) {
        const bbox = figure.boundingBox;
        minY = Math.min(minY, bbox.yMin);
        maxY = Math.max(maxY, bbox.yMax);
        minX = Math.min(minX, bbox.xMin);
      }

      // Icon should span full font height: descender (-200) to ascender (800)
      expect(minY).toBeCloseTo(-200);
      expect(maxY).toBeCloseTo(800);
      // Left-aligned at x=0
      expect(minX).toBeCloseTo(0);
    });

    it('should not affect normalization when no duplicates exist', () => {
      // Single shape, no duplicates → same result as before
      const shapes = createSquareShapes(0, 0, 100);
      const result = normalizer.normalize(shapes, DEFAULT_OPTIONS);

      expect(result.shapes).toHaveLength(1);
      expect(result.advanceWidth).toBe(1000);

      const allPoints = result.shapes[0].figures.flatMap((fig) => {
        const vals = fig.values as { x: number; y: number }[];
        return vals.map((v) => ({ x: v.x, y: v.y }));
      });

      const xs = allPoints.map((p) => p.x);
      const ys = allPoints.map((p) => p.y);

      expect(Math.min(...xs)).toBeCloseTo(0);
      expect(Math.max(...xs)).toBeCloseTo(1000);
      expect(Math.min(...ys)).toBeCloseTo(-200);
      expect(Math.max(...ys)).toBeCloseTo(800);
    });
  });
});
