import { CubicBezierCurve, Line, Point, QuadraticBezierCurve } from 'geometric-library';
import type { ISvgShape, TStandardFigure } from '@svg-parser';
import type { IPoint2D } from './SvgWindingCorrector.types';

const CURVE_SAMPLE_COUNT = 8;
const DEDUP_EPSILON = 0.1;

export class SvgWindingCorrector {
  public computeContainmentDepth(shapeIndex: number, polygons: IPoint2D[][]): number {
    const testPoint = polygons[shapeIndex][0];
    let depth = 0;

    for (let i = 0; i < polygons.length; i++) {
      if (i === shapeIndex) {
        continue;
      }

      if (this.isPointInsidePolygon(testPoint, polygons[i])) {
        depth++;
      }
    }

    return depth;
  }

  public computeSignedArea(points: IPoint2D[]): number {
    let area = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }

    return area / 2;
  }

  public correct(shapes: ISvgShape[]): ISvgShape[] {
    const closedShapes = shapes.filter((shape) => shape.isClosed);
    const openShapes = shapes.filter((shape) => !shape.isClosed);

    if (closedShapes.length === 0) {
      return shapes;
    }

    const withoutDuplicates = this.removeAllDuplicatedShapes(closedShapes);

    if (withoutDuplicates.length === closedShapes.length) {
      return shapes;
    }

    // Duplicate shapes represent decorative layers (gradients, shadows).
    // Remove them entirely — the remaining unique icon shapes retain their
    // correct winding from the SVG author, preserved through the Y-flip.
    return [...withoutDuplicates, ...openShapes];
  }

  public deduplicateShapes(shapes: ISvgShape[]): ISvgShape[] {
    const unique: ISvgShape[] = [];

    for (const shape of shapes) {
      const isDuplicate = unique.some((existing) => this.areShapesEqual(existing, shape));

      if (!isDuplicate) {
        unique.push(shape);
      }
    }

    return unique;
  }

  public isPointInsidePolygon(point: IPoint2D, polygon: IPoint2D[]): boolean {
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const yi = polygon[i].y;
      const yj = polygon[j].y;

      if (yi > point.y !== yj > point.y) {
        const xIntersect = ((polygon[j].x - polygon[i].x) * (point.y - yi)) / (yj - yi) + polygon[i].x;

        if (point.x < xIntersect) {
          inside = !inside;
        }
      }
    }

    return inside;
  }

  public removeAllDuplicatedShapes(shapes: ISvgShape[]): ISvgShape[] {
    return shapes.filter((shape, index) => {
      return !shapes.some((other, otherIndex) => index !== otherIndex && this.areShapesEqual(shape, other));
    });
  }

  public reverseShapeWinding(shape: ISvgShape): ISvgShape {
    const reversedFigures = [...shape.figures].reverse().map((figure) => this.reverseFigure(figure));

    return { figures: reversedFigures, isClosed: shape.isClosed };
  }

  public sampleContourPoints(figures: TStandardFigure[]): IPoint2D[] {
    const points: IPoint2D[] = [];

    for (const figure of figures) {
      const figurePoints = this.sampleFigurePoints(figure);
      const startIndex = points.length === 0 ? 0 : 1;

      for (let i = startIndex; i < figurePoints.length; i++) {
        points.push(figurePoints[i]);
      }
    }

    return points;
  }

  private areShapesEqual(a: ISvgShape, b: ISvgShape): boolean {
    if (a.figures.length !== b.figures.length) {
      return false;
    }

    for (let i = 0; i < a.figures.length; i++) {
      const aValues = a.figures[i].values as IPoint2D[];
      const bValues = b.figures[i].values as IPoint2D[];

      if (aValues.length !== bValues.length) {
        return false;
      }

      for (let j = 0; j < aValues.length; j++) {
        if (Math.abs(aValues[j].x - bValues[j].x) > DEDUP_EPSILON || Math.abs(aValues[j].y - bValues[j].y) > DEDUP_EPSILON) {
          return false;
        }
      }
    }

    return true;
  }

  private reverseFigure(figure: TStandardFigure): TStandardFigure {
    const points = figure.values as IPoint2D[];
    const reversed = [...points].reverse();
    const pointObjects = reversed.map((p) => new Point([p.x, p.y]));

    if (figure instanceof Line) {
      return new Line(pointObjects as [Point, Point]);
    }

    if (figure instanceof CubicBezierCurve) {
      return new CubicBezierCurve(pointObjects as [Point, Point, Point, Point]);
    }

    if (figure instanceof QuadraticBezierCurve) {
      return new QuadraticBezierCurve(pointObjects as [Point, Point, Point]);
    }

    return figure;
  }

  private sampleCubicBezierPoint(points: IPoint2D[], t: number): IPoint2D {
    const u = 1 - t;
    const u2 = u * u;
    const u3 = u2 * u;
    const t2 = t * t;
    const t3 = t2 * t;

    return {
      x: u3 * points[0].x + 3 * u2 * t * points[1].x + 3 * u * t2 * points[2].x + t3 * points[3].x,
      y: u3 * points[0].y + 3 * u2 * t * points[1].y + 3 * u * t2 * points[2].y + t3 * points[3].y
    };
  }

  private sampleFigurePoints(figure: TStandardFigure): IPoint2D[] {
    const points = figure.values as IPoint2D[];

    if (figure instanceof Line) {
      return [
        { x: points[0].x, y: points[0].y },
        { x: points[1].x, y: points[1].y }
      ];
    }

    if (figure instanceof CubicBezierCurve) {
      const sampled: IPoint2D[] = [];

      for (let i = 0; i <= CURVE_SAMPLE_COUNT; i++) {
        sampled.push(this.sampleCubicBezierPoint(points, i / CURVE_SAMPLE_COUNT));
      }

      return sampled;
    }

    if (figure instanceof QuadraticBezierCurve) {
      const sampled: IPoint2D[] = [];

      for (let i = 0; i <= CURVE_SAMPLE_COUNT; i++) {
        sampled.push(this.sampleQuadraticBezierPoint(points, i / CURVE_SAMPLE_COUNT));
      }

      return sampled;
    }

    return [];
  }

  private sampleQuadraticBezierPoint(points: IPoint2D[], t: number): IPoint2D {
    const u = 1 - t;

    return {
      x: u * u * points[0].x + 2 * u * t * points[1].x + t * t * points[2].x,
      y: u * u * points[0].y + 2 * u * t * points[1].y + t * t * points[2].y
    };
  }
}
