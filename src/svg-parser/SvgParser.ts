import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { ArcCurve, Angle, CubicBezierCurve, Circle, Ellipse, Flag, Line, Magnitude, Point, Polygon, QuadraticBezierCurve, Vector } from 'geometric-library';
import type { ISvgParserResult, ISvgShape, ISvgViewBox, TStandardFigure } from './SvgParser.types';

interface IPathParserState {
  currentX: number;
  currentY: number;
  lastCommand: string | undefined;
  lastControlX: number | undefined;
  lastControlY: number | undefined;
  subPathStartX: number;
  subPathStartY: number;
}

interface IParsedTransform {
  angle?: number;
  centerX?: number;
  centerY?: number;
  scaleX?: number;
  scaleY?: number;
  translateX?: number;
  translateY?: number;
  type: 'translate' | 'scale' | 'rotate';
}

export class SvgParser {
  public parse(svgContent: string): ISvgParserResult {
    const $ = cheerio.load(svgContent, { xmlMode: true });
    const svgElement = $('svg');

    const viewBox = this.parseViewBox(svgElement);
    const shapes: ISvgShape[] = [];

    this.processChildren($, svgElement, shapes, []);

    return { shapes, viewBox };
  }

  private applySingleTransform(figure: TStandardFigure, transform: IParsedTransform): TStandardFigure {
    switch (transform.type) {
      case 'translate': {
        const translateX = transform.translateX ?? 0;
        const translateY = transform.translateY ?? 0;
        figure.translate(new Vector([translateX, translateY]));
        return figure;
      }
      case 'scale': {
        const scaleX = transform.scaleX ?? 1;
        const scaleY = transform.scaleY ?? scaleX;
        const about = transform.centerX !== undefined && transform.centerY !== undefined ? new Point([transform.centerX, transform.centerY]) : undefined;

        if (scaleX === scaleY) {
          figure.scale(scaleX, about);
        } else {
          figure.scaleXY(scaleX, scaleY, about);
        }
        return figure;
      }
      case 'rotate': {
        const angleDegrees = transform.angle ?? 0;
        const angle = new Angle(angleDegrees, 'degrees');
        const about = transform.centerX !== undefined && transform.centerY !== undefined ? new Point([transform.centerX, transform.centerY]) : undefined;
        figure.rotate(angle, about);
        return figure;
      }
    }
  }

  private applyTransformsToFigures(figures: TStandardFigure[], transforms: IParsedTransform[]): TStandardFigure[] {
    if (transforms.length === 0) {
      return figures;
    }

    return figures.map((figure) => {
      let transformedFigure = figure.clone() as TStandardFigure;

      for (const transform of transforms) {
        transformedFigure = this.applySingleTransform(transformedFigure, transform);
      }

      return transformedFigure;
    });
  }

  private createArcCurveFigures(startX: number, startY: number, rx: number, ry: number, xAxisRotation: number, largeArcFlag: number, sweepFlag: number, endX: number, endY: number): TStandardFigure[] {
    const startPoint = new Point([startX, startY]);
    const endPoint = new Point([endX, endY]);
    const radiusX = new Magnitude(Math.abs(rx));
    const radiusY = new Magnitude(Math.abs(ry));
    const rotationAngle = new Angle(xAxisRotation, 'degrees');
    const largeArc = new Flag(largeArcFlag === 1);
    const sweep = new Flag(sweepFlag === 1);

    const arcCurve = new ArcCurve([startPoint, radiusX, radiusY, rotationAngle, largeArc, sweep, endPoint]);
    const cubicBezierCurves = arcCurve.toCubicBezierCurves();

    return cubicBezierCurves;
  }

  private createCircleFigures(cx: number, cy: number, r: number): TStandardFigure[] {
    const center = new Point([cx, cy]);
    const radius = new Magnitude(r);
    const circle = new Circle([center, radius]);
    const cubicBezierCurves = circle.toCubicBezierCurves();

    return cubicBezierCurves;
  }

  private createEllipseFigures(cx: number, cy: number, rx: number, ry: number): TStandardFigure[] {
    const center = new Point([cx, cy]);
    const radiusX = new Magnitude(rx);
    const radiusY = new Magnitude(ry);
    const rotationAngle = new Angle(0, 'degrees');
    const ellipse = new Ellipse([center, radiusX, radiusY, rotationAngle]);
    const cubicBezierCurves = ellipse.toCubicBezierCurves();

    return cubicBezierCurves;
  }

  private createLineFigure(x1: number, y1: number, x2: number, y2: number): TStandardFigure {
    const startPoint = new Point([x1, y1]);
    const endPoint = new Point([x2, y2]);

    return new Line([startPoint, endPoint]);
  }

  private createPolygonFigures(points: number[]): TStandardFigure[] {
    const polygonPoints = [];

    for (let i = 0; i < points.length; i += 2) {
      polygonPoints.push(new Point([points[i], points[i + 1]]));
    }

    if (polygonPoints.length < 3) {
      return [];
    }

    const polygon = new Polygon(polygonPoints as [Point, Point, Point, ...Point[]]);

    return polygon.lines;
  }

  private getNumericAttribute($element: cheerio.Cheerio<Element>, attributeName: string, defaultValue: number): number {
    const value = $element.attr(attributeName);

    if (value === undefined || value === '') {
      return defaultValue;
    }

    const parsed = parseFloat(value);

    return isNaN(parsed) ? defaultValue : parsed;
  }

  private parseCircleElement($element: cheerio.Cheerio<Element>): ISvgShape[] {
    const cx = this.getNumericAttribute($element, 'cx', 0);
    const cy = this.getNumericAttribute($element, 'cy', 0);
    const r = this.getNumericAttribute($element, 'r', 0);

    if (r <= 0) {
      return [];
    }

    const figures = this.createCircleFigures(cx, cy, r);

    return [{ figures, isClosed: true }];
  }

  private parseEllipseElement($element: cheerio.Cheerio<Element>): ISvgShape[] {
    const cx = this.getNumericAttribute($element, 'cx', 0);
    const cy = this.getNumericAttribute($element, 'cy', 0);
    const rx = this.getNumericAttribute($element, 'rx', 0);
    const ry = this.getNumericAttribute($element, 'ry', 0);

    if (rx <= 0 || ry <= 0) {
      return [];
    }

    const figures = this.createEllipseFigures(cx, cy, rx, ry);

    return [{ figures, isClosed: true }];
  }

  private parseLineElement($element: cheerio.Cheerio<Element>): ISvgShape[] {
    const x1 = this.getNumericAttribute($element, 'x1', 0);
    const y1 = this.getNumericAttribute($element, 'y1', 0);
    const x2 = this.getNumericAttribute($element, 'x2', 0);
    const y2 = this.getNumericAttribute($element, 'y2', 0);

    const figure = this.createLineFigure(x1, y1, x2, y2);

    return [{ figures: [figure], isClosed: false }];
  }

  private parsePathData(d: string): ISvgShape[] {
    const tokens = this.tokenizePathData(d);
    const shapes: ISvgShape[] = [];
    let currentShapeFigures: TStandardFigure[] = [];

    const state: IPathParserState = {
      currentX: 0,
      currentY: 0,
      lastCommand: undefined,
      lastControlX: undefined,
      lastControlY: undefined,
      subPathStartX: 0,
      subPathStartY: 0
    };

    let tokenIndex = 0;

    while (tokenIndex < tokens.length) {
      const token = tokens[tokenIndex];

      if (typeof token === 'string') {
        const command = token;
        tokenIndex++;

        const result = this.processPathCommand(command, tokens, tokenIndex, state, currentShapeFigures, shapes);
        tokenIndex = result.nextTokenIndex;
        currentShapeFigures = result.currentShapeFigures;
      } else {
        tokenIndex++;
      }
    }

    if (currentShapeFigures.length > 0) {
      shapes.push({ figures: currentShapeFigures, isClosed: false });
    }

    return shapes;
  }

  private parsePointsAttribute(pointsString: string): number[] {
    const numbers: number[] = [];
    const regex = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(pointsString)) !== null) {
      numbers.push(parseFloat(match[0]));
    }

    return numbers;
  }

  private parsePolygonElement($element: cheerio.Cheerio<Element>): ISvgShape[] {
    const pointsString = $element.attr('points') ?? '';
    const points = this.parsePointsAttribute(pointsString);

    if (points.length < 6) {
      return [];
    }

    const figures = this.createPolygonFigures(points);

    return [{ figures, isClosed: true }];
  }

  private parsePolylineElement($element: cheerio.Cheerio<Element>): ISvgShape[] {
    const pointsString = $element.attr('points') ?? '';
    const points = this.parsePointsAttribute(pointsString);

    if (points.length < 4) {
      return [];
    }

    const figures: TStandardFigure[] = [];

    for (let i = 0; i < points.length - 2; i += 2) {
      const lineFigure = this.createLineFigure(points[i], points[i + 1], points[i + 2], points[i + 3]);
      figures.push(lineFigure);
    }

    return [{ figures, isClosed: false }];
  }

  private parseRectElement($element: cheerio.Cheerio<Element>): ISvgShape[] {
    const x = this.getNumericAttribute($element, 'x', 0);
    const y = this.getNumericAttribute($element, 'y', 0);
    const width = this.getNumericAttribute($element, 'width', 0);
    const height = this.getNumericAttribute($element, 'height', 0);
    const rx = this.getNumericAttribute($element, 'rx', 0);
    const ry = this.getNumericAttribute($element, 'ry', 0);

    if (width <= 0 || height <= 0) {
      return [];
    }

    if (rx > 0 || ry > 0) {
      return this.parseRoundedRect(x, y, width, height, rx, ry);
    }

    const topLeft = new Point([x, y]);
    const topRight = new Point([x + width, y]);
    const bottomRight = new Point([x + width, y + height]);
    const bottomLeft = new Point([x, y + height]);

    const polygon = new Polygon([topLeft, topRight, bottomRight, bottomLeft]);

    return [{ figures: polygon.lines, isClosed: true }];
  }

  private parseRoundedRect(x: number, y: number, width: number, height: number, rx: number, ry: number): ISvgShape[] {
    const effectiveRx = Math.min(rx > 0 ? rx : ry, width / 2);
    const effectiveRy = Math.min(ry > 0 ? ry : rx, height / 2);

    const figures: TStandardFigure[] = [];

    const topLineStart = new Point([x + effectiveRx, y]);
    const topLineEnd = new Point([x + width - effectiveRx, y]);
    figures.push(new Line([topLineStart, topLineEnd]));

    const topRightArcFigures = this.createArcCurveFigures(x + width - effectiveRx, y, effectiveRx, effectiveRy, 0, 0, 1, x + width, y + effectiveRy);
    figures.push(...topRightArcFigures);

    const rightLineStart = new Point([x + width, y + effectiveRy]);
    const rightLineEnd = new Point([x + width, y + height - effectiveRy]);
    figures.push(new Line([rightLineStart, rightLineEnd]));

    const bottomRightArcFigures = this.createArcCurveFigures(x + width, y + height - effectiveRy, effectiveRx, effectiveRy, 0, 0, 1, x + width - effectiveRx, y + height);
    figures.push(...bottomRightArcFigures);

    const bottomLineStart = new Point([x + width - effectiveRx, y + height]);
    const bottomLineEnd = new Point([x + effectiveRx, y + height]);
    figures.push(new Line([bottomLineStart, bottomLineEnd]));

    const bottomLeftArcFigures = this.createArcCurveFigures(x + effectiveRx, y + height, effectiveRx, effectiveRy, 0, 0, 1, x, y + height - effectiveRy);
    figures.push(...bottomLeftArcFigures);

    const leftLineStart = new Point([x, y + height - effectiveRy]);
    const leftLineEnd = new Point([x, y + effectiveRy]);
    figures.push(new Line([leftLineStart, leftLineEnd]));

    const topLeftArcFigures = this.createArcCurveFigures(x, y + effectiveRy, effectiveRx, effectiveRy, 0, 0, 1, x + effectiveRx, y);
    figures.push(...topLeftArcFigures);

    return [{ figures, isClosed: true }];
  }

  private parseTransformAttribute(transformString: string): IParsedTransform[] {
    const transforms: IParsedTransform[] = [];
    const regex = /(translate|scale|rotate)\s*\(([^)]+)\)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(transformString)) !== null) {
      const type = match[1] as 'translate' | 'scale' | 'rotate';
      const params = match[2].split(/[\s,]+/).map(Number);

      switch (type) {
        case 'translate':
          transforms.push({
            translateX: params[0] ?? 0,
            translateY: params[1] ?? 0,
            type: 'translate'
          });
          break;
        case 'scale':
          transforms.push({
            scaleX: params[0] ?? 1,
            scaleY: params[1],
            type: 'scale'
          });
          break;
        case 'rotate':
          transforms.push({
            angle: params[0] ?? 0,
            centerX: params[1],
            centerY: params[2],
            type: 'rotate'
          });
          break;
      }
    }

    return transforms;
  }

  private parseViewBox(svgElement: cheerio.Cheerio<Element>): ISvgViewBox | undefined {
    const viewBoxAttr = svgElement.attr('viewBox');

    if (!viewBoxAttr) {
      return undefined;
    }

    const parts = viewBoxAttr
      .trim()
      .split(/[\s,]+/)
      .map(Number);

    if (parts.length < 4 || parts.some(isNaN)) {
      return undefined;
    }

    return {
      height: parts[3],
      minX: parts[0],
      minY: parts[1],
      width: parts[2]
    };
  }

  private processArcTo(tokens: (string | number)[], startIndex: number, state: IPathParserState, currentShapeFigures: TStandardFigure[], isRelative: boolean): { currentShapeFigures: TStandardFigure[]; nextTokenIndex: number } {
    let tokenIndex = startIndex;

    while (tokenIndex + 6 < tokens.length && typeof tokens[tokenIndex] === 'number') {
      const rx = tokens[tokenIndex] as number;
      const ry = tokens[tokenIndex + 1] as number;
      const xAxisRotation = tokens[tokenIndex + 2] as number;
      const largeArcFlag = tokens[tokenIndex + 3] as number;
      const sweepFlag = tokens[tokenIndex + 4] as number;
      const rawEndX = tokens[tokenIndex + 5] as number;
      const rawEndY = tokens[tokenIndex + 6] as number;

      const endX = isRelative ? state.currentX + rawEndX : rawEndX;
      const endY = isRelative ? state.currentY + rawEndY : rawEndY;

      const arcFigures = this.createArcCurveFigures(state.currentX, state.currentY, rx, ry, xAxisRotation, largeArcFlag, sweepFlag, endX, endY);
      currentShapeFigures.push(...arcFigures);

      state.currentX = endX;
      state.currentY = endY;
      state.lastControlX = undefined;
      state.lastControlY = undefined;
      state.lastCommand = 'A';

      tokenIndex += 7;
    }

    return { currentShapeFigures, nextTokenIndex: tokenIndex };
  }

  private processChildren($: cheerio.CheerioAPI, parentElement: cheerio.Cheerio<Element>, shapes: ISvgShape[], parentTransforms: IParsedTransform[]): void {
    parentElement.children().each((_index, child) => {
      if (child.type !== 'tag') {
        return;
      }

      const $child = $(child);
      const tagName = child.tagName.toLowerCase();

      const elementTransformString = $child.attr('transform') ?? '';
      const elementTransforms = this.parseTransformAttribute(elementTransformString);
      const combinedTransforms = [...parentTransforms, ...elementTransforms];

      if (tagName === 'g') {
        this.processChildren($, $child, shapes, combinedTransforms);
        return;
      }

      const elementShapes = this.processShapeElement(tagName, $child);

      for (const shape of elementShapes) {
        const transformedFigures = this.applyTransformsToFigures(shape.figures, combinedTransforms);
        shapes.push({ figures: transformedFigures, isClosed: shape.isClosed });
      }
    });
  }

  private processClosePath(tokenIndex: number, state: IPathParserState, currentShapeFigures: TStandardFigure[], shapes: ISvgShape[]): { currentShapeFigures: TStandardFigure[]; nextTokenIndex: number } {
    if (state.currentX !== state.subPathStartX || state.currentY !== state.subPathStartY) {
      const closingLine = this.createLineFigure(state.currentX, state.currentY, state.subPathStartX, state.subPathStartY);
      currentShapeFigures.push(closingLine);
    }

    if (currentShapeFigures.length > 0) {
      shapes.push({ figures: currentShapeFigures, isClosed: true });
    }

    state.currentX = state.subPathStartX;
    state.currentY = state.subPathStartY;
    state.lastControlX = undefined;
    state.lastControlY = undefined;
    state.lastCommand = 'Z';

    return { currentShapeFigures: [], nextTokenIndex: tokenIndex };
  }

  private processCubicBezierTo(tokens: (string | number)[], startIndex: number, state: IPathParserState, currentShapeFigures: TStandardFigure[], isRelative: boolean): { currentShapeFigures: TStandardFigure[]; nextTokenIndex: number } {
    let tokenIndex = startIndex;

    while (tokenIndex + 5 < tokens.length && typeof tokens[tokenIndex] === 'number') {
      const rawCp1X = tokens[tokenIndex] as number;
      const rawCp1Y = tokens[tokenIndex + 1] as number;
      const rawCp2X = tokens[tokenIndex + 2] as number;
      const rawCp2Y = tokens[tokenIndex + 3] as number;
      const rawEndX = tokens[tokenIndex + 4] as number;
      const rawEndY = tokens[tokenIndex + 5] as number;

      const cp1X = isRelative ? state.currentX + rawCp1X : rawCp1X;
      const cp1Y = isRelative ? state.currentY + rawCp1Y : rawCp1Y;
      const cp2X = isRelative ? state.currentX + rawCp2X : rawCp2X;
      const cp2Y = isRelative ? state.currentY + rawCp2Y : rawCp2Y;
      const endX = isRelative ? state.currentX + rawEndX : rawEndX;
      const endY = isRelative ? state.currentY + rawEndY : rawEndY;

      const startPoint = new Point([state.currentX, state.currentY]);
      const controlPoint1 = new Point([cp1X, cp1Y]);
      const controlPoint2 = new Point([cp2X, cp2Y]);
      const endPoint = new Point([endX, endY]);

      const curve = new CubicBezierCurve([startPoint, controlPoint1, controlPoint2, endPoint]);
      currentShapeFigures.push(curve);

      state.currentX = endX;
      state.currentY = endY;
      state.lastControlX = cp2X;
      state.lastControlY = cp2Y;
      state.lastCommand = 'C';

      tokenIndex += 6;
    }

    return { currentShapeFigures, nextTokenIndex: tokenIndex };
  }

  private processHorizontalLineTo(tokens: (string | number)[], startIndex: number, state: IPathParserState, currentShapeFigures: TStandardFigure[], isRelative: boolean): { currentShapeFigures: TStandardFigure[]; nextTokenIndex: number } {
    let tokenIndex = startIndex;

    while (tokenIndex < tokens.length && typeof tokens[tokenIndex] === 'number') {
      const rawX = tokens[tokenIndex] as number;
      const endX = isRelative ? state.currentX + rawX : rawX;

      const lineFigure = this.createLineFigure(state.currentX, state.currentY, endX, state.currentY);
      currentShapeFigures.push(lineFigure);

      state.currentX = endX;
      state.lastControlX = undefined;
      state.lastControlY = undefined;
      state.lastCommand = 'H';

      tokenIndex += 1;
    }

    return { currentShapeFigures, nextTokenIndex: tokenIndex };
  }

  private processLineTo(tokens: (string | number)[], startIndex: number, state: IPathParserState, currentShapeFigures: TStandardFigure[], isRelative: boolean): { currentShapeFigures: TStandardFigure[]; nextTokenIndex: number } {
    let tokenIndex = startIndex;

    while (tokenIndex + 1 < tokens.length && typeof tokens[tokenIndex] === 'number') {
      const rawX = tokens[tokenIndex] as number;
      const rawY = tokens[tokenIndex + 1] as number;

      const endX = isRelative ? state.currentX + rawX : rawX;
      const endY = isRelative ? state.currentY + rawY : rawY;

      const lineFigure = this.createLineFigure(state.currentX, state.currentY, endX, endY);
      currentShapeFigures.push(lineFigure);

      state.currentX = endX;
      state.currentY = endY;
      state.lastControlX = undefined;
      state.lastControlY = undefined;
      state.lastCommand = 'L';

      tokenIndex += 2;
    }

    return { currentShapeFigures, nextTokenIndex: tokenIndex };
  }

  private processMoveTo(
    tokens: (string | number)[],
    startIndex: number,
    state: IPathParserState,
    currentShapeFigures: TStandardFigure[],
    shapes: ISvgShape[],
    isRelative: boolean
  ): { currentShapeFigures: TStandardFigure[]; nextTokenIndex: number } {
    if (currentShapeFigures.length > 0) {
      shapes.push({ figures: currentShapeFigures, isClosed: false });
      currentShapeFigures = [];
    }

    let tokenIndex = startIndex;

    if (tokenIndex + 1 < tokens.length && typeof tokens[tokenIndex] === 'number') {
      const rawX = tokens[tokenIndex] as number;
      const rawY = tokens[tokenIndex + 1] as number;

      const moveToX = isRelative ? state.currentX + rawX : rawX;
      const moveToY = isRelative ? state.currentY + rawY : rawY;

      state.currentX = moveToX;
      state.currentY = moveToY;
      state.subPathStartX = moveToX;
      state.subPathStartY = moveToY;
      state.lastControlX = undefined;
      state.lastControlY = undefined;
      state.lastCommand = 'M';

      tokenIndex += 2;
    }

    while (tokenIndex + 1 < tokens.length && typeof tokens[tokenIndex] === 'number') {
      const rawX = tokens[tokenIndex] as number;
      const rawY = tokens[tokenIndex + 1] as number;

      const endX = isRelative ? state.currentX + rawX : rawX;
      const endY = isRelative ? state.currentY + rawY : rawY;

      const lineFigure = this.createLineFigure(state.currentX, state.currentY, endX, endY);
      currentShapeFigures.push(lineFigure);

      state.currentX = endX;
      state.currentY = endY;
      state.lastCommand = 'L';

      tokenIndex += 2;
    }

    return { currentShapeFigures, nextTokenIndex: tokenIndex };
  }

  private processPathCommand(
    command: string,
    tokens: (string | number)[],
    tokenIndex: number,
    state: IPathParserState,
    currentShapeFigures: TStandardFigure[],
    shapes: ISvgShape[]
  ): { currentShapeFigures: TStandardFigure[]; nextTokenIndex: number } {
    const isRelative = command === command.toLowerCase();
    const commandUpper = command.toUpperCase();

    switch (commandUpper) {
      case 'M':
        return this.processMoveTo(tokens, tokenIndex, state, currentShapeFigures, shapes, isRelative);
      case 'L':
        return this.processLineTo(tokens, tokenIndex, state, currentShapeFigures, isRelative);
      case 'H':
        return this.processHorizontalLineTo(tokens, tokenIndex, state, currentShapeFigures, isRelative);
      case 'V':
        return this.processVerticalLineTo(tokens, tokenIndex, state, currentShapeFigures, isRelative);
      case 'C':
        return this.processCubicBezierTo(tokens, tokenIndex, state, currentShapeFigures, isRelative);
      case 'S':
        return this.processSmoothCubicBezierTo(tokens, tokenIndex, state, currentShapeFigures, isRelative);
      case 'Q':
        return this.processQuadraticBezierTo(tokens, tokenIndex, state, currentShapeFigures, isRelative);
      case 'T':
        return this.processSmoothQuadraticBezierTo(tokens, tokenIndex, state, currentShapeFigures, isRelative);
      case 'A':
        return this.processArcTo(tokens, tokenIndex, state, currentShapeFigures, isRelative);
      case 'Z':
        return this.processClosePath(tokenIndex, state, currentShapeFigures, shapes);
      default:
        return { currentShapeFigures, nextTokenIndex: tokenIndex };
    }
  }

  private processQuadraticBezierTo(tokens: (string | number)[], startIndex: number, state: IPathParserState, currentShapeFigures: TStandardFigure[], isRelative: boolean): { currentShapeFigures: TStandardFigure[]; nextTokenIndex: number } {
    let tokenIndex = startIndex;

    while (tokenIndex + 3 < tokens.length && typeof tokens[tokenIndex] === 'number') {
      const rawCpX = tokens[tokenIndex] as number;
      const rawCpY = tokens[tokenIndex + 1] as number;
      const rawEndX = tokens[tokenIndex + 2] as number;
      const rawEndY = tokens[tokenIndex + 3] as number;

      const cpX = isRelative ? state.currentX + rawCpX : rawCpX;
      const cpY = isRelative ? state.currentY + rawCpY : rawCpY;
      const endX = isRelative ? state.currentX + rawEndX : rawEndX;
      const endY = isRelative ? state.currentY + rawEndY : rawEndY;

      const startPoint = new Point([state.currentX, state.currentY]);
      const controlPoint = new Point([cpX, cpY]);
      const endPoint = new Point([endX, endY]);

      const curve = new QuadraticBezierCurve([startPoint, controlPoint, endPoint]);
      currentShapeFigures.push(curve);

      state.currentX = endX;
      state.currentY = endY;
      state.lastControlX = cpX;
      state.lastControlY = cpY;
      state.lastCommand = 'Q';

      tokenIndex += 4;
    }

    return { currentShapeFigures, nextTokenIndex: tokenIndex };
  }

  private processShapeElement(tagName: string, $element: cheerio.Cheerio<Element>): ISvgShape[] {
    switch (tagName) {
      case 'path':
        return this.parsePathData($element.attr('d') ?? '');
      case 'rect':
        return this.parseRectElement($element);
      case 'circle':
        return this.parseCircleElement($element);
      case 'ellipse':
        return this.parseEllipseElement($element);
      case 'line':
        return this.parseLineElement($element);
      case 'polygon':
        return this.parsePolygonElement($element);
      case 'polyline':
        return this.parsePolylineElement($element);
      default:
        return [];
    }
  }

  private processSmoothCubicBezierTo(
    tokens: (string | number)[],
    startIndex: number,
    state: IPathParserState,
    currentShapeFigures: TStandardFigure[],
    isRelative: boolean
  ): { currentShapeFigures: TStandardFigure[]; nextTokenIndex: number } {
    let tokenIndex = startIndex;

    while (tokenIndex + 3 < tokens.length && typeof tokens[tokenIndex] === 'number') {
      const rawCp2X = tokens[tokenIndex] as number;
      const rawCp2Y = tokens[tokenIndex + 1] as number;
      const rawEndX = tokens[tokenIndex + 2] as number;
      const rawEndY = tokens[tokenIndex + 3] as number;

      let cp1X: number;
      let cp1Y: number;

      if (state.lastCommand === 'C' || state.lastCommand === 'S') {
        cp1X = 2 * state.currentX - (state.lastControlX ?? state.currentX);
        cp1Y = 2 * state.currentY - (state.lastControlY ?? state.currentY);
      } else {
        cp1X = state.currentX;
        cp1Y = state.currentY;
      }

      const cp2X = isRelative ? state.currentX + rawCp2X : rawCp2X;
      const cp2Y = isRelative ? state.currentY + rawCp2Y : rawCp2Y;
      const endX = isRelative ? state.currentX + rawEndX : rawEndX;
      const endY = isRelative ? state.currentY + rawEndY : rawEndY;

      const startPoint = new Point([state.currentX, state.currentY]);
      const controlPoint1 = new Point([cp1X, cp1Y]);
      const controlPoint2 = new Point([cp2X, cp2Y]);
      const endPoint = new Point([endX, endY]);

      const curve = new CubicBezierCurve([startPoint, controlPoint1, controlPoint2, endPoint]);
      currentShapeFigures.push(curve);

      state.currentX = endX;
      state.currentY = endY;
      state.lastControlX = cp2X;
      state.lastControlY = cp2Y;
      state.lastCommand = 'S';

      tokenIndex += 4;
    }

    return { currentShapeFigures, nextTokenIndex: tokenIndex };
  }

  private processSmoothQuadraticBezierTo(
    tokens: (string | number)[],
    startIndex: number,
    state: IPathParserState,
    currentShapeFigures: TStandardFigure[],
    isRelative: boolean
  ): { currentShapeFigures: TStandardFigure[]; nextTokenIndex: number } {
    let tokenIndex = startIndex;

    while (tokenIndex + 1 < tokens.length && typeof tokens[tokenIndex] === 'number') {
      const rawEndX = tokens[tokenIndex] as number;
      const rawEndY = tokens[tokenIndex + 1] as number;

      let cpX: number;
      let cpY: number;

      if (state.lastCommand === 'Q' || state.lastCommand === 'T') {
        cpX = 2 * state.currentX - (state.lastControlX ?? state.currentX);
        cpY = 2 * state.currentY - (state.lastControlY ?? state.currentY);
      } else {
        cpX = state.currentX;
        cpY = state.currentY;
      }

      const endX = isRelative ? state.currentX + rawEndX : rawEndX;
      const endY = isRelative ? state.currentY + rawEndY : rawEndY;

      const startPoint = new Point([state.currentX, state.currentY]);
      const controlPoint = new Point([cpX, cpY]);
      const endPoint = new Point([endX, endY]);

      const curve = new QuadraticBezierCurve([startPoint, controlPoint, endPoint]);
      currentShapeFigures.push(curve);

      state.currentX = endX;
      state.currentY = endY;
      state.lastControlX = cpX;
      state.lastControlY = cpY;
      state.lastCommand = 'T';

      tokenIndex += 2;
    }

    return { currentShapeFigures, nextTokenIndex: tokenIndex };
  }

  private processVerticalLineTo(tokens: (string | number)[], startIndex: number, state: IPathParserState, currentShapeFigures: TStandardFigure[], isRelative: boolean): { currentShapeFigures: TStandardFigure[]; nextTokenIndex: number } {
    let tokenIndex = startIndex;

    while (tokenIndex < tokens.length && typeof tokens[tokenIndex] === 'number') {
      const rawY = tokens[tokenIndex] as number;
      const endY = isRelative ? state.currentY + rawY : rawY;

      const lineFigure = this.createLineFigure(state.currentX, state.currentY, state.currentX, endY);
      currentShapeFigures.push(lineFigure);

      state.currentY = endY;
      state.lastControlX = undefined;
      state.lastControlY = undefined;
      state.lastCommand = 'V';

      tokenIndex += 1;
    }

    return { currentShapeFigures, nextTokenIndex: tokenIndex };
  }

  private tokenizePathData(d: string): (string | number)[] {
    const tokens: (string | number)[] = [];
    const regex = /([MmLlHhVvCcSsQqTtAaZz])|(-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(d)) !== null) {
      if (match[1]) {
        tokens.push(match[1]);
      } else {
        tokens.push(parseFloat(match[0]));
      }
    }

    return tokens;
  }
}
