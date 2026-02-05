import * as fs from 'fs';
import * as fs_path from 'path';
import { Font, Glyph, Path, PathCommand } from 'opentype.js';
import { Parser } from '../lib/svg'; // Adjusted path assuming lib is sibling to example
import { CubicBezierCurve, Line, QuadraticBezierCurve } from 'geometric-library';

// --- Configuration ---
const fontFamilyName = 'MyIconsFont';
const config = {
  svgFilePath: fs_path.resolve(__dirname, './instagram.svg'),
  outputDir: fs_path.resolve(__dirname, '../../dist'),
  fontFamilyName: fontFamilyName,
  fontStyleName: 'Regular',
  iconName: 'instagram',
  iconUnicode: 0xe000,
  unitsPerEm: 1000,
  ascender: 800,
  descender: -200,
  notdefGlyphWidth: 200,
  outputFileName: `${fontFamilyName}.ttf`,
  outputFilePath: fs_path.join(fs_path.resolve(__dirname, '../../dist'), `${fontFamilyName}.ttf`)
};
// ---------------------

function parseSvgToPath(svgContent: string): Path {
  const parser = new Parser(svgContent);
  const path = new Path();
  parser.standardShapes.forEach((shape) => {
    const P0 = shape.values[0];
    path.moveTo(P0.x, P0.y);
    if (shape instanceof Line) {
      const { P1 } = shape;
      path.lineTo(P1.x, P1.y);
    } else if (shape instanceof QuadraticBezierCurve) {
      const { P1, P2 } = shape;
      path.quadraticCurveTo(P1.x, P1.y, P2.x, P2.y);
    } else if (shape instanceof CubicBezierCurve) {
      const { P1, P2, P3 } = shape;
      path.bezierCurveTo(P1.x, P1.y, P2.x, P2.y, P3.x, P3.y);
    }
  });
  path.close();
  return path;
}

function transformGlyphPath(path: Path, options: { ascender: number; descender: number }): { transformedPath: Path; calculatedAdvanceWidth: number } {
  const bbox = path.getBoundingBox();
  if (!bbox) {
    throw new Error('Could not calculate bounding box for the path.');
  }

  const svgHeight = bbox.y2 - bbox.y1;
  const svgWidth = bbox.x2 - bbox.x1;

  // Scale to fit target height (ascender - descender)
  const targetHeight = options.ascender - options.descender;
  const scaleFactor = svgHeight === 0 ? 1 : targetHeight / svgHeight;

  // Translate to align bottom with descender and left edge to x=0
  const translateX = -bbox.x1 * scaleFactor;
  const translateY = options.descender - bbox.y1 * scaleFactor;

  const transformedPath = new Path();
  path.commands.forEach((cmd) => {
    let transformedCmd: PathCommand;
    if (cmd.type === 'M' || cmd.type === 'L') {
      transformedCmd = { type: cmd.type, x: cmd.x * scaleFactor + translateX, y: cmd.y * scaleFactor + translateY };
    } else if (cmd.type === 'C') {
      transformedCmd = {
        type: cmd.type,
        x: cmd.x * scaleFactor + translateX,
        y: cmd.y * scaleFactor + translateY,
        x1: cmd.x1 * scaleFactor + translateX,
        y1: cmd.y1 * scaleFactor + translateY,
        x2: cmd.x2 * scaleFactor + translateX,
        y2: cmd.y2 * scaleFactor + translateY
      };
    } else if (cmd.type === 'Q') {
      transformedCmd = { type: cmd.type, x: cmd.x * scaleFactor + translateX, y: cmd.y * scaleFactor + translateY, x1: cmd.x1 * scaleFactor + translateX, y1: cmd.y1 * scaleFactor + translateY };
    } else {
      transformedCmd = { type: 'Z' };
    }
    transformedPath.commands.push(transformedCmd);
  });
  transformedPath.fill = path.fill;
  transformedPath.stroke = path.stroke;
  transformedPath.strokeWidth = path.strokeWidth;

  const calculatedAdvanceWidth = Math.round(svgWidth * scaleFactor);

  return { transformedPath, calculatedAdvanceWidth };
}

function createNotdefGlyph(advanceWidth: number): Glyph {
  const notdefPath = new Path();
  const ndSize = advanceWidth * 0.5; // Example size based on width
  notdefPath.moveTo(0, 0);
  notdefPath.lineTo(ndSize, 0);
  notdefPath.lineTo(ndSize, ndSize);
  notdefPath.lineTo(0, ndSize);
  notdefPath.close();
  return new Glyph({
    name: '.notdef',
    unicode: 0,
    advanceWidth: advanceWidth,
    path: notdefPath
  });
}

function createIconGlyph(name: string, unicode: number, path: Path, advanceWidth: number): Glyph {
  return new Glyph({
    name: name,
    unicode: unicode,
    advanceWidth: advanceWidth,
    path: path
  });
}

function writeFont(font: Font, outputPath: string = config.outputFilePath, outputDir: string = config.outputDir): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }
  const arrayBuffer = font.toArrayBuffer();
  const bufferView = new Uint8Array(arrayBuffer);
  fs.writeFileSync(outputPath, bufferView);
  console.log(`Font successfully written to ${outputPath} (${bufferView.byteLength} bytes)`);
}

function main() {
  try {
    // 1. Read and parse SVG
    console.log(`Reading SVG from: ${config.svgFilePath}`);
    const svgContent = fs.readFileSync(config.svgFilePath, 'utf-8');
    const rawPath = parseSvgToPath(svgContent);
    console.log('SVG parsed successfully.');

    // 2. Transform path
    const { transformedPath, calculatedAdvanceWidth } = transformGlyphPath(rawPath, {
      ascender: config.ascender,
      descender: config.descender
    });
    console.log(`Path transformed. Calculated Advance Width: ${calculatedAdvanceWidth}`);

    // 3. Create Glyphs
    const notdefGlyph = createNotdefGlyph(config.notdefGlyphWidth);
    const iconGlyph = createIconGlyph(config.iconName, config.iconUnicode, transformedPath, calculatedAdvanceWidth);
    console.log('Glyphs created.');

    // 4. Create Font object
    const font = new Font({
      familyName: config.fontFamilyName,
      styleName: config.fontStyleName,
      unitsPerEm: config.unitsPerEm,
      ascender: config.ascender,
      descender: config.descender,
      glyphs: [notdefGlyph, iconGlyph]
    });
    console.log('Font object created.');

    // 5. Write font file
    writeFont(font, config.outputFilePath, config.outputDir);
  } catch (error) {
    console.error('Error generating icon font:', error);
    process.exit(1);
  }
}

// Run the main function
main();
