export type TUnicodeAssignmentStrategy = 'auto' | 'manual';

export interface IUnicodeAssignment {
  readonly mapping?: Record<string, number>;
  readonly startCodePoint?: number;
  readonly strategy: TUnicodeAssignmentStrategy;
}

export interface IIconFontLibraryOptions {
  readonly familyName: string;
  readonly outputDirectory: string;
  readonly svgDirectories: string[];
  readonly ascender?: number;
  readonly className?: string;
  readonly descender?: number;
  readonly ligatures?: boolean;
  readonly recursive?: boolean;
  readonly styleName?: string;
  readonly unicodeAssignment?: IUnicodeAssignment;
  readonly unitsPerEm?: number;
}

export interface IIconFontLibraryResult {
  readonly fontBuffer: ArrayBuffer;
  readonly glyphNames: string[];
  readonly unicodeMap: Record<string, number>;
}
