import * as fs from 'fs';
import * as path from 'path';
import type { ISvgLoaderOptions, ISvgLoaderResult } from './SvgLoader.types';
import { CatchErrorDecorator, ErrorHandler } from 'error-handler';

export class SvgLoader {
  private checkedEntries: Set<string> = new Set();
  private readonly options: ISvgLoaderOptions;

  constructor(options: ISvgLoaderOptions) {
    this.options = options;
  }

  @CatchErrorDecorator
  public load(): ISvgLoaderResult[] {
    const { options } = this;
    const { directoryPaths: paths, recursive = false } = options;
    const results: ISvgLoaderResult[] = [];

    for (const path of paths) {
      if (!this.directoryExists(path)) {
        continue;
      }

      const svgFiles = this.findFiles(path, recursive);

      results.push(...svgFiles);
    }

    return results;
  }

  @CatchErrorDecorator
  private directoryExists(dirPath: string): boolean {
    const itExists = fs.existsSync(dirPath);
    const isDirectory = itExists && fs.statSync(dirPath).isDirectory();

    if (!isDirectory) {
      ErrorHandler.warn(`path is not a directory: ${dirPath}`);
    }

    return isDirectory;
  }

  private findFiles(dirPath: string, recursive: boolean): ISvgLoaderResult[] {
    const results: ISvgLoaderResult[] = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      const isFileEntry = entry.isFile();
      const isDirectoryEntry = entry.isDirectory();
      const entryExtension: string | undefined = isFileEntry ? path.extname(entryPath).toLowerCase() : undefined;

      if (this.checkedEntries.has(entryPath)) {
        continue;
      }

      if (recursive && isDirectoryEntry) {
        const subResults = this.findFiles(entryPath, recursive);

        results.push(...subResults);

        this.checkedEntries.add(entryPath);

        continue;
      }

      if (isFileEntry && entryExtension === '.svg') {
        const fileContent = fs.readFileSync(entryPath, 'utf-8');

        results.push({
          fileName: path.basename(entryPath, path.extname(entryPath)),
          filePath: entryPath,
          fileContent
        });

        this.checkedEntries.add(entryPath);
      }
    }

    results.sort((a, b) => a.fileName.localeCompare(b.fileName));

    return results;
  }
}
