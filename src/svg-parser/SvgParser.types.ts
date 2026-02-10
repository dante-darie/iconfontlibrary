import type { ICubicBezierCurve, ILine, IQuadraticBezierCurve } from 'geometric-library';

export type TStandardFigure = ILine | ICubicBezierCurve | IQuadraticBezierCurve;

export interface ISvgShape {
  readonly figures: TStandardFigure[];
  readonly isClosed: boolean;
}

export interface ISvgViewBox {
  readonly height: number;
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
}

export interface ISvgParserResult {
  readonly shapes: ISvgShape[];
  readonly viewBox: ISvgViewBox | undefined;
}
