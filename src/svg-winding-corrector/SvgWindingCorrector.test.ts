import { CubicBezierCurve, Line, Point, QuadraticBezierCurve } from 'geometric-library';
import type { ISvgShape } from '@svg-parser';
import { SvgWindingCorrector } from './SvgWindingCorrector';

// CCW square in Y-up space: right → up → left → down
function createCcwSquare(x: number, y: number, size: number): ISvgShape {
  return {
    figures: [
      new Line([new Point([x, y]), new Point([x + size, y])]),
      new Line([new Point([x + size, y]), new Point([x + size, y + size])]),
      new Line([new Point([x + size, y + size]), new Point([x, y + size])]),
      new Line([new Point([x, y + size]), new Point([x, y])])
    ],
    isClosed: true
  };
}

// CW square in Y-up space: up → right → down → left
function createCwSquare(x: number, y: number, size: number): ISvgShape {
  return {
    figures: [
      new Line([new Point([x, y]), new Point([x, y + size])]),
      new Line([new Point([x, y + size]), new Point([x + size, y + size])]),
      new Line([new Point([x + size, y + size]), new Point([x + size, y])]),
      new Line([new Point([x + size, y]), new Point([x, y])])
    ],
    isClosed: true
  };
}

describe('SvgWindingCorrector', () => {
  let corrector: SvgWindingCorrector;

  beforeEach(() => {
    corrector = new SvgWindingCorrector();
  });

  describe('computeSignedArea', () => {
    it('should return positive area for CCW polygon', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 }
      ];
      const area = corrector.computeSignedArea(points);

      expect(area).toBeGreaterThan(0);
      expect(area).toBe(100);
    });

    it('should return negative area for CW polygon', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 0 }
      ];
      const area = corrector.computeSignedArea(points);

      expect(area).toBeLessThan(0);
      expect(area).toBe(-100);
    });

    it('should return zero for degenerate polygon', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 0 }
      ];
      const area = corrector.computeSignedArea(points);

      expect(area).toBe(0);
    });
  });

  describe('isPointInsidePolygon', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 }
    ];

    it('should return true for point inside polygon', () => {
      expect(corrector.isPointInsidePolygon({ x: 5, y: 5 }, square)).toBe(true);
    });

    it('should return false for point outside polygon', () => {
      expect(corrector.isPointInsidePolygon({ x: 15, y: 5 }, square)).toBe(false);
    });

    it('should return false for point far from polygon', () => {
      expect(corrector.isPointInsidePolygon({ x: -10, y: -10 }, square)).toBe(false);
    });
  });

  describe('sampleContourPoints', () => {
    it('should return endpoints for line figures', () => {
      const figures = [new Line([new Point([0, 0]), new Point([10, 0])]), new Line([new Point([10, 0]), new Point([10, 10])])];

      const points = corrector.sampleContourPoints(figures);

      expect(points).toHaveLength(3);
      expect(points[0]).toEqual({ x: 0, y: 0 });
      expect(points[1]).toEqual({ x: 10, y: 0 });
      expect(points[2]).toEqual({ x: 10, y: 10 });
    });

    it('should return sampled points for cubic bezier figures', () => {
      const figures = [new CubicBezierCurve([new Point([0, 0]), new Point([5, 10]), new Point([15, 10]), new Point([20, 0])])];

      const points = corrector.sampleContourPoints(figures);

      expect(points).toHaveLength(9);
      expect(points[0].x).toBeCloseTo(0);
      expect(points[0].y).toBeCloseTo(0);
      expect(points[8].x).toBeCloseTo(20);
      expect(points[8].y).toBeCloseTo(0);
    });

    it('should return sampled points for quadratic bezier figures', () => {
      const figures = [new QuadraticBezierCurve([new Point([0, 0]), new Point([10, 20]), new Point([20, 0])])];

      const points = corrector.sampleContourPoints(figures);

      expect(points).toHaveLength(9);
      expect(points[0].x).toBeCloseTo(0);
      expect(points[0].y).toBeCloseTo(0);
      expect(points[8].x).toBeCloseTo(20);
      expect(points[8].y).toBeCloseTo(0);
    });

    it('should not duplicate shared endpoints between consecutive figures', () => {
      const figures = [new Line([new Point([0, 0]), new Point([10, 0])]), new CubicBezierCurve([new Point([10, 0]), new Point([15, 5]), new Point([15, 15]), new Point([10, 20])]), new Line([new Point([10, 20]), new Point([0, 20])])];

      const points = corrector.sampleContourPoints(figures);

      // Line: 2 points, Cubic: 9 points (skip first = 8), Line: 2 points (skip first = 1)
      expect(points).toHaveLength(11);
    });
  });

  describe('deduplicateShapes', () => {
    it('should remove duplicate shapes with identical geometry', () => {
      const shape1 = createCcwSquare(0, 0, 100);
      const shape2 = createCcwSquare(0, 0, 100);

      const result = corrector.deduplicateShapes([shape1, shape2]);

      expect(result).toHaveLength(1);
    });

    it('should keep shapes with different geometry', () => {
      const shape1 = createCcwSquare(0, 0, 100);
      const shape2 = createCcwSquare(0, 0, 50);

      const result = corrector.deduplicateShapes([shape1, shape2]);

      expect(result).toHaveLength(2);
    });

    it('should handle multiple duplicates', () => {
      const shape = createCcwSquare(0, 0, 100);

      const result = corrector.deduplicateShapes([shape, shape, shape, shape]);

      expect(result).toHaveLength(1);
    });
  });

  describe('reverseShapeWinding', () => {
    it('should reverse a CCW shape to CW', () => {
      const ccwShape = createCcwSquare(0, 0, 10);
      const ccwPoints = corrector.sampleContourPoints(ccwShape.figures);
      const ccwArea = corrector.computeSignedArea(ccwPoints);

      const reversed = corrector.reverseShapeWinding(ccwShape);
      const reversedPoints = corrector.sampleContourPoints(reversed.figures);
      const reversedArea = corrector.computeSignedArea(reversedPoints);

      expect(ccwArea).toBeGreaterThan(0);
      expect(reversedArea).toBeLessThan(0);
    });

    it('should reverse a CW shape to CCW', () => {
      const cwShape = createCwSquare(0, 0, 10);
      const cwPoints = corrector.sampleContourPoints(cwShape.figures);
      const cwArea = corrector.computeSignedArea(cwPoints);

      const reversed = corrector.reverseShapeWinding(cwShape);
      const reversedPoints = corrector.sampleContourPoints(reversed.figures);
      const reversedArea = corrector.computeSignedArea(reversedPoints);

      expect(cwArea).toBeLessThan(0);
      expect(reversedArea).toBeGreaterThan(0);
    });

    it('should preserve isClosed property', () => {
      const shape = createCcwSquare(0, 0, 10);
      const reversed = corrector.reverseShapeWinding(shape);

      expect(reversed.isClosed).toBe(true);
    });

    it('should reverse cubic bezier control points', () => {
      const shape: ISvgShape = {
        figures: [new CubicBezierCurve([new Point([0, 0]), new Point([5, 10]), new Point([15, 10]), new Point([20, 0])]), new Line([new Point([20, 0]), new Point([0, 0])])],
        isClosed: true
      };

      const reversed = corrector.reverseShapeWinding(shape);

      expect(reversed.figures).toHaveLength(2);
      expect(reversed.figures[0]).toBeInstanceOf(Line);
      expect(reversed.figures[1]).toBeInstanceOf(CubicBezierCurve);
    });
  });

  describe('computeContainmentDepth', () => {
    it('should return 0 for outermost shape', () => {
      const outerPolygon = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 }
      ];
      const innerPolygon = [
        { x: 20, y: 20 },
        { x: 80, y: 20 },
        { x: 80, y: 80 },
        { x: 20, y: 80 }
      ];

      const depth = corrector.computeContainmentDepth(0, [outerPolygon, innerPolygon]);

      expect(depth).toBe(0);
    });

    it('should return 1 for shape inside another', () => {
      const outerPolygon = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 }
      ];
      const innerPolygon = [
        { x: 20, y: 20 },
        { x: 80, y: 20 },
        { x: 80, y: 80 },
        { x: 20, y: 80 }
      ];

      const depth = corrector.computeContainmentDepth(1, [outerPolygon, innerPolygon]);

      expect(depth).toBe(1);
    });

    it('should return 2 for doubly nested shape', () => {
      const outer = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 }
      ];
      const middle = [
        { x: 10, y: 10 },
        { x: 90, y: 10 },
        { x: 90, y: 90 },
        { x: 10, y: 90 }
      ];
      const inner = [
        { x: 30, y: 30 },
        { x: 70, y: 30 },
        { x: 70, y: 70 },
        { x: 30, y: 70 }
      ];

      const depth = corrector.computeContainmentDepth(2, [outer, middle, inner]);

      expect(depth).toBe(2);
    });
  });

  describe('removeAllDuplicatedShapes', () => {
    it('should remove all copies of shapes that have duplicates', () => {
      const shape1 = createCcwSquare(0, 0, 100);
      const shape2 = createCcwSquare(0, 0, 100);
      const unique = createCcwSquare(20, 20, 60);

      const result = corrector.removeAllDuplicatedShapes([shape1, shape2, unique]);

      expect(result).toHaveLength(1);
    });

    it('should keep all shapes when none are duplicated', () => {
      const shape1 = createCcwSquare(0, 0, 100);
      const shape2 = createCcwSquare(20, 20, 60);

      const result = corrector.removeAllDuplicatedShapes([shape1, shape2]);

      expect(result).toHaveLength(2);
    });

    it('should remove all copies when all shapes are identical', () => {
      const shape = createCcwSquare(0, 0, 100);

      const result = corrector.removeAllDuplicatedShapes([shape, shape, shape, shape]);

      expect(result).toHaveLength(0);
    });

    it('should handle multiple groups of duplicates', () => {
      const groupA1 = createCcwSquare(0, 0, 100);
      const groupA2 = createCcwSquare(0, 0, 100);
      const groupB1 = createCcwSquare(50, 50, 20);
      const groupB2 = createCcwSquare(50, 50, 20);
      const unique = createCcwSquare(10, 10, 30);

      const result = corrector.removeAllDuplicatedShapes([groupA1, groupA2, groupB1, groupB2, unique]);

      expect(result).toHaveLength(1);
    });
  });

  describe('correct', () => {
    it('should return shapes unchanged when all are open', () => {
      const openShape: ISvgShape = {
        figures: [new Line([new Point([0, 0]), new Point([10, 10])])],
        isClosed: false
      };

      const result = corrector.correct([openShape]);

      expect(result).toHaveLength(1);
      expect(result[0].isClosed).toBe(false);
    });

    it('should return unique shapes unchanged (no duplicates = no removal)', () => {
      const cwShape = createCwSquare(0, 0, 100);
      const cwPoints = corrector.sampleContourPoints(cwShape.figures);
      const cwArea = corrector.computeSignedArea(cwPoints);

      const result = corrector.correct([cwShape]);
      const resultPoints = corrector.sampleContourPoints(result[0].figures);
      const resultArea = corrector.computeSignedArea(resultPoints);

      expect(result).toHaveLength(1);
      expect(resultArea).toBe(cwArea);
    });

    it('should return unique nested shapes unchanged', () => {
      const outer = createCcwSquare(0, 0, 100);
      const inner = createCcwSquare(20, 20, 60);

      const result = corrector.correct([outer, inner]);

      expect(result).toHaveLength(2);

      const outerArea = corrector.computeSignedArea(corrector.sampleContourPoints(result[0].figures));
      const innerArea = corrector.computeSignedArea(corrector.sampleContourPoints(result[1].figures));

      // Both stay unchanged since no duplicates triggered removal
      expect(outerArea).toBeGreaterThan(0);
      expect(innerArea).toBeGreaterThan(0);
    });

    it('should remove all duplicated shapes and keep unique ones with original winding', () => {
      const background1 = createCcwSquare(0, 0, 100);
      const background2 = createCcwSquare(0, 0, 100);
      const iconOuter = createCcwSquare(20, 20, 60);

      const result = corrector.correct([background1, background2, iconOuter]);

      // Both backgrounds removed (duplicated), only iconOuter remains
      expect(result).toHaveLength(1);

      const area = corrector.computeSignedArea(corrector.sampleContourPoints(result[0].figures));
      // Icon shape keeps its original winding (CCW)
      expect(area).toBeGreaterThan(0);
    });

    it('should preserve open shapes alongside closed shapes', () => {
      const closed = createCcwSquare(0, 0, 100);
      const open: ISvgShape = {
        figures: [new Line([new Point([0, 0]), new Point([50, 50])])],
        isClosed: false
      };

      const result = corrector.correct([closed, open]);

      expect(result).toHaveLength(2);

      const closedResult = result.find((s) => s.isClosed);
      const openResult = result.find((s) => !s.isClosed);

      expect(closedResult).toBeDefined();
      expect(openResult).toBeDefined();
    });

    it('should preserve winding of unique icon shapes after removing duplicated backgrounds', () => {
      const bg1 = createCcwSquare(0, 0, 100);
      const bg2 = createCcwSquare(0, 0, 100);
      const iconOuter = createCcwSquare(10, 10, 80); // CCW = outer contour
      const iconHole = createCwSquare(20, 20, 60); // CW = hole

      const result = corrector.correct([bg1, bg2, iconOuter, iconHole]);

      // Backgrounds removed, icon shapes preserved with original winding
      expect(result).toHaveLength(2);

      const outerArea = corrector.computeSignedArea(corrector.sampleContourPoints(result[0].figures));
      const holeArea = corrector.computeSignedArea(corrector.sampleContourPoints(result[1].figures));

      expect(outerArea).toBeGreaterThan(0); // CCW preserved
      expect(holeArea).toBeLessThan(0); // CW preserved
    });

    it('should keep all unique shapes at multiple nesting depths after removing duplicates', () => {
      const bg1 = createCcwSquare(0, 0, 100);
      const bg2 = createCcwSquare(0, 0, 100);
      const middle = createCcwSquare(10, 10, 80);
      const inner = createCwSquare(30, 30, 40);

      const result = corrector.correct([bg1, bg2, middle, inner]);

      // Backgrounds removed, middle and inner preserved
      expect(result).toHaveLength(2);

      const areas = result.map((s) => corrector.computeSignedArea(corrector.sampleContourPoints(s.figures)));

      expect(areas[0]).toBeGreaterThan(0); // middle stays CCW
      expect(areas[1]).toBeLessThan(0); // inner stays CW
    });
  });
});
