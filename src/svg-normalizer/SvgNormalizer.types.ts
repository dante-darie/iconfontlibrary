import type { ISvgShape, ISvgViewBox } from '@svg-parser';

export interface ISvgNormalizerOptions {
  readonly ascender: number;
  readonly descender: number;
  readonly unitsPerEm: number;
  readonly viewBox?: ISvgViewBox;
}

export interface ISvgNormalizerResult {
  readonly advanceWidth: number;
  readonly shapes: ISvgShape[];
}
