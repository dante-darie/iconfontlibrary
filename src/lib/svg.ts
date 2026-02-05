import { load as cheerioLoad, CheerioAPI, Cheerio } from 'cheerio';
import { Element } from 'domhandler';
import {
  Angle,
  ArcCurve,
  Circle,
  CubicBezierCurve,
  Ellipse,
  Flag,
  IArcCurve,
  ICircle,
  ICubicBezierCurve,
  IEllipse,
  ILine,
  IPoint,
  IPolygon,
  IQuadraticBezierCurve,
  Line,
  Magnitude,
  Point,
  Polygon,
  QuadraticBezierCurve,
  TLineValues,
  TPolygonValues,
  Vector
} from 'geometric-library';

type TStandardPathShape = ILine | ICubicBezierCurve | IQuadraticBezierCurve;
type TSvgPathShape = TStandardPathShape | IArcCurve;
type TShape = TSvgPathShape | ICircle | IEllipse | IPolygon;

const pathCommandsValueGroupLength = new Map([
  ['m', 2],
  ['l', 2],
  ['h', 1],
  ['v', 1],
  ['c', 6],
  ['s', 4],
  ['q', 4],
  ['t', 2],
  ['a', 7],
  ['z', 0]
]);
const shapeTags: string[] = ['rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path'];

export class Parser {
  public shapes: TShape[] = [];
  public standardShapes: TStandardPathShape[] = [];
  private $: CheerioAPI;

  constructor(svgString: string) {
    this.$ = cheerioLoad(svgString, {
      xmlMode: true
    });
    this.parse();
    this.normalizeShapes();
  }

  private normalizeShapes() {
    const standardShapes: TStandardPathShape[] = [];

    this.shapes.forEach((shape) => {
      if (shape instanceof Line || shape instanceof CubicBezierCurve || shape instanceof QuadraticBezierCurve) {
        standardShapes.push(shape);
      }

      if (shape instanceof ArcCurve) {
        standardShapes.push(...shape.toCubicBezierCurves());
      }

      if (shape instanceof Circle || shape instanceof Ellipse) {
        standardShapes.push(...shape.toCubicBezierCurves());
      }

      if (shape instanceof Polygon) {
        standardShapes.push(...shape.lines);
      }
    });

    this.standardShapes = standardShapes;
  }

  private parse(): void {
    const shapesSelector = shapeTags.join(', ');

    this.$('svg')
      .find(shapesSelector)
      .each((_index, element) => {
        const $element = this.$(element);
        const tagName = element.tagName.toLowerCase();

        let shapes: TShape[] | undefined;
        switch (tagName) {
          case 'circle':
            shapes = this.parseCircle($element);
            break;
          case 'ellipse':
            shapes = this.parseEllipse($element);
            break;
          case 'line':
            shapes = this.parseLine($element);
            break;
          case 'path':
            shapes = this.parsePath($element);
            break;
          case 'polygon':
            shapes = this.parsePolygon($element);
            break;
          case 'polyline':
            shapes = this.parsePolyline($element);
            break;
          case 'rect':
            shapes = this.parseRect($element);
            break;
          default:
            return;
        }

        if (!shapes?.length) {
          return;
        }

        this.shapes = shapes;
      });
  }

  private parseCircle($circle: Cheerio<Element>): ICircle[] | undefined {
    const cx = $circle.attr('cx');
    const cy = $circle.attr('cy');
    const r = $circle.attr('r');

    if (!cx || !cy || !r) {
      return;
    }

    const center = new Point([+cx, +cy]);
    const radius = new Magnitude(+r);
    const circle = new Circle([center, radius]);

    return [circle];
  }

  private parseEllipse($ellipse: Cheerio<Element>): IEllipse[] | ICircle[] | undefined {
    const cxAttribute = $ellipse.attr('cx');
    const cyAttribute = $ellipse.attr('cy');
    const rx = $ellipse.attr('rx');
    const ry = $ellipse.attr('ry');
    const cx = cxAttribute ? +cxAttribute : 0;
    const cy = cyAttribute ? +cyAttribute : 0;

    if (!rx && !ry) {
      return;
    }

    const center = new Point([cx, cy]);
    const isCircle = rx === ry || (rx && !ry) || (!rx && ry);

    if (isCircle) {
      const radius = rx ? +rx : +ry!;
      const circle = new Circle([center, new Magnitude(radius)]);

      return [circle];
    }

    const ellipse = new Ellipse([center, new Magnitude(+rx!), new Magnitude(+ry!), new Angle(0, 'degrees')]);

    return [ellipse];
  }

  private parseLine($line: Cheerio<Element>): ILine[] | undefined {
    const x1 = $line.attr('x1');
    const y1 = $line.attr('y1');
    const x2 = $line.attr('x2');
    const y2 = $line.attr('y2');

    if (!x1 || !y1 || !x2 || !y2) {
      return;
    }

    const A = new Point([+x1, +y1]);
    const B = new Point([+x2, +y2]);
    const line = new Line([A, B]);

    return [line];
  }

  private parsePath($path: Cheerio<Element>): TSvgPathShape[] | undefined {
    const commandsAttribute = $path.attr('d');

    if (!commandsAttribute) {
      return;
    }

    const sanitizedCommandsAttribute = commandsAttribute.trim().replace(/[ ,]+/g, ' ').replace(/-/g, ' -');
    let commandStrings = sanitizedCommandsAttribute.match(/[mlhvcsqtaz][^mlhvcsqtaz]*/gi) as Array<string>;

    if (!commandStrings?.length) {
      return;
    }

    commandStrings = commandStrings.reduce((commandStrings, commandString) => {
      const command = commandString[0];
      const valuesString = commandString.substring(1).trim();
      const values = valuesString.split(' ');
      const groupLength = pathCommandsValueGroupLength.get(command.toLowerCase());

      if (command.toLowerCase() === 'z') {
        commandStrings.push(command);

        return commandStrings;
      }

      if (!groupLength || values.length % groupLength) {
        return commandStrings;
      }

      const groupedValues = values.reduce((groupValues, value, valueIndex) => {
        const groupIndex = Math.floor(valueIndex / groupLength);
        const group = groupValues[groupIndex] || (groupValues[groupIndex] = []);

        group.push(value);

        return groupValues;
      }, [] as string[][]);
      const groupCommandStrings = groupedValues.map((groupValues) => `${command} ${groupValues.join(' ')}`);

      commandStrings.push(...groupCommandStrings);

      return commandStrings;
    }, [] as string[]);

    const shapes: TSvgPathShape[] = [];
    const cursor = new Point([0, 0]);

    let lastCubicControlPoint: IPoint | undefined;
    let lastQuadraticControlPoint: IPoint | undefined;
    commandStrings?.forEach((commandString: string) => {
      const command = commandString[0];
      const valuesString = commandString.substring(1).trim();
      const values = valuesString.split(' ');

      switch (command) {
        case 'Z':
        case 'z': {
          cursor.replace(new Point([0, 0]));
          lastCubicControlPoint = undefined;
          lastQuadraticControlPoint = undefined;
          break;
        }
        case 'M': {
          const [x, y] = values;

          cursor.replace(new Point([+x, +y]));
          lastCubicControlPoint = undefined;
          lastQuadraticControlPoint = undefined;
          break;
        }
        case 'm': {
          const [dx, dy] = values;

          cursor.translate(new Vector([+dx, +dy]));
          lastCubicControlPoint = undefined;
          lastQuadraticControlPoint = undefined;
          break;
        }
        case 'L': {
          const [x2, y2] = values;
          const P1 = cursor.clone();
          const P2 = new Point([+x2, +y2]);
          const line = new Line([P1, P2]);

          shapes.push(line);
          cursor.replace(P2.clone());
          lastCubicControlPoint = undefined;
          lastQuadraticControlPoint = undefined;
          break;
        }
        case 'l': {
          const [dx2, dy2] = values;
          const P1 = cursor.clone();
          const P2 = P1.clone().translate(new Vector([+dx2, +dy2]));
          const line = new Line([P1, P2]);

          shapes.push(line);
          cursor.replace(P2.clone());
          lastCubicControlPoint = undefined;
          lastQuadraticControlPoint = undefined;
          break;
        }
        case 'H': {
          const [x] = values;
          const P1 = cursor.clone();
          const P2 = new Point([+x, P1.y]);
          const line = new Line([P1, P2]);

          shapes.push(line);
          cursor.replace(P2.clone());
          lastCubicControlPoint = undefined;
          lastQuadraticControlPoint = undefined;
          break;
        }
        case 'h': {
          const [dx] = values;
          const P1 = cursor.clone();
          const P2 = P1.clone().translate(new Vector([+dx, 0]));
          const line = new Line([P1, P2]);

          shapes.push(line);
          cursor.replace(P2.clone());
          lastCubicControlPoint = undefined;
          lastQuadraticControlPoint = undefined;
          break;
        }
        case 'V': {
          const [y] = values;
          const P1 = cursor.clone();
          const P2 = new Point([P1.x, +y]);
          const line = new Line([P1, P2]);

          shapes.push(line);
          cursor.replace(P2.clone());
          lastCubicControlPoint = undefined;
          lastQuadraticControlPoint = undefined;
          break;
        }
        case 'v': {
          const [dy] = values;
          const P1 = cursor.clone();
          const P2 = P1.clone().translate(new Vector([0, +dy]));
          const line = new Line([P1, P2]);

          shapes.push(line);
          cursor.replace(P2.clone());
          lastCubicControlPoint = undefined;
          lastQuadraticControlPoint = undefined;
          break;
        }
        case 'C': {
          const [x1, y1, x2, y2, x, y] = values;
          const P1 = cursor.clone();
          const P2 = new Point([+x, +y]);
          const C1 = new Point([+x1, +y1]);
          const C2 = new Point([+x2, +y2]);
          const cubicBezier = new CubicBezierCurve([P1, C1, C2, P2]);

          shapes.push(cubicBezier);
          cursor.replace(P2.clone());
          lastCubicControlPoint = C2;
          lastQuadraticControlPoint = undefined;
          break;
        }
        case 'c': {
          const [dx1, dy1, dx2, dy2, dx, dy] = values;
          const P1 = cursor.clone();
          const P2 = P1.clone().translate(new Vector([+dx, +dy]));
          const C1 = P1.clone().translate(new Vector([+dx1, +dy1]));
          const C2 = P1.clone().translate(new Vector([+dx2, +dy2]));
          const cubicBezier = new CubicBezierCurve([P1, C1, C2, P2]);

          shapes.push(cubicBezier);
          cursor.replace(P2.clone());
          lastCubicControlPoint = C2;
          lastQuadraticControlPoint = undefined;
          break;
        }
        case 'S': {
          const [x2, y2, x, y] = values;
          const P1 = cursor.clone();
          const P2 = new Point([+x, +y]);
          const C1 = !lastCubicControlPoint ? P1.clone() : lastCubicControlPoint.clone().reflect(P1);
          const C2 = new Point([+x2, +y2]);
          const cubicBezier = new CubicBezierCurve([P1, C1, C2, P2]);

          shapes.push(cubicBezier);
          cursor.replace(P2.clone());
          lastCubicControlPoint = C2;
          lastQuadraticControlPoint = undefined;
          break;
        }
        case 's': {
          const [dx2, dy2, dx, dy] = values;
          const P1 = cursor.clone();
          const P2 = P1.clone().translate(new Vector([+dx, +dy]));
          const C1 = !lastCubicControlPoint ? P1.clone() : lastCubicControlPoint.clone().reflect(P1);
          const C2 = P1.clone().translate(new Vector([+dx2, +dy2]));
          const cubicBezier = new CubicBezierCurve([P1, C1, C2, P2]);

          shapes.push(cubicBezier);
          cursor.replace(P2.clone());
          lastCubicControlPoint = C2;
          lastQuadraticControlPoint = undefined;
          break;
        }
        case 'Q': {
          const [x1, y1, x, y] = values;
          const P1 = cursor.clone();
          const P2 = new Point([+x, +y]);
          const C = new Point([+x1, +y1]);
          const quadraticBezier = new QuadraticBezierCurve([P1, C, P2]);

          shapes.push(quadraticBezier);
          cursor.replace(P2.clone());
          lastCubicControlPoint = undefined;
          lastQuadraticControlPoint = C;
          break;
        }
        case 'q': {
          const [dx1, dy1, dx, dy] = values;
          const P1 = cursor.clone();
          const P2 = P1.clone().translate(new Vector([+dx, +dy]));
          const C = P1.clone().translate(new Vector([+dx1, +dy1]));
          const quadraticBezier = new QuadraticBezierCurve([P1, C, P2]);

          shapes.push(quadraticBezier);
          cursor.replace(P2.clone());
          lastCubicControlPoint = undefined;
          lastQuadraticControlPoint = C;
          break;
        }
        case 'T': {
          const [x, y] = values;
          const P1 = cursor.clone();
          const P2 = new Point([+x, +y]);
          const C = !lastQuadraticControlPoint ? P1.clone() : lastQuadraticControlPoint.clone().reflect(P1);
          const quadraticBezier = new QuadraticBezierCurve([P1, C, P2]);

          shapes.push(quadraticBezier);
          cursor.replace(P2.clone());
          lastCubicControlPoint = undefined;
          lastQuadraticControlPoint = C;
          break;
        }
        case 't': {
          const [dx, dy] = values;
          const P1 = cursor.clone();
          const P2 = P1.clone().translate(new Vector([+dx, +dy]));
          const C = !lastQuadraticControlPoint ? P1.clone() : lastQuadraticControlPoint.clone().reflect(P1);
          const quadraticBezier = new QuadraticBezierCurve([P1, C, P2]);

          shapes.push(quadraticBezier);
          cursor.replace(P2.clone());
          lastCubicControlPoint = undefined;
          lastQuadraticControlPoint = C;
          break;
        }
        case 'A': {
          const [rx, ry, angle, largeArcFlag, sweepFlag, x, y] = values;
          const P1 = cursor.clone();
          const P2 = new Point([+x, +y]);
          const arc = new ArcCurve([P1, new Magnitude(+rx), new Magnitude(+ry), new Angle(+angle, 'degrees'), new Flag(!!largeArcFlag), new Flag(!!sweepFlag), P2]);

          shapes.push(arc);
          cursor.replace(P2.clone());
          lastCubicControlPoint = undefined;
          lastQuadraticControlPoint = undefined;
          break;
        }
        case 'a': {
          const [rx, ry, angle, largeArcFlag, sweepFlag, dx, dy] = values;
          const P1 = cursor.clone();
          const P2 = P1.clone().translate(new Vector([+dx, +dy]));
          const arc = new ArcCurve([P1, new Magnitude(+rx), new Magnitude(+ry), new Angle(+angle, 'degrees'), new Flag(!!largeArcFlag), new Flag(!!sweepFlag), P2]);

          shapes.push(arc);
          cursor.replace(P2.clone());
          lastCubicControlPoint = undefined;
          lastQuadraticControlPoint = undefined;
          break;
        }
        default:
          break;
      }
    });

    return shapes;
  }

  private parsePolygon($polygon: Cheerio<Element>): IPolygon[] | ILine[] | undefined {
    const pointsAttribute = $polygon.attr('points');

    if (!pointsAttribute) {
      return;
    }

    const sanitizedPointsAttribute = pointsAttribute.trim();
    const pairs = sanitizedPointsAttribute.split(' ').filter(Boolean);
    const points = pairs.reduce((points, pair) => {
      const [x, y] = pair.split(',');

      if (!x || !y) {
        return points;
      }

      const point = new Point([+x, +y]);

      points.push(point);

      return points;
    }, [] as Point[]);

    if (points.length < 2) {
      return;
    }

    if (points.length === 2) {
      const line = new Line(points as unknown as TLineValues);

      return [line];
    }

    const polygon = new Polygon(points as unknown as TPolygonValues);

    return [polygon];
  }

  private parsePolyline($polyline: Cheerio<Element>): ILine[] | undefined {
    const pointsAttribute = $polyline.attr('points');

    if (!pointsAttribute) {
      return;
    }

    const sanitizedPointsAttribute = pointsAttribute.trim();
    const pairs = sanitizedPointsAttribute.split(' ').filter(Boolean);
    const points = pairs.reduce((points, pair) => {
      const [x, y] = pair.split(',');

      if (!x || !y) {
        return points;
      }

      const point = new Point([+x, +y]);

      points.push(point);

      return points;
    }, [] as Point[]);
    const lines: ILine[] = points.reduce((lines, pointA, pointAIndex) => {
      const lastIndex = points.length - 1;
      const isALastPoint = pointAIndex === lastIndex;

      if (isALastPoint) {
        return lines;
      }

      const pointBIndex = pointAIndex + 1;
      const pointB = points[pointBIndex];
      const line = new Line([pointA, pointB]);

      lines.push(line);

      return lines;
    }, [] as ILine[]);

    return lines;
  }

  private parseRect($rect: Cheerio<Element>): IPolygon[] | undefined {
    const xAttribute = $rect.attr('x');
    const yAttribute = $rect.attr('y');
    const rxAttribute = $rect.attr('rx');
    const ryAttribute = $rect.attr('ry');
    const width = $rect.attr('width');
    const height = $rect.attr('height');
    const x = xAttribute ? +xAttribute : 0;
    const y = yAttribute ? +yAttribute : 0;
    const rx = rxAttribute ? +rxAttribute : 0;
    const ry = ryAttribute ? +ryAttribute : 0;
    const isRectangle = !rx || !ry;

    // Add support for rounded rectangle eventually
    if (!isRectangle || !width || !height) {
      return;
    }

    const A = new Point([x, y]);
    const B = new Point([x + +width, y]);
    const C = new Point([x + +width, y + +height]);
    const D = new Point([x, y + +height]);
    const polygon = new Polygon([A, B, C, D]);

    return [polygon];
  }
}
