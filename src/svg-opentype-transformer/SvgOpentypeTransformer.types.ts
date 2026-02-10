import type { ISvgNormalizerResult } from '@svg-normalizer';

export interface IGlyphDefinition {
  readonly ligature?: string;
  readonly name: string;
  readonly normalizedData: ISvgNormalizerResult;
  readonly unicode: number;
}

export interface IFontOptions {
  readonly ascender: number;
  readonly descender: number;
  readonly familyName: string;
  readonly styleName: string;
  readonly unitsPerEm: number;
}
