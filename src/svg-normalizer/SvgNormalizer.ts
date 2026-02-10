import { Calculator, CubicBezierCurve, Line, Point, QuadraticBezierCurve, Vector } from 'geometric-library';
import type { ISvgShape, TStandardFigure } from '@svg-parser';
import type { ISvgNormalizerOptions, ISvgNormalizerResult } from './SvgNormalizer.types';
import { SvgWindingCorrector } from '@svg-winding-corrector';

interface IAggregatedBoundingBox {
  xMax: number;
  xMin: number;
  yMax: number;
  yMin: number;
}

export class SvgNormalizer {
  public normalize(shapes: ISvgShape[], options: ISvgNormalizerOptions): ISvgNormalizerResult {
    if (!shapes.length) {
      throw new Error('SVG_NORMALIZER_EMPTY_INPUT: No shapes provided for normalization.');
    }

    // Remove duplicate decorative layers (gradients, shadows) BEFORE computing
    // the bounding box so that scaling is based on the icon's actual extent.
    const windingCorrector = new SvgWindingCorrector();
    const deduplicatedShapes = windingCorrector.correct(shapes);

    const boundingBox = this.computeAggregateBoundingBox(deduplicatedShapes);
    const svgWidth = Calculator.sub(boundingBox.xMax, boundingBox.xMin).valueOf();
    const svgHeight = Calculator.sub(boundingBox.yMax, boundingBox.yMin).valueOf();

    if (!svgWidth || !svgHeight) {
      throw new Error('SVG_NORMALIZER_ZERO_DIMENSION: Bounding box has zero width or height.');
    }

    const fontHeight = Calculator.sub(options.ascender, options.descender).valueOf();
    const scaleFactor = Calculator.div(fontHeight, svgHeight).valueOf();

    const normalizedShapes = deduplicatedShapes.map((shape) => {
      const normalizedFigures = shape.figures.map((figure) => {
        const transformed = this.transformFigure(figure, scaleFactor, boundingBox, options);
        return this.roundFigure(transformed);
      });

      return { figures: normalizedFigures, isClosed: shape.isClosed };
    });

    const advanceWidth = Math.round(Calculator.mul(svgWidth, scaleFactor).valueOf());

    return { advanceWidth, shapes: normalizedShapes };
  }

  private computeAggregateBoundingBox(shapes: ISvgShape[]): IAggregatedBoundingBox {
    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;

    for (const shape of shapes) {
      for (const figure of shape.figures) {
        const figureBoundingBox = figure.boundingBox;

        xMin = Math.min(xMin, figureBoundingBox.xMin);
        xMax = Math.max(xMax, figureBoundingBox.xMax);
        yMin = Math.min(yMin, figureBoundingBox.yMin);
        yMax = Math.max(yMax, figureBoundingBox.yMax);
      }
    }

    return { xMax, xMin, yMax, yMin };
  }

  private roundCoordinate(value: number): number {
    // Clean up floating-point noise (e.g. 150.4999999998 → 150.5) before
    // snapping to integer. This ensures nearly-identical values produced by
    // independent arithmetic paths always round to the same integer.
    const cleaned = Math.round(value * 1e6) / 1e6;
    return Math.round(cleaned);
  }

  private roundFigure(figure: TStandardFigure): TStandardFigure {
    const points = figure.values as { x: number; y: number }[];
    const rounded = points.map((p) => new Point([this.roundCoordinate(p.x), this.roundCoordinate(p.y)]));

    if (figure instanceof Line) {
      return new Line(rounded as [Point, Point]);
    }

    if (figure instanceof CubicBezierCurve) {
      return new CubicBezierCurve(rounded as [Point, Point, Point, Point]);
    }

    if (figure instanceof QuadraticBezierCurve) {
      return new QuadraticBezierCurve(rounded as [Point, Point, Point]);
    }

    return figure;
  }

  private transformFigure(figure: TStandardFigure, scaleFactor: number, boundingBox: IAggregatedBoundingBox, options: ISvgNormalizerOptions): TStandardFigure {
    const clonedFigure = figure.clone() as TStandardFigure;

    clonedFigure.scaleXY(scaleFactor, -scaleFactor);

    const translateX = Calculator.neg(Calculator.mul(boundingBox.xMin, scaleFactor)).valueOf();
    const translateY = Calculator.add(options.descender, Calculator.mul(boundingBox.yMax, scaleFactor)).valueOf();

    clonedFigure.translate(new Vector([translateX, translateY]));

    return clonedFigure;
  }
}
