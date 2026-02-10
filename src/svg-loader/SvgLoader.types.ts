export interface ISvgLoaderResult {
  readonly fileContent: string;
  readonly fileName: string;
  readonly filePath: string;
}

export interface ISvgLoaderOptions {
  readonly directoryPaths: string[];
  readonly recursive?: boolean;
}
