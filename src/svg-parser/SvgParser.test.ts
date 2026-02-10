import { CubicBezierCurve, Line, QuadraticBezierCurve } from 'geometric-library';
import { SvgParser } from './SvgParser';
import type { ISvgShape, TStandardFigure } from './SvgParser.types';

// Complex SVG with multiple closed sub-paths, smooth cubics (S), compact notation, and relative commands
const COMPLEX_MULTI_SUBPATH_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/></svg>';

function getFirstFigureStartPoint(shape: ISvgShape): { x: number; y: number } {
  const figure = shape.figures[0];
  const values = figure.values as [{ x: number; y: number }, ...unknown[]];
  return { x: values[0].x, y: values[0].y };
}

function getFigurePoints(figure: TStandardFigure): { x: number; y: number }[] {
  return (figure.values as { x: number; y: number }[]).map((p) => ({ x: p.x, y: p.y }));
}

function getLineFigureEndPoint(figure: TStandardFigure): { x: number; y: number } {
  const values = figure.values as [{ x: number; y: number }, { x: number; y: number }];
  return { x: values[1].x, y: values[1].y };
}

describe('SvgParser', () => {
  let parser: SvgParser;

  beforeEach(() => {
    parser = new SvgParser();
  });

  describe('viewBox parsing', () => {
    it('should parse a valid viewBox', () => {
      const svg = '<svg viewBox="0 0 100 200"></svg>';
      const result = parser.parse(svg);

      expect(result.viewBox).toEqual({
        height: 200,
        minX: 0,
        minY: 0,
        width: 100,
      });
    });

    it('should parse a viewBox with non-zero origin', () => {
      const svg = '<svg viewBox="10 20 300 400"></svg>';
      const result = parser.parse(svg);

      expect(result.viewBox).toEqual({
        height: 400,
        minX: 10,
        minY: 20,
        width: 300,
      });
    });

    it('should return undefined viewBox when missing', () => {
      const svg = '<svg></svg>';
      const result = parser.parse(svg);

      expect(result.viewBox).toBeUndefined();
    });

    it('should return undefined viewBox for invalid values', () => {
      const svg = '<svg viewBox="invalid"></svg>';
      const result = parser.parse(svg);

      expect(result.viewBox).toBeUndefined();
    });
  });

  describe('path element — M and L commands', () => {
    it('should parse absolute M and L commands', () => {
      const svg = '<svg><path d="M 10 20 L 30 40"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(1);
      expect(result.shapes[0].figures).toHaveLength(1);
      expect(result.shapes[0].isClosed).toBe(false);

      const figure = result.shapes[0].figures[0];
      expect(figure).toBeInstanceOf(Line);

      const startPoint = getFirstFigureStartPoint(result.shapes[0]);
      expect(startPoint.x).toBeCloseTo(10);
      expect(startPoint.y).toBeCloseTo(20);

      const endPoint = getLineFigureEndPoint(figure);
      expect(endPoint.x).toBeCloseTo(30);
      expect(endPoint.y).toBeCloseTo(40);
    });

    it('should parse relative m and l commands', () => {
      const svg = '<svg><path d="m 10 20 l 20 20"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(1);

      const startPoint = getFirstFigureStartPoint(result.shapes[0]);
      expect(startPoint.x).toBeCloseTo(10);
      expect(startPoint.y).toBeCloseTo(20);

      const endPoint = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(endPoint.x).toBeCloseTo(30);
      expect(endPoint.y).toBeCloseTo(40);
    });

    it('should treat extra coordinate pairs after M as implicit L commands', () => {
      const svg = '<svg><path d="M 0 0 10 10 20 20"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(1);
      expect(result.shapes[0].figures).toHaveLength(2);
      expect(result.shapes[0].figures[0]).toBeInstanceOf(Line);
      expect(result.shapes[0].figures[1]).toBeInstanceOf(Line);

      const firstEnd = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(firstEnd.x).toBeCloseTo(10);
      expect(firstEnd.y).toBeCloseTo(10);

      const secondEnd = getLineFigureEndPoint(result.shapes[0].figures[1]);
      expect(secondEnd.x).toBeCloseTo(20);
      expect(secondEnd.y).toBeCloseTo(20);
    });
  });

  describe('path element — H and V commands', () => {
    it('should parse absolute H command', () => {
      const svg = '<svg><path d="M 10 20 H 50"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(1);
      const figure = result.shapes[0].figures[0];
      expect(figure).toBeInstanceOf(Line);

      const endPoint = getLineFigureEndPoint(figure);
      expect(endPoint.x).toBeCloseTo(50);
      expect(endPoint.y).toBeCloseTo(20);
    });

    it('should parse relative h command', () => {
      const svg = '<svg><path d="M 10 20 h 40"/></svg>';
      const result = parser.parse(svg);

      const endPoint = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(endPoint.x).toBeCloseTo(50);
      expect(endPoint.y).toBeCloseTo(20);
    });

    it('should parse absolute V command', () => {
      const svg = '<svg><path d="M 10 20 V 60"/></svg>';
      const result = parser.parse(svg);

      const endPoint = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(endPoint.x).toBeCloseTo(10);
      expect(endPoint.y).toBeCloseTo(60);
    });

    it('should parse relative v command', () => {
      const svg = '<svg><path d="M 10 20 v 40"/></svg>';
      const result = parser.parse(svg);

      const endPoint = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(endPoint.x).toBeCloseTo(10);
      expect(endPoint.y).toBeCloseTo(60);
    });
  });

  describe('path element — C command (cubic bezier)', () => {
    it('should parse absolute C command', () => {
      const svg = '<svg><path d="M 0 0 C 10 20 30 40 50 60"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(1);
      expect(result.shapes[0].figures).toHaveLength(1);
      expect(result.shapes[0].figures[0]).toBeInstanceOf(CubicBezierCurve);
    });

    it('should parse relative c command', () => {
      const svg = '<svg><path d="M 10 10 c 10 20 30 40 50 60"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes[0].figures[0]).toBeInstanceOf(CubicBezierCurve);

      const values = result.shapes[0].figures[0].values as [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
      expect(values[0].x).toBeCloseTo(10);
      expect(values[0].y).toBeCloseTo(10);
      expect(values[3].x).toBeCloseTo(60);
      expect(values[3].y).toBeCloseTo(70);
    });
  });

  describe('path element — S command (smooth cubic bezier)', () => {
    it('should infer first control point from previous C command', () => {
      const svg = '<svg><path d="M 0 0 C 10 20 40 20 50 0 S 90 -20 100 0"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes[0].figures).toHaveLength(2);
      expect(result.shapes[0].figures[0]).toBeInstanceOf(CubicBezierCurve);
      expect(result.shapes[0].figures[1]).toBeInstanceOf(CubicBezierCurve);

      const smoothCurve = result.shapes[0].figures[1];
      const values = smoothCurve.values as [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
      expect(values[1].x).toBeCloseTo(60);
      expect(values[1].y).toBeCloseTo(-20);
    });

    it('should use current point as first control point without prior C/S', () => {
      const svg = '<svg><path d="M 50 50 S 80 80 100 50"/></svg>';
      const result = parser.parse(svg);

      const values = result.shapes[0].figures[0].values as [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
      expect(values[1].x).toBeCloseTo(50);
      expect(values[1].y).toBeCloseTo(50);
    });
  });

  describe('path element — Q command (quadratic bezier)', () => {
    it('should parse absolute Q command', () => {
      const svg = '<svg><path d="M 0 0 Q 50 100 100 0"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes[0].figures).toHaveLength(1);
      expect(result.shapes[0].figures[0]).toBeInstanceOf(QuadraticBezierCurve);
    });

    it('should parse relative q command', () => {
      const svg = '<svg><path d="M 10 10 q 40 90 90 -10"/></svg>';
      const result = parser.parse(svg);

      const values = result.shapes[0].figures[0].values as [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
      expect(values[0].x).toBeCloseTo(10);
      expect(values[0].y).toBeCloseTo(10);
      expect(values[2].x).toBeCloseTo(100);
      expect(values[2].y).toBeCloseTo(0);
    });
  });

  describe('path element — T command (smooth quadratic bezier)', () => {
    it('should infer control point from previous Q command', () => {
      const svg = '<svg><path d="M 0 0 Q 50 100 100 0 T 200 0"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes[0].figures).toHaveLength(2);
      expect(result.shapes[0].figures[1]).toBeInstanceOf(QuadraticBezierCurve);

      const smoothCurve = result.shapes[0].figures[1];
      const values = smoothCurve.values as [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
      expect(values[1].x).toBeCloseTo(150);
      expect(values[1].y).toBeCloseTo(-100);
    });

    it('should use current point as control point without prior Q/T', () => {
      const svg = '<svg><path d="M 0 0 T 100 100"/></svg>';
      const result = parser.parse(svg);

      const values = result.shapes[0].figures[0].values as [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
      expect(values[1].x).toBeCloseTo(0);
      expect(values[1].y).toBeCloseTo(0);
    });
  });

  describe('path element — A command (arc)', () => {
    it('should parse absolute A command and convert to cubic bezier curves', () => {
      const svg = '<svg><path d="M 10 80 A 25 25 0 0 1 60 80"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(1);
      expect(result.shapes[0].figures.length).toBeGreaterThanOrEqual(1);
      result.shapes[0].figures.forEach((figure) => {
        expect(figure).toBeInstanceOf(CubicBezierCurve);
      });
    });

    it('should parse relative a command', () => {
      const svg = '<svg><path d="M 10 80 a 25 25 0 0 1 50 0"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes[0].figures.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('path element — Z command (close path)', () => {
    it('should close a path back to sub-path start', () => {
      const svg = '<svg><path d="M 10 10 L 50 10 L 50 50 Z"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(1);
      expect(result.shapes[0].isClosed).toBe(true);

      const lastFigure = result.shapes[0].figures[result.shapes[0].figures.length - 1];
      const endPoint = getLineFigureEndPoint(lastFigure);
      expect(endPoint.x).toBeCloseTo(10);
      expect(endPoint.y).toBeCloseTo(10);
    });

    it('should handle Z closing to the correct sub-path start after M', () => {
      const svg = '<svg><path d="M 100 100 L 200 100 L 200 200 Z M 300 300 L 400 300 L 400 400 Z"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(2);

      const firstShapeLastFigure = result.shapes[0].figures[result.shapes[0].figures.length - 1];
      const firstClosePoint = getLineFigureEndPoint(firstShapeLastFigure);
      expect(firstClosePoint.x).toBeCloseTo(100);
      expect(firstClosePoint.y).toBeCloseTo(100);

      const secondShapeLastFigure = result.shapes[1].figures[result.shapes[1].figures.length - 1];
      const secondClosePoint = getLineFigureEndPoint(secondShapeLastFigure);
      expect(secondClosePoint.x).toBeCloseTo(300);
      expect(secondClosePoint.y).toBeCloseTo(300);
    });
  });

  describe('path element — multi-sub-path', () => {
    it('should produce separate shapes for each sub-path', () => {
      const svg = '<svg><path d="M 0 0 L 10 0 L 10 10 Z M 20 20 L 30 20 L 30 30 Z"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(2);
      expect(result.shapes[0].isClosed).toBe(true);
      expect(result.shapes[1].isClosed).toBe(true);
    });

    it('should handle unclosed sub-paths before new M', () => {
      const svg = '<svg><path d="M 0 0 L 10 10 M 20 20 L 30 30"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(2);
      expect(result.shapes[0].isClosed).toBe(false);
      expect(result.shapes[1].isClosed).toBe(false);
    });
  });

  describe('rect element', () => {
    it('should parse a rectangle into line figures', () => {
      const svg = '<svg><rect x="10" y="20" width="100" height="50"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(1);
      expect(result.shapes[0].isClosed).toBe(true);
      expect(result.shapes[0].figures).toHaveLength(4);
      result.shapes[0].figures.forEach((figure) => {
        expect(figure).toBeInstanceOf(Line);
      });
    });

    it('should parse a rect with default x and y', () => {
      const svg = '<svg><rect width="50" height="30"/></svg>';
      const result = parser.parse(svg);

      const startPoint = getFirstFigureStartPoint(result.shapes[0]);
      expect(startPoint.x).toBeCloseTo(0);
      expect(startPoint.y).toBeCloseTo(0);
    });

    it('should ignore rect with zero width or height', () => {
      const svg = '<svg><rect width="0" height="50"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(0);
    });

    it('should parse a rounded rect into lines and arcs', () => {
      const svg = '<svg><rect x="0" y="0" width="100" height="100" rx="10" ry="10"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(1);
      expect(result.shapes[0].isClosed).toBe(true);

      const hasLines = result.shapes[0].figures.some((f) => f instanceof Line);
      const hasCurves = result.shapes[0].figures.some((f) => f instanceof CubicBezierCurve);
      expect(hasLines).toBe(true);
      expect(hasCurves).toBe(true);
    });
  });

  describe('circle element', () => {
    it('should parse a circle into cubic bezier curves', () => {
      const svg = '<svg><circle cx="50" cy="50" r="25"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(1);
      expect(result.shapes[0].isClosed).toBe(true);
      expect(result.shapes[0].figures.length).toBeGreaterThanOrEqual(1);
      result.shapes[0].figures.forEach((figure) => {
        expect(figure).toBeInstanceOf(CubicBezierCurve);
      });
    });

    it('should ignore circle with zero radius', () => {
      const svg = '<svg><circle cx="50" cy="50" r="0"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(0);
    });
  });

  describe('ellipse element', () => {
    it('should parse an ellipse into cubic bezier curves', () => {
      const svg = '<svg><ellipse cx="50" cy="50" rx="40" ry="20"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(1);
      expect(result.shapes[0].isClosed).toBe(true);
      result.shapes[0].figures.forEach((figure) => {
        expect(figure).toBeInstanceOf(CubicBezierCurve);
      });
    });

    it('should ignore ellipse with zero rx or ry', () => {
      const svg = '<svg><ellipse cx="50" cy="50" rx="0" ry="20"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(0);
    });
  });

  describe('line element', () => {
    it('should parse a line element', () => {
      const svg = '<svg><line x1="10" y1="20" x2="30" y2="40"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(1);
      expect(result.shapes[0].isClosed).toBe(false);
      expect(result.shapes[0].figures).toHaveLength(1);
      expect(result.shapes[0].figures[0]).toBeInstanceOf(Line);

      const startPoint = getFirstFigureStartPoint(result.shapes[0]);
      expect(startPoint.x).toBeCloseTo(10);
      expect(startPoint.y).toBeCloseTo(20);

      const endPoint = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(endPoint.x).toBeCloseTo(30);
      expect(endPoint.y).toBeCloseTo(40);
    });
  });

  describe('polygon element', () => {
    it('should parse a polygon into line figures', () => {
      const svg = '<svg><polygon points="10,10 50,10 50,50 10,50"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(1);
      expect(result.shapes[0].isClosed).toBe(true);
      expect(result.shapes[0].figures).toHaveLength(4);
      result.shapes[0].figures.forEach((figure) => {
        expect(figure).toBeInstanceOf(Line);
      });
    });

    it('should ignore polygon with fewer than 3 points', () => {
      const svg = '<svg><polygon points="10,10 20,20"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(0);
    });
  });

  describe('polyline element', () => {
    it('should parse a polyline into line figures', () => {
      const svg = '<svg><polyline points="10,10 30,30 50,10"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(1);
      expect(result.shapes[0].isClosed).toBe(false);
      expect(result.shapes[0].figures).toHaveLength(2);
      result.shapes[0].figures.forEach((figure) => {
        expect(figure).toBeInstanceOf(Line);
      });
    });

    it('should ignore polyline with fewer than 2 points', () => {
      const svg = '<svg><polyline points="10,10"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(0);
    });
  });

  describe('g element (groups)', () => {
    it('should parse shapes inside a g element', () => {
      const svg = '<svg><g><rect x="0" y="0" width="100" height="100"/></g></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(1);
      expect(result.shapes[0].figures).toHaveLength(4);
    });

    it('should apply translate transform from g element', () => {
      const svg = '<svg><g transform="translate(50, 100)"><line x1="0" y1="0" x2="10" y2="0"/></g></svg>';
      const result = parser.parse(svg);

      const startPoint = getFirstFigureStartPoint(result.shapes[0]);
      expect(startPoint.x).toBeCloseTo(50);
      expect(startPoint.y).toBeCloseTo(100);

      const endPoint = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(endPoint.x).toBeCloseTo(60);
      expect(endPoint.y).toBeCloseTo(100);
    });

    it('should cascade transforms from nested g elements', () => {
      const svg = '<svg><g transform="translate(10, 20)"><g transform="translate(30, 40)"><line x1="0" y1="0" x2="5" y2="0"/></g></g></svg>';
      const result = parser.parse(svg);

      const startPoint = getFirstFigureStartPoint(result.shapes[0]);
      expect(startPoint.x).toBeCloseTo(40);
      expect(startPoint.y).toBeCloseTo(60);
    });

    it('should apply scale transform', () => {
      const svg = '<svg><g transform="scale(2)"><line x1="10" y1="20" x2="30" y2="40"/></g></svg>';
      const result = parser.parse(svg);

      const startPoint = getFirstFigureStartPoint(result.shapes[0]);
      expect(startPoint.x).toBeCloseTo(20);
      expect(startPoint.y).toBeCloseTo(40);

      const endPoint = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(endPoint.x).toBeCloseTo(60);
      expect(endPoint.y).toBeCloseTo(80);
    });
  });

  describe('multiple elements', () => {
    it('should accumulate shapes from multiple elements', () => {
      const svg = '<svg><line x1="0" y1="0" x2="10" y2="10"/><line x1="20" y1="20" x2="30" y2="30"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(2);
    });

    it('should accumulate shapes from different element types', () => {
      const svg = '<svg><rect width="10" height="10"/><circle cx="50" cy="50" r="10"/><line x1="0" y1="0" x2="10" y2="10"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(3);
    });
  });

  describe('empty and edge cases', () => {
    it('should return empty shapes for SVG with no elements', () => {
      const svg = '<svg></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(0);
    });

    it('should return empty shapes for unknown elements', () => {
      const svg = '<svg><text>Hello</text></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(0);
    });

    it('should handle empty path d attribute', () => {
      const svg = '<svg><path d=""/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(0);
    });
  });

  describe('complex multi-subpath SVG integration', () => {
    it('should parse a complex SVG with multiple closed sub-paths', () => {
      const result = parser.parse(COMPLEX_MULTI_SUBPATH_SVG);

      expect(result.viewBox).toEqual({
        height: 512,
        minX: 0,
        minY: 0,
        width: 448,
      });

      expect(result.shapes.length).toBeGreaterThan(0);

      result.shapes.forEach((shape) => {
        expect(shape.isClosed).toBe(true);
        expect(shape.figures.length).toBeGreaterThan(0);
      });
    });

    it('should produce only standard figure types from complex SVG', () => {
      const result = parser.parse(COMPLEX_MULTI_SUBPATH_SVG);

      result.shapes.forEach((shape) => {
        shape.figures.forEach((figure) => {
          const isStandard =
            figure instanceof Line ||
            figure instanceof CubicBezierCurve ||
            figure instanceof QuadraticBezierCurve;
          expect(isStandard).toBe(true);
        });
      });
    });
  });

  describe('edge cases', () => {
    it('should ignore non-tag children like comments', () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg"><!-- comment --><rect width="10" height="10"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(1);
    });

    it('should skip unknown path commands gracefully', () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M 0 0 L 10 10 X 20 20 L 30 30"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(1);
      expect(result.shapes[0].figures.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===================================================================
  // SECTION 1: Tokenizer — Number Formats
  // ===================================================================
  describe('tokenizer — number formats', () => {
    it('should tokenize positive integers', () => {
      const result = parser.parse('<svg><path d="M 10 20 L 30 40"/></svg>');
      const pts = getFigurePoints(result.shapes[0].figures[0]);
      expect(pts[0].x).toBe(10);
      expect(pts[0].y).toBe(20);
      expect(pts[1].x).toBe(30);
      expect(pts[1].y).toBe(40);
    });

    it('should tokenize positive decimals', () => {
      const result = parser.parse('<svg><path d="M 10.5 20.7 L 30.1 40.9"/></svg>');
      const pts = getFigurePoints(result.shapes[0].figures[0]);
      expect(pts[0].x).toBeCloseTo(10.5);
      expect(pts[0].y).toBeCloseTo(20.7);
      expect(pts[1].x).toBeCloseTo(30.1);
      expect(pts[1].y).toBeCloseTo(40.9);
    });

    it('should tokenize negative integers', () => {
      const result = parser.parse('<svg><path d="M -10 -20 L -30 -40"/></svg>');
      const pts = getFigurePoints(result.shapes[0].figures[0]);
      expect(pts[0].x).toBe(-10);
      expect(pts[0].y).toBe(-20);
      expect(pts[1].x).toBe(-30);
      expect(pts[1].y).toBe(-40);
    });

    it('should tokenize negative decimals', () => {
      const result = parser.parse('<svg><path d="M -10.5 -20.7 L -30.1 -40.9"/></svg>');
      const pts = getFigurePoints(result.shapes[0].figures[0]);
      expect(pts[0].x).toBeCloseTo(-10.5);
      expect(pts[0].y).toBeCloseTo(-20.7);
      expect(pts[1].x).toBeCloseTo(-30.1);
      expect(pts[1].y).toBeCloseTo(-40.9);
    });

    it('should tokenize leading decimal .5', () => {
      const result = parser.parse('<svg><path d="M .5 .7 L 1 1"/></svg>');
      const start = getFirstFigureStartPoint(result.shapes[0]);
      expect(start.x).toBeCloseTo(0.5);
      expect(start.y).toBeCloseTo(0.7);
    });

    it('should tokenize negative leading decimal -.5', () => {
      const result = parser.parse('<svg><path d="M 0 0 L -.5 -.7"/></svg>');
      const end = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(end.x).toBeCloseTo(-0.5);
      expect(end.y).toBeCloseTo(-0.7);
    });

    it('should tokenize scientific notation 1e5', () => {
      const result = parser.parse('<svg><path d="M 0 0 L 1e5 0"/></svg>');
      const end = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(end.x).toBe(100000);
    });

    it('should tokenize scientific notation with negative exponent 1.5e-2', () => {
      const result = parser.parse('<svg><path d="M 0 0 L 1.5e-2 0"/></svg>');
      const end = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(end.x).toBeCloseTo(0.015);
    });

    it('should tokenize scientific notation with positive exponent -3E+4', () => {
      const result = parser.parse('<svg><path d="M 0 0 L -3E+4 0"/></svg>');
      const end = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(end.x).toBe(-30000);
    });

    it('should tokenize zero coordinates', () => {
      const result = parser.parse('<svg><path d="M 0 0 L 0 0"/></svg>');
      const pts = getFigurePoints(result.shapes[0].figures[0]);
      expect(pts[0].x).toBe(0);
      expect(pts[0].y).toBe(0);
      expect(pts[1].x).toBe(0);
      expect(pts[1].y).toBe(0);
    });
  });

  // ===================================================================
  // SECTION 2: Tokenizer — Compact Separators
  // ===================================================================
  describe('tokenizer — compact separators', () => {
    it('should separate numbers by comma without spaces', () => {
      const result = parser.parse('<svg><path d="M10,20L30,40"/></svg>');
      const pts = getFigurePoints(result.shapes[0].figures[0]);
      expect(pts[0].x).toBe(10);
      expect(pts[0].y).toBe(20);
      expect(pts[1].x).toBe(30);
      expect(pts[1].y).toBe(40);
    });

    it('should use negative sign as implicit separator', () => {
      const result = parser.parse('<svg><path d="M10 20L30-40"/></svg>');
      const end = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(end.x).toBe(30);
      expect(end.y).toBe(-40);
    });

    it('should use dot as implicit separator between decimals', () => {
      const result = parser.parse('<svg><path d="M0 0L10.5.6"/></svg>');
      const end = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(end.x).toBeCloseTo(10.5);
      expect(end.y).toBeCloseTo(0.6);
    });

    it('should handle tabs and newlines as whitespace', () => {
      const result = parser.parse('<svg><path d="M\t10\n20\tL\n30\t40"/></svg>');
      const pts = getFigurePoints(result.shapes[0].figures[0]);
      expect(pts[0].x).toBe(10);
      expect(pts[0].y).toBe(20);
      expect(pts[1].x).toBe(30);
      expect(pts[1].y).toBe(40);
    });

    it('should handle multiple consecutive spaces', () => {
      const result = parser.parse('<svg><path d="M  10   20  L  30   40"/></svg>');
      const pts = getFigurePoints(result.shapes[0].figures[0]);
      expect(pts[0].x).toBe(10);
      expect(pts[0].y).toBe(20);
      expect(pts[1].x).toBe(30);
      expect(pts[1].y).toBe(40);
    });
  });

  // ===================================================================
  // SECTION 3: Tokenizer — Edge Cases
  // ===================================================================
  describe('tokenizer — edge cases', () => {
    it('should return empty shapes for whitespace-only d attribute', () => {
      const result = parser.parse('<svg><path d="   "/></svg>');
      expect(result.shapes).toHaveLength(0);
    });

    it('should return empty shapes for d with only numbers and no command', () => {
      const result = parser.parse('<svg><path d="10 20 30 40"/></svg>');
      expect(result.shapes).toHaveLength(0);
    });

    it('should handle all command types in a single path', () => {
      const svg = '<svg><path d="M 0 0 L 10 10 H 20 V 30 C 25 35 35 40 40 30 S 55 20 60 30 Q 70 50 80 30 T 100 30 A 10 10 0 0 1 120 30 Z"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(1);
      expect(result.shapes[0].isClosed).toBe(true);

      const hasLine = result.shapes[0].figures.some((f) => f instanceof Line);
      const hasCubic = result.shapes[0].figures.some((f) => f instanceof CubicBezierCurve);
      const hasQuad = result.shapes[0].figures.some((f) => f instanceof QuadraticBezierCurve);
      expect(hasLine).toBe(true);
      expect(hasCubic).toBe(true);
      expect(hasQuad).toBe(true);
    });

    it('should correctly parse -.4693 as negative 0.4693 (regression)', () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0c0 0 0 0 10 10-.5 1-.5 1-.5 1z"/></svg>';
      const result = parser.parse(svg);

      const secondCubic = result.shapes[0].figures[1];
      const vals = secondCubic.values as { x: number; y: number }[];

      expect(vals[1].x).toBe(9.5);
      expect(vals[1].y).toBe(11);
    });

    it('should parse compact cubic sequences with negative leading decimals correctly (regression)', () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M100 100c0 0 0 0 -4.5703 23.8585-.4693 10.4854-.5923 13.8379-.5923 40.5348z"/></svg>';
      const result = parser.parse(svg);

      const shape = result.shapes[0];

      const c1vals = shape.figures[0].values as { x: number; y: number }[];
      expect(c1vals[3].x).toBeCloseTo(95.4297, 4);
      expect(c1vals[3].y).toBeCloseTo(123.8585, 4);

      const c2vals = shape.figures[1].values as { x: number; y: number }[];
      expect(c2vals[1].x).toBeCloseTo(94.9604, 4);
      expect(c2vals[1].y).toBeCloseTo(134.3439, 4);
      expect(c2vals[3].x).toBeCloseTo(94.8374, 4);
      expect(c2vals[3].y).toBeCloseTo(164.3933, 4);
    });
  });

  // ===================================================================
  // SECTION 4: Path Commands — Implicit Repetition
  // ===================================================================
  describe('path commands — implicit repetition', () => {
    it('should consume multiple L coordinate pairs as repeated lines', () => {
      const result = parser.parse('<svg><path d="M 0 0 L 10 10 20 20 30 30"/></svg>');
      expect(result.shapes[0].figures).toHaveLength(3);

      const end1 = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(end1.x).toBe(10);
      expect(end1.y).toBe(10);

      const end2 = getLineFigureEndPoint(result.shapes[0].figures[1]);
      expect(end2.x).toBe(20);
      expect(end2.y).toBe(20);

      const end3 = getLineFigureEndPoint(result.shapes[0].figures[2]);
      expect(end3.x).toBe(30);
      expect(end3.y).toBe(30);
    });

    it('should consume multiple relative l coordinate pairs', () => {
      const result = parser.parse('<svg><path d="M 0 0 l 10 10 10 10 10 10"/></svg>');
      expect(result.shapes[0].figures).toHaveLength(3);

      const end = getLineFigureEndPoint(result.shapes[0].figures[2]);
      expect(end.x).toBe(30);
      expect(end.y).toBe(30);
    });

    it('should consume multiple H values as repeated horizontal lines', () => {
      const result = parser.parse('<svg><path d="M 0 0 H 10 20 30"/></svg>');
      expect(result.shapes[0].figures).toHaveLength(3);

      const end = getLineFigureEndPoint(result.shapes[0].figures[2]);
      expect(end.x).toBe(30);
      expect(end.y).toBe(0);
    });

    it('should consume multiple V values as repeated vertical lines', () => {
      const result = parser.parse('<svg><path d="M 0 0 V 10 20 30"/></svg>');
      expect(result.shapes[0].figures).toHaveLength(3);

      const end = getLineFigureEndPoint(result.shapes[0].figures[2]);
      expect(end.x).toBe(0);
      expect(end.y).toBe(30);
    });

    it('should consume multiple C parameter sets as repeated cubics', () => {
      const result = parser.parse('<svg><path d="M 0 0 C 10 20 30 40 50 60 70 80 90 100 110 120"/></svg>');
      expect(result.shapes[0].figures).toHaveLength(2);
      expect(result.shapes[0].figures[0]).toBeInstanceOf(CubicBezierCurve);
      expect(result.shapes[0].figures[1]).toBeInstanceOf(CubicBezierCurve);

      const pts = getFigurePoints(result.shapes[0].figures[1]);
      expect(pts[0].x).toBe(50);
      expect(pts[0].y).toBe(60);
      expect(pts[3].x).toBe(110);
      expect(pts[3].y).toBe(120);
    });

    it('should consume multiple Q parameter sets as repeated quadratics', () => {
      const result = parser.parse('<svg><path d="M 0 0 Q 25 50 50 0 75 -50 100 0"/></svg>');
      expect(result.shapes[0].figures).toHaveLength(2);
      expect(result.shapes[0].figures[0]).toBeInstanceOf(QuadraticBezierCurve);
      expect(result.shapes[0].figures[1]).toBeInstanceOf(QuadraticBezierCurve);

      const pts = getFigurePoints(result.shapes[0].figures[1]);
      expect(pts[2].x).toBe(100);
      expect(pts[2].y).toBe(0);
    });

    it('should consume multiple A parameter sets as repeated arcs', () => {
      const result = parser.parse('<svg><path d="M 0 0 A 25 25 0 0 1 50 0 25 25 0 0 1 100 0"/></svg>');

      // Each arc produces 1+ cubic bezier curves
      const allCubic = result.shapes[0].figures.every((f) => f instanceof CubicBezierCurve);
      expect(allCubic).toBe(true);

      // Last figure should end at (100, 0)
      const lastFigure = result.shapes[0].figures[result.shapes[0].figures.length - 1];
      const pts = getFigurePoints(lastFigure);
      expect(pts[pts.length - 1].x).toBeCloseTo(100);
      expect(pts[pts.length - 1].y).toBeCloseTo(0);
    });

    it('should consume multiple relative h values', () => {
      const result = parser.parse('<svg><path d="M 10 10 h 5 10 15"/></svg>');
      expect(result.shapes[0].figures).toHaveLength(3);

      const end = getLineFigureEndPoint(result.shapes[0].figures[2]);
      expect(end.x).toBe(40);
      expect(end.y).toBe(10);
    });
  });

  // ===================================================================
  // SECTION 5: Smooth Bezier Chaining
  // ===================================================================
  describe('path commands — smooth bezier chaining', () => {
    it('should chain S after S with correct reflected control points', () => {
      const svg = '<svg><path d="M 0 0 C 0 50 50 100 100 100 S 200 100 200 50 S 200 0 150 0"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes[0].figures).toHaveLength(3);

      // 3rd curve: cp1 = reflection of 2nd curve's cp2 across (200,50)
      // 2nd curve cp2 = (200, 100), current = (200, 50)
      // reflected cp1 = (2*200 - 200, 2*50 - 100) = (200, 0)
      const thirdCurve = getFigurePoints(result.shapes[0].figures[2]);
      expect(thirdCurve[1].x).toBeCloseTo(200);
      expect(thirdCurve[1].y).toBeCloseTo(0);
    });

    it('should chain T after T with correct reflected control points', () => {
      const svg = '<svg><path d="M 0 0 Q 25 50 50 0 T 100 0 T 150 0"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes[0].figures).toHaveLength(3);

      // 2nd curve (T 100 0): cp = reflection of (25,50) across (50,0) = (75, -50)
      // 3rd curve (T 150 0): cp = reflection of (75,-50) across (100,0) = (125, 50)
      const thirdCurve = getFigurePoints(result.shapes[0].figures[2]);
      expect(thirdCurve[1].x).toBeCloseTo(125);
      expect(thirdCurve[1].y).toBeCloseTo(50);
    });

    it('should use current point as cp1 for S after L (non-cubic predecessor)', () => {
      const svg = '<svg><path d="M 0 0 L 50 50 S 80 80 100 50"/></svg>';
      const result = parser.parse(svg);

      const sCurve = getFigurePoints(result.shapes[0].figures[1]);
      expect(sCurve[1].x).toBeCloseTo(50);
      expect(sCurve[1].y).toBeCloseTo(50);
    });

    it('should use current point as cp1 for S after H (non-cubic predecessor)', () => {
      const svg = '<svg><path d="M 0 0 H 50 S 80 30 100 0"/></svg>';
      const result = parser.parse(svg);

      const sCurve = getFigurePoints(result.shapes[0].figures[1]);
      expect(sCurve[1].x).toBeCloseTo(50);
      expect(sCurve[1].y).toBeCloseTo(0);
    });

    it('should use current point as cp for T after L (non-quadratic predecessor)', () => {
      const svg = '<svg><path d="M 0 0 L 50 50 T 100 50"/></svg>';
      const result = parser.parse(svg);

      const tCurve = getFigurePoints(result.shapes[0].figures[1]);
      expect(tCurve[1].x).toBeCloseTo(50);
      expect(tCurve[1].y).toBeCloseTo(50);
    });

    it('should use current point as cp for T after V (non-quadratic predecessor)', () => {
      const svg = '<svg><path d="M 0 0 V 50 T 50 50"/></svg>';
      const result = parser.parse(svg);

      const tCurve = getFigurePoints(result.shapes[0].figures[1]);
      expect(tCurve[1].x).toBeCloseTo(0);
      expect(tCurve[1].y).toBeCloseTo(50);
    });
  });

  // ===================================================================
  // SECTION 6: MoveTo Edge Cases
  // ===================================================================
  describe('path commands — M/m edge cases', () => {
    it('should only draw from the last M when multiple M commands appear in sequence', () => {
      const result = parser.parse('<svg><path d="M 10 10 M 20 20 M 30 30 L 40 40"/></svg>');

      expect(result.shapes).toHaveLength(1);
      expect(result.shapes[0].figures).toHaveLength(1);

      const start = getFirstFigureStartPoint(result.shapes[0]);
      expect(start.x).toBe(30);
      expect(start.y).toBe(30);
    });

    it('should resolve relative m after Z from subpath start', () => {
      const result = parser.parse('<svg><path d="M 100 100 L 200 100 Z m 10 10 L 200 200"/></svg>');

      expect(result.shapes).toHaveLength(2);

      // After Z, currentPoint resets to subPathStart (100,100)
      // m 10 10 is relative to that → (110, 110)
      const start = getFirstFigureStartPoint(result.shapes[1]);
      expect(start.x).toBe(110);
      expect(start.y).toBe(110);
    });

    it('should resolve m at path start relative to origin', () => {
      const result = parser.parse('<svg><path d="m 15 25 l 10 0"/></svg>');

      const start = getFirstFigureStartPoint(result.shapes[0]);
      expect(start.x).toBe(15);
      expect(start.y).toBe(25);

      const end = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(end.x).toBe(25);
      expect(end.y).toBe(25);
    });

    it('should treat implicit coordinates after m as relative L commands', () => {
      const result = parser.parse('<svg><path d="m 5 5 10 10 10 10"/></svg>');

      expect(result.shapes[0].figures).toHaveLength(2);

      const end = getLineFigureEndPoint(result.shapes[0].figures[1]);
      expect(end.x).toBe(25);
      expect(end.y).toBe(25);
    });
  });

  // ===================================================================
  // SECTION 7: ClosePath Edge Cases
  // ===================================================================
  describe('path commands — Z edge cases', () => {
    it('should not add a closing line when already at subpath start', () => {
      const result = parser.parse('<svg><path d="M 10 10 L 20 10 L 20 20 L 10 10 Z"/></svg>');

      // 3 lines: (10,10)→(20,10), (20,10)→(20,20), (20,20)→(10,10)
      // Z should NOT add a 4th line since we're already at (10,10)
      expect(result.shapes[0].figures).toHaveLength(3);
      expect(result.shapes[0].isClosed).toBe(true);
    });

    it('should start a new shape after Z when more commands follow', () => {
      const result = parser.parse('<svg><path d="M 0 0 L 10 0 L 10 10 Z L 20 20"/></svg>');

      expect(result.shapes).toHaveLength(2);
      expect(result.shapes[0].isClosed).toBe(true);
      expect(result.shapes[1].isClosed).toBe(false);

      // After Z, currentPoint = subPathStart = (0,0)
      const start = getFirstFigureStartPoint(result.shapes[1]);
      expect(start.x).toBe(0);
      expect(start.y).toBe(0);
    });

    it('should handle double Z without error', () => {
      const result = parser.parse('<svg><path d="M 0 0 L 10 0 Z Z"/></svg>');

      // First Z closes the shape; second Z has empty currentShapeFigures, no shape pushed
      expect(result.shapes).toHaveLength(1);
      expect(result.shapes[0].isClosed).toBe(true);
    });

    it('should treat lowercase z identically to uppercase Z', () => {
      const result = parser.parse('<svg><path d="M 0 0 L 50 0 L 50 50 z"/></svg>');

      expect(result.shapes[0].isClosed).toBe(true);

      const lastFigure = result.shapes[0].figures[result.shapes[0].figures.length - 1];
      const end = getLineFigureEndPoint(lastFigure);
      expect(end.x).toBe(0);
      expect(end.y).toBe(0);
    });
  });

  // ===================================================================
  // SECTION 8: Transforms
  // ===================================================================
  describe('transforms — rotate', () => {
    it('should apply rotate(90) around origin', () => {
      const svg = '<svg><g transform="rotate(90)"><line x1="10" y1="0" x2="20" y2="0"/></g></svg>';
      const result = parser.parse(svg);

      // rotate 90° CCW: (x,y) → (-y, x)
      const start = getFirstFigureStartPoint(result.shapes[0]);
      expect(start.x).toBeCloseTo(0);
      expect(start.y).toBeCloseTo(10);

      const end = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(end.x).toBeCloseTo(0);
      expect(end.y).toBeCloseTo(20);
    });

    it('should apply rotate(90, cx, cy) around a center point', () => {
      const svg = '<svg><g transform="rotate(90, 50, 50)"><line x1="50" y1="0" x2="50" y2="10"/></g></svg>';
      const result = parser.parse(svg);

      // rotate(90° CCW around (50,50)): translate to center, rotate, translate back
      // (50,0) - (50,50) = (0,-50), rotate 90° → (50, 0), + (50,50) = (100, 50)
      // (50,10) - (50,50) = (0,-40), rotate 90° → (40, 0), + (50,50) = (90, 50)
      const start = getFirstFigureStartPoint(result.shapes[0]);
      expect(start.x).toBeCloseTo(100);
      expect(start.y).toBeCloseTo(50);

      const end = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(end.x).toBeCloseTo(90);
      expect(end.y).toBeCloseTo(50);
    });
  });

  describe('transforms — scale variations', () => {
    it('should apply non-uniform scale(2, 3)', () => {
      const svg = '<svg><g transform="scale(2, 3)"><line x1="10" y1="10" x2="20" y2="20"/></g></svg>';
      const result = parser.parse(svg);

      const start = getFirstFigureStartPoint(result.shapes[0]);
      expect(start.x).toBeCloseTo(20);
      expect(start.y).toBeCloseTo(30);

      const end = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(end.x).toBeCloseTo(40);
      expect(end.y).toBeCloseTo(60);
    });

    it('should default sy to sx when scale has single parameter', () => {
      const svg = '<svg><g transform="scale(3)"><line x1="10" y1="10" x2="20" y2="20"/></g></svg>';
      const result = parser.parse(svg);

      const start = getFirstFigureStartPoint(result.shapes[0]);
      expect(start.x).toBeCloseTo(30);
      expect(start.y).toBeCloseTo(30);

      const end = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(end.x).toBeCloseTo(60);
      expect(end.y).toBeCloseTo(60);
    });
  });

  describe('transforms — multiple and ordering', () => {
    it('should apply translate then scale in attribute order', () => {
      const svg = '<svg><g transform="translate(10, 0) scale(2)"><line x1="0" y1="0" x2="5" y2="0"/></g></svg>';
      const result = parser.parse(svg);

      // translate(10,0) first: (0,0)→(10,0), (5,0)→(15,0)
      // then scale(2): (10,0)→(20,0), (15,0)→(30,0)
      const start = getFirstFigureStartPoint(result.shapes[0]);
      expect(start.x).toBeCloseTo(20);
      expect(start.y).toBeCloseTo(0);

      const end = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(end.x).toBeCloseTo(30);
      expect(end.y).toBeCloseTo(0);
    });

    it('should apply scale then translate in attribute order (non-commutative)', () => {
      const svg = '<svg><g transform="scale(2) translate(10, 0)"><line x1="0" y1="0" x2="5" y2="0"/></g></svg>';
      const result = parser.parse(svg);

      // scale(2) first: (0,0)→(0,0), (5,0)→(10,0)
      // then translate(10,0): (0,0)→(10,0), (10,0)→(20,0)
      const start = getFirstFigureStartPoint(result.shapes[0]);
      expect(start.x).toBeCloseTo(10);
      expect(start.y).toBeCloseTo(0);

      const end = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(end.x).toBeCloseTo(20);
      expect(end.y).toBeCloseTo(0);
    });

    it('should apply transform directly on a shape element', () => {
      const svg = '<svg><rect x="0" y="0" width="10" height="10" transform="translate(50, 50)"/></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(1);
      const start = getFirstFigureStartPoint(result.shapes[0]);
      expect(start.x).toBeCloseTo(50);
      expect(start.y).toBeCloseTo(50);
    });

    it('should combine parent g transforms with inner g transforms', () => {
      const svg = '<svg><g transform="translate(100, 0)"><g transform="scale(2)"><line x1="5" y1="0" x2="10" y2="0"/></g><line x1="5" y1="0" x2="10" y2="0"/></g></svg>';
      const result = parser.parse(svg);

      expect(result.shapes).toHaveLength(2);

      // Inner line: [translate(100,0), scale(2)] applied in order
      // (5,0) → translate → (105,0) → scale(2) → (210,0)
      const innerStart = getFirstFigureStartPoint(result.shapes[0]);
      expect(innerStart.x).toBeCloseTo(210);
      expect(innerStart.y).toBeCloseTo(0);

      // Outer line: [translate(100,0)] only
      // (5,0) → translate → (105,0)
      const outerStart = getFirstFigureStartPoint(result.shapes[1]);
      expect(outerStart.x).toBeCloseTo(105);
      expect(outerStart.y).toBeCloseTo(0);
    });
  });

  // ===================================================================
  // SECTION 9: Rounded Rect Edge Cases
  // ===================================================================
  describe('rect element — rounded rect edge cases', () => {
    it('should default ry to rx when only rx is specified', () => {
      const result = parser.parse('<svg><rect x="0" y="0" width="100" height="100" rx="10"/></svg>');

      expect(result.shapes).toHaveLength(1);
      expect(result.shapes[0].isClosed).toBe(true);

      const hasCurves = result.shapes[0].figures.some((f) => f instanceof CubicBezierCurve);
      expect(hasCurves).toBe(true);

      // Top line should start at x=10 (rx offset)
      const start = getFirstFigureStartPoint(result.shapes[0]);
      expect(start.x).toBeCloseTo(10);
      expect(start.y).toBeCloseTo(0);
    });

    it('should default rx to ry when only ry is specified', () => {
      const result = parser.parse('<svg><rect x="0" y="0" width="100" height="100" ry="15"/></svg>');

      expect(result.shapes).toHaveLength(1);
      const hasCurves = result.shapes[0].figures.some((f) => f instanceof CubicBezierCurve);
      expect(hasCurves).toBe(true);

      // Top line should start at x=15 (ry used as rx)
      const start = getFirstFigureStartPoint(result.shapes[0]);
      expect(start.x).toBeCloseTo(15);
      expect(start.y).toBeCloseTo(0);
    });

    it('should clamp radii to half the width', () => {
      const result = parser.parse('<svg><rect x="0" y="0" width="40" height="100" rx="30" ry="30"/></svg>');

      expect(result.shapes).toHaveLength(1);
      // effectiveRx = min(30, 40/2) = 20
      // Top line from (20,0) to (20,0) — zero-length but valid
      const start = getFirstFigureStartPoint(result.shapes[0]);
      expect(start.x).toBeCloseTo(20);
    });

    it('should clamp radii to half the height', () => {
      const result = parser.parse('<svg><rect x="0" y="0" width="100" height="30" rx="20" ry="20"/></svg>');

      expect(result.shapes).toHaveLength(1);
      // effectiveRy = min(20, 30/2) = 15
      const hasCurves = result.shapes[0].figures.some((f) => f instanceof CubicBezierCurve);
      expect(hasCurves).toBe(true);
    });
  });

  // ===================================================================
  // SECTION 10: ViewBox Edge Cases
  // ===================================================================
  describe('viewBox parsing — separator variants', () => {
    it('should parse comma-separated viewBox', () => {
      const result = parser.parse('<svg viewBox="0,0,100,200"></svg>');

      expect(result.viewBox).toEqual({ height: 200, minX: 0, minY: 0, width: 100 });
    });

    it('should parse viewBox with mixed whitespace and commas', () => {
      const result = parser.parse('<svg viewBox="10, 20 300,400"></svg>');

      expect(result.viewBox).toEqual({ height: 400, minX: 10, minY: 20, width: 300 });
    });

    it('should return undefined for viewBox with too few values', () => {
      const result = parser.parse('<svg viewBox="0 0 100"></svg>');

      expect(result.viewBox).toBeUndefined();
    });
  });

  // ===================================================================
  // SECTION 11: Shape Element Edge Cases
  // ===================================================================
  describe('shape elements — attribute edge cases', () => {
    it('should default circle cx/cy to 0 when missing', () => {
      const result = parser.parse('<svg><circle r="25"/></svg>');

      expect(result.shapes).toHaveLength(1);
      expect(result.shapes[0].figures.length).toBeGreaterThan(0);
    });

    it('should ignore circle with negative radius', () => {
      const result = parser.parse('<svg><circle cx="50" cy="50" r="-10"/></svg>');

      expect(result.shapes).toHaveLength(0);
    });

    it('should ignore ellipse when one radius is zero', () => {
      const result = parser.parse('<svg><ellipse cx="50" cy="50" rx="40" ry="0"/></svg>');

      expect(result.shapes).toHaveLength(0);
    });

    it('should default line attributes to 0 when missing', () => {
      const result = parser.parse('<svg><line/></svg>');

      expect(result.shapes).toHaveLength(1);
      const pts = getFigurePoints(result.shapes[0].figures[0]);
      expect(pts[0].x).toBe(0);
      expect(pts[0].y).toBe(0);
      expect(pts[1].x).toBe(0);
      expect(pts[1].y).toBe(0);
    });

    it('should ignore rect with negative width', () => {
      const result = parser.parse('<svg><rect x="0" y="0" width="-10" height="50"/></svg>');

      expect(result.shapes).toHaveLength(0);
    });

    it('should parse polygon with space-only separators', () => {
      const result = parser.parse('<svg><polygon points="0 0 100 0 100 100"/></svg>');

      expect(result.shapes).toHaveLength(1);
      expect(result.shapes[0].isClosed).toBe(true);
      result.shapes[0].figures.forEach((f) => expect(f).toBeInstanceOf(Line));
    });

    it('should parse polyline with exactly 2 points', () => {
      const result = parser.parse('<svg><polyline points="0,0 50,50"/></svg>');

      expect(result.shapes).toHaveLength(1);
      expect(result.shapes[0].isClosed).toBe(false);
      expect(result.shapes[0].figures).toHaveLength(1);
      expect(result.shapes[0].figures[0]).toBeInstanceOf(Line);
    });

    it('should return no shapes for path without d attribute', () => {
      const result = parser.parse('<svg><path/></svg>');

      expect(result.shapes).toHaveLength(0);
    });
  });

  // ===================================================================
  // SECTION 12: Coordinate & Integration Tests
  // ===================================================================
  describe('coordinate edge cases', () => {
    it('should handle very large coordinates', () => {
      const result = parser.parse('<svg><path d="M 0 0 L 99999 99999"/></svg>');
      const end = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(end.x).toBe(99999);
      expect(end.y).toBe(99999);
    });

    it('should handle very small decimal coordinates', () => {
      const result = parser.parse('<svg><path d="M 0 0 L 0.001 0.002"/></svg>');
      const end = getLineFigureEndPoint(result.shapes[0].figures[0]);
      expect(end.x).toBeCloseTo(0.001);
      expect(end.y).toBeCloseTo(0.002);
    });

    it('should handle negative position in rect', () => {
      const result = parser.parse('<svg><rect x="-50" y="-50" width="100" height="100"/></svg>');

      expect(result.shapes).toHaveLength(1);
      const start = getFirstFigureStartPoint(result.shapes[0]);
      expect(start.x).toBeCloseTo(-50);
      expect(start.y).toBeCloseTo(-50);
    });

    it('should correctly track position through mixed absolute and relative commands', () => {
      // M(10,10) → L(50,50) → l(-10,-10)=(40,40) → H60(60,40) → h-5(55,40) → V80(55,80) → v-10(55,70)
      const result = parser.parse('<svg><path d="M 10 10 L 50 50 l -10 -10 H 60 h -5 V 80 v -10"/></svg>');

      expect(result.shapes[0].figures).toHaveLength(6);

      const lastFigure = result.shapes[0].figures[5];
      const end = getLineFigureEndPoint(lastFigure);
      expect(end.x).toBe(55);
      expect(end.y).toBe(70);
    });

    it('should parse a full SVG with mixed element types', () => {
      const svg = '<svg viewBox="0 0 200 200"><rect x="10" y="10" width="80" height="80"/><circle cx="150" cy="50" r="30"/><path d="M 100 150 L 180 150 L 140 190 Z"/></svg>';
      const result = parser.parse(svg);

      expect(result.viewBox).toEqual({ height: 200, minX: 0, minY: 0, width: 200 });
      expect(result.shapes).toHaveLength(3);

      // Rect has 4 lines
      result.shapes[0].figures.forEach((f) => expect(f).toBeInstanceOf(Line));
      expect(result.shapes[0].figures).toHaveLength(4);

      // Circle has cubic bezier curves
      result.shapes[1].figures.forEach((f) => expect(f).toBeInstanceOf(CubicBezierCurve));

      // Path triangle is closed
      expect(result.shapes[2].isClosed).toBe(true);
    });
  });
});
