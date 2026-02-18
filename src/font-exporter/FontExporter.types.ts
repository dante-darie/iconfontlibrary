export interface IFontExporterOptions {
  readonly className?: string;
  readonly familyName: string;
  readonly unicodeMap: Record<string, number>;
}

export interface IFontExporterJsonEntry {
  readonly name: string;
  readonly unicode: string;
}
