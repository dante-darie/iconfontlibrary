import * as fs from 'fs';
import * as path from 'path';
import { SvgLoader } from '@svg-loader';
import type { ISvgLoaderResult } from '@svg-loader';
import { SvgParser } from '@svg-parser';
import { SvgNormalizer } from '@svg-normalizer';
import type { ISvgNormalizerOptions, ISvgNormalizerResult } from '@svg-normalizer';
import { SvgOpentypeTransformer } from '@svg-opentype-transformer';
import type { IGlyphDefinition, IFontOptions } from '@svg-opentype-transformer';
import { FontExporter } from '@font-exporter';
import { CatchErrorDecorator } from 'error-handler';
import type { IIconFontLibraryOptions, IIconFontLibraryResult } from './IconFontLibrary.types';

interface ICacheEntry {
  readonly mtimeMs: number;
  readonly normalizedData: ISvgNormalizerResult;
}

const DEFAULT_ASCENDER = 800;
const DEFAULT_DESCENDER = -200;
const DEFAULT_START_CODE_POINT = 0xe000;
const DEFAULT_STYLE_NAME = 'Regular';
const DEFAULT_UNITS_PER_EM = 1000;

export class IconFontLibrary {
  private readonly cache = new Map<string, ICacheEntry>();
  private readonly options: IIconFontLibraryOptions;

  constructor(options: IIconFontLibraryOptions) {
    this.options = options;
  }

  @CatchErrorDecorator
  public generate(): IIconFontLibraryResult {
    const svgFiles = this.loadSvgFiles();

    this.validateSvgFilesExist(svgFiles);

    const sortedFiles = this.sortFilesByName(svgFiles);
    const unicodeMap = this.assignUnicodes(sortedFiles);
    const normalizerOptions = this.buildNormalizerOptions();
    const fontOptions = this.buildFontOptions();
    const useLigatures = this.options.ligatures ?? true;

    const parser = new SvgParser();
    const normalizer = new SvgNormalizer();
    const transformer = new SvgOpentypeTransformer();

    const definitions: IGlyphDefinition[] = [];

    for (const file of sortedFiles) {
      const mtimeMs = fs.statSync(file.filePath).mtimeMs;
      const cached = this.cache.get(file.fileName);

      let normalizedData: ISvgNormalizerResult;

      if (cached && cached.mtimeMs === mtimeMs) {
        normalizedData = cached.normalizedData;
      } else {
        const parseResult = parser.parse(file.fileContent);

        normalizedData = normalizer.normalize(parseResult.shapes, {
          ...normalizerOptions,
          viewBox: parseResult.viewBox
        });

        this.cache.set(file.fileName, { mtimeMs, normalizedData });
      }

      definitions.push({
        ligature: useLigatures ? file.fileName : undefined,
        name: file.fileName,
        normalizedData,
        unicode: unicodeMap[file.fileName]
      });
    }

    this.evictStaleEntries(sortedFiles);

    const glyphs = definitions.map((definition) => transformer.createGlyph(definition));
    const font = transformer.createFont(glyphs, definitions, fontOptions);
    const fontBuffer = font.toArrayBuffer();

    return {
      fontBuffer,
      glyphNames: sortedFiles.map((file) => file.fileName),
      unicodeMap
    };
  }

  @CatchErrorDecorator
  public generateToFile(): void {
    const result = this.generate();

    if (!result) {
      return;
    }

    const { familyName, outputDirectory } = this.options;

    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true });
    }

    fs.writeFileSync(path.join(outputDirectory, `${familyName}.otf`), new Uint8Array(result.fontBuffer));

    new FontExporter({ className: this.options.className, familyName, unicodeMap: result.unicodeMap }).exportToDirectory(outputDirectory);
  }

  private assignAutoUnicodes(sortedFiles: ISvgLoaderResult[], startCodePoint: number): Record<string, number> {
    const unicodeMap: Record<string, number> = {};

    for (let i = 0; i < sortedFiles.length; i++) {
      unicodeMap[sortedFiles[i].fileName] = startCodePoint + i;
    }

    return unicodeMap;
  }

  private assignManualUnicodes(sortedFiles: ISvgLoaderResult[], mapping: Record<string, number>): Record<string, number> {
    const unicodeMap: Record<string, number> = {};

    for (const file of sortedFiles) {
      if (!(file.fileName in mapping)) {
        throw new Error(`ICON_FONT_UNMAPPED_GLYPH: No unicode mapping found for file: ${file.fileName}`);
      }
      unicodeMap[file.fileName] = mapping[file.fileName];
    }

    return unicodeMap;
  }

  private assignUnicodes(sortedFiles: ISvgLoaderResult[]): Record<string, number> {
    const assignment = this.options.unicodeAssignment;
    const strategy = assignment?.strategy ?? 'auto';

    if (strategy === 'manual') {
      return this.assignManualUnicodes(sortedFiles, assignment?.mapping ?? {});
    }

    return this.assignAutoUnicodes(sortedFiles, assignment?.startCodePoint ?? DEFAULT_START_CODE_POINT);
  }

  private buildFontOptions(): IFontOptions {
    return {
      ascender: this.options.ascender ?? DEFAULT_ASCENDER,
      descender: this.options.descender ?? DEFAULT_DESCENDER,
      familyName: this.options.familyName,
      styleName: this.options.styleName ?? DEFAULT_STYLE_NAME,
      unitsPerEm: this.options.unitsPerEm ?? DEFAULT_UNITS_PER_EM
    };
  }

  private buildNormalizerOptions(): ISvgNormalizerOptions {
    return {
      ascender: this.options.ascender ?? DEFAULT_ASCENDER,
      descender: this.options.descender ?? DEFAULT_DESCENDER,
      unitsPerEm: this.options.unitsPerEm ?? DEFAULT_UNITS_PER_EM
    };
  }

  private evictStaleEntries(sortedFiles: ISvgLoaderResult[]): void {
    const currentFileNames = new Set(sortedFiles.map((file) => file.fileName));

    for (const key of this.cache.keys()) {
      if (!currentFileNames.has(key)) {
        this.cache.delete(key);
      }
    }
  }

  private loadSvgFiles(): ISvgLoaderResult[] {
    const loader = new SvgLoader({
      directoryPaths: this.options.svgDirectories,
      recursive: this.options.recursive
    });

    return loader.load();
  }

  private sortFilesByName(files: ISvgLoaderResult[]): ISvgLoaderResult[] {
    return [...files].sort((a, b) => a.fileName.localeCompare(b.fileName));
  }

  private validateSvgFilesExist(svgFiles: ISvgLoaderResult[]): void {
    if (svgFiles.length === 0) {
      throw new Error('ICON_FONT_NO_SVGS: No SVG files found in the specified directories');
    }
  }
}
