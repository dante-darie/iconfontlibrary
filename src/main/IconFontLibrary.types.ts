export type TUnicodeAssignmentStrategy = 'auto' | 'manual';

export interface IUnicodeAssignment {
  readonly mapping?: Record<string, number>;
  readonly startCodePoint?: number;
  readonly strategy: TUnicodeAssignmentStrategy;
}

export interface IIconFontLibraryOptions {
  readonly ascender?: number;
  readonly descender?: number;
  readonly familyName: string;
  readonly ligatures?: boolean;
  readonly outputDirectory: string;
  readonly recursive?: boolean;
  readonly styleName?: string;
  readonly svgDirectories: string[];
  readonly unicodeAssignment?: IUnicodeAssignment;
  readonly unitsPerEm?: number;
}

export interface IIconFontLibraryResult {
  readonly fontBuffer: ArrayBuffer;
  readonly glyphNames: string[];
  readonly unicodeMap: Record<string, number>;
}
