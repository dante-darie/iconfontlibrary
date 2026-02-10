import opentype from 'opentype.js';
import { CubicBezierCurve, Line, QuadraticBezierCurve } from 'geometric-library';
import type { ISvgNormalizerResult } from '@svg-normalizer';
import type { TStandardFigure } from '@svg-parser';
import type { IGlyphDefinition, IFontOptions } from './SvgOpentypeTransformer.types';

interface ISubstitutionApi {
  addLigature(feature: string, rule: { by: number; sub: number[] }): void;
}

export class SvgOpentypeTransformer {
  public createFont(glyphs: opentype.Glyph[], definitions: IGlyphDefinition[], fontOptions: IFontOptions): opentype.Font {
    const notdefGlyph = new opentype.Glyph({
      advanceWidth: 0,
      name: '.notdef',
      path: new opentype.Path(),
      unicode: 0,
    });

    const ligatureDefinitions = definitions.filter((definition) => definition.ligature !== undefined);
    const characterGlyphs = this.createCharacterGlyphs(ligatureDefinitions);

    const allGlyphs = [notdefGlyph, ...characterGlyphs, ...glyphs];

    const font = new opentype.Font({
      ascender: fontOptions.ascender,
      descender: fontOptions.descender,
      familyName: fontOptions.familyName,
      glyphs: allGlyphs,
      styleName: fontOptions.styleName,
      unitsPerEm: fontOptions.unitsPerEm,
    });

    this.addLigatureSubstitutions(font, ligatureDefinitions, characterGlyphs, allGlyphs);

    return font;
  }

  public createGlyph(definition: IGlyphDefinition): opentype.Glyph {
    const path = this.createPath(definition.normalizedData);

    return new opentype.Glyph({
      advanceWidth: definition.normalizedData.advanceWidth,
      name: definition.name,
      path,
      unicode: definition.unicode,
    });
  }

  public createPath(normalizedData: ISvgNormalizerResult): opentype.Path {
    const path = new opentype.Path();

    for (const shape of normalizedData.shapes) {
      if (shape.figures.length === 0) {
        continue;
      }

      const startPoint = this.getFigureStartPoint(shape.figures[0]);
      path.moveTo(startPoint.x, startPoint.y);

      for (const figure of shape.figures) {
        this.addFigureToPath(path, figure);
      }

      if (shape.isClosed) {
        path.close();
      }
    }

    return path;
  }

  private addFigureToPath(path: opentype.Path, figure: TStandardFigure): void {
    if (figure instanceof Line) {
      path.lineTo(figure.P1.x, figure.P1.y);
      return;
    }

    if (figure instanceof CubicBezierCurve) {
      const points = figure.values as unknown as [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
      path.bezierCurveTo(points[1].x, points[1].y, points[2].x, points[2].y, points[3].x, points[3].y);
      return;
    }

    if (figure instanceof QuadraticBezierCurve) {
      const points = figure.values as unknown as [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
      path.quadraticCurveTo(points[1].x, points[1].y, points[2].x, points[2].y);
    }
  }

  private addLigatureSubstitutions(
    font: opentype.Font,
    ligatureDefinitions: IGlyphDefinition[],
    characterGlyphs: opentype.Glyph[],
    allGlyphs: opentype.Glyph[]
  ): void {
    if (ligatureDefinitions.length === 0) {
      return;
    }

    const substitutionApi = font.substitution as unknown as ISubstitutionApi;

    for (const definition of ligatureDefinitions) {
      const ligatureString = definition.ligature!;
      const iconGlyphIndex = allGlyphs.findIndex((glyph) => glyph.unicode === definition.unicode);

      if (iconGlyphIndex === -1) {
        continue;
      }

      const characterGlyphIndices = [];

      for (const char of ligatureString) {
        const charGlyphIndex = allGlyphs.findIndex(
          (glyph) => characterGlyphs.includes(glyph) && glyph.unicode === char.charCodeAt(0)
        );

        if (charGlyphIndex === -1) {
          break;
        }

        characterGlyphIndices.push(charGlyphIndex);
      }

      if (characterGlyphIndices.length === ligatureString.length) {
        substitutionApi.addLigature('liga', {
          by: iconGlyphIndex,
          sub: characterGlyphIndices,
        });
      }
    }
  }

  private createCharacterGlyphs(ligatureDefinitions: IGlyphDefinition[]): opentype.Glyph[] {
    const uniqueCharacters = new Set<string>();

    for (const definition of ligatureDefinitions) {
      if (definition.ligature) {
        for (const char of definition.ligature) {
          uniqueCharacters.add(char);
        }
      }
    }

    const characterGlyphs: opentype.Glyph[] = [];

    for (const char of uniqueCharacters) {
      const glyph = new opentype.Glyph({
        advanceWidth: 0,
        name: char,
        path: new opentype.Path(),
        unicode: char.charCodeAt(0),
      });
      characterGlyphs.push(glyph);
    }

    return characterGlyphs;
  }

  private getFigureStartPoint(figure: TStandardFigure): { x: number; y: number } {
    if (figure instanceof Line) {
      return { x: figure.P0.x, y: figure.P0.y };
    }

    const values = figure.values as [{ x: number; y: number }, ...unknown[]];
    return { x: values[0].x, y: values[0].y };
  }
}
