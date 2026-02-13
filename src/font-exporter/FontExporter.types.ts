export interface IFontExporterOptions {
  readonly familyName: string;
  readonly unicodeMap: Record<string, number>;
}

export interface IFontExporterJsonEntry {
  readonly name: string;
  readonly unicode: string;
}
