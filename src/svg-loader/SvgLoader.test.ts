import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ErrorHandler } from 'error-handler';
import { SvgLoader } from './SvgLoader';

const SIMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100"/></svg>';
const CIRCLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"/></svg>';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'svg-loader-test-'));
}

function cleanupTempDir(dirPath: string): void {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

describe('SvgLoader', () => {
  let tempDir: string;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = createTempDir();
    warnSpy = vi.spyOn(ErrorHandler, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
    warnSpy.mockRestore();
  });

  describe('load', () => {
    it('should load SVG files from a single directory', () => {
      fs.writeFileSync(path.join(tempDir, 'icon.svg'), SIMPLE_SVG);

      const loader = new SvgLoader({ directoryPaths: [tempDir] });
      const results = loader.load();

      expect(results).toHaveLength(1);
      expect(results[0].fileName).toBe('icon');
      expect(results[0].fileContent).toBe(SIMPLE_SVG);
      expect(results[0].filePath).toBe(path.join(tempDir, 'icon.svg'));
    });

    it('should load multiple SVG files from a directory', () => {
      fs.writeFileSync(path.join(tempDir, 'icon-a.svg'), SIMPLE_SVG);
      fs.writeFileSync(path.join(tempDir, 'icon-b.svg'), CIRCLE_SVG);

      const loader = new SvgLoader({ directoryPaths: [tempDir] });
      const results = loader.load();

      expect(results).toHaveLength(2);

      const fileNames = results.map((r) => r.fileName).sort();
      expect(fileNames).toEqual(['icon-a', 'icon-b']);
    });

    it('should load SVG files from multiple directories', () => {
      const secondDir = createTempDir();

      try {
        fs.writeFileSync(path.join(tempDir, 'icon-1.svg'), SIMPLE_SVG);
        fs.writeFileSync(path.join(secondDir, 'icon-2.svg'), CIRCLE_SVG);

        const loader = new SvgLoader({ directoryPaths: [tempDir, secondDir] });
        const results = loader.load();

        expect(results).toHaveLength(2);

        const fileNames = results.map((r) => r.fileName).sort();
        expect(fileNames).toEqual(['icon-1', 'icon-2']);
      } finally {
        cleanupTempDir(secondDir);
      }
    });

    it('should ignore non-SVG files', () => {
      fs.writeFileSync(path.join(tempDir, 'icon.svg'), SIMPLE_SVG);
      fs.writeFileSync(path.join(tempDir, 'readme.txt'), 'not an svg');
      fs.writeFileSync(path.join(tempDir, 'data.json'), '{}');
      fs.writeFileSync(path.join(tempDir, 'image.png'), 'binary');

      const loader = new SvgLoader({ directoryPaths: [tempDir] });
      const results = loader.load();

      expect(results).toHaveLength(1);
      expect(results[0].fileName).toBe('icon');
    });

    it('should return empty array when directory has no SVG files', () => {
      fs.writeFileSync(path.join(tempDir, 'readme.txt'), 'not an svg');

      const loader = new SvgLoader({ directoryPaths: [tempDir] });
      const results = loader.load();

      expect(results).toHaveLength(0);
    });

    it('should return results sorted alphabetically by fileName', () => {
      fs.writeFileSync(path.join(tempDir, 'zebra.svg'), SIMPLE_SVG);
      fs.writeFileSync(path.join(tempDir, 'alpha.svg'), CIRCLE_SVG);
      fs.writeFileSync(path.join(tempDir, 'middle.svg'), SIMPLE_SVG);

      const loader = new SvgLoader({ directoryPaths: [tempDir] });
      const results = loader.load();

      const fileNames = results.map((r) => r.fileName);
      expect(fileNames).toEqual(['alpha', 'middle', 'zebra']);
    });

    it('should return empty array for an empty directory', () => {
      const loader = new SvgLoader({ directoryPaths: [tempDir] });
      const results = loader.load();

      expect(results).toHaveLength(0);
    });

    it('should handle SVG files with uppercase extension', () => {
      fs.writeFileSync(path.join(tempDir, 'icon.SVG'), SIMPLE_SVG);

      const loader = new SvgLoader({ directoryPaths: [tempDir] });
      const results = loader.load();

      expect(results).toHaveLength(1);
      expect(results[0].fileName).toBe('icon');
    });

    it('should strip extension from fileName', () => {
      fs.writeFileSync(path.join(tempDir, 'my-cool-icon.svg'), SIMPLE_SVG);

      const loader = new SvgLoader({ directoryPaths: [tempDir] });
      const results = loader.load();

      expect(results[0].fileName).toBe('my-cool-icon');
    });

    it('should provide absolute file paths', () => {
      fs.writeFileSync(path.join(tempDir, 'icon.svg'), SIMPLE_SVG);

      const loader = new SvgLoader({ directoryPaths: [tempDir] });
      const results = loader.load();

      expect(path.isAbsolute(results[0].filePath)).toBe(true);
    });

    it('should read file content correctly', () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0L100 100"/></svg>';
      fs.writeFileSync(path.join(tempDir, 'custom.svg'), svgContent);

      const loader = new SvgLoader({ directoryPaths: [tempDir] });
      const results = loader.load();

      expect(results[0].fileContent).toBe(svgContent);
    });
  });

  describe('recursive', () => {
    it('should not recurse into subdirectories by default', () => {
      const subDir = path.join(tempDir, 'nested');
      fs.mkdirSync(subDir);
      fs.writeFileSync(path.join(tempDir, 'top.svg'), SIMPLE_SVG);
      fs.writeFileSync(path.join(subDir, 'nested.svg'), CIRCLE_SVG);

      const loader = new SvgLoader({ directoryPaths: [tempDir] });
      const results = loader.load();

      expect(results).toHaveLength(1);
      expect(results[0].fileName).toBe('top');
    });

    it('should recurse into subdirectories when recursive is true', () => {
      const subDir = path.join(tempDir, 'nested');
      fs.mkdirSync(subDir);
      fs.writeFileSync(path.join(tempDir, 'top.svg'), SIMPLE_SVG);
      fs.writeFileSync(path.join(subDir, 'nested.svg'), CIRCLE_SVG);

      const loader = new SvgLoader({ directoryPaths: [tempDir], recursive: true });
      const results = loader.load();

      expect(results).toHaveLength(2);

      const fileNames = results.map((r) => r.fileName).sort();
      expect(fileNames).toEqual(['nested', 'top']);
    });

    it('should recurse into deeply nested directories', () => {
      const level1 = path.join(tempDir, 'a');
      const level2 = path.join(level1, 'b');
      const level3 = path.join(level2, 'c');
      fs.mkdirSync(level3, { recursive: true });

      fs.writeFileSync(path.join(tempDir, 'root.svg'), SIMPLE_SVG);
      fs.writeFileSync(path.join(level1, 'level1.svg'), SIMPLE_SVG);
      fs.writeFileSync(path.join(level2, 'level2.svg'), SIMPLE_SVG);
      fs.writeFileSync(path.join(level3, 'level3.svg'), SIMPLE_SVG);

      const loader = new SvgLoader({ directoryPaths: [tempDir], recursive: true });
      const results = loader.load();

      expect(results).toHaveLength(4);
    });
  });

  describe('deduplication', () => {
    it('should not process the same directory twice when listed multiple times', () => {
      fs.writeFileSync(path.join(tempDir, 'icon.svg'), SIMPLE_SVG);

      const loader = new SvgLoader({ directoryPaths: [tempDir, tempDir] });
      const results = loader.load();

      expect(results).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('should warn and skip non-existent directory', () => {
      const fakePath = path.join(tempDir, 'does-not-exist');

      const loader = new SvgLoader({ directoryPaths: [fakePath] });
      const results = loader.load();

      expect(results).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('does-not-exist'));
    });

    it('should warn when path is a file, not a directory', () => {
      const filePath = path.join(tempDir, 'file.txt');
      fs.writeFileSync(filePath, 'not a directory');

      const loader = new SvgLoader({ directoryPaths: [filePath] });
      const results = loader.load();

      expect(results).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('file.txt'));
    });

    it('should skip invalid directory and continue to valid ones', () => {
      const fakePath = path.join(tempDir, 'does-not-exist');
      const validDir = createTempDir();

      try {
        fs.writeFileSync(path.join(validDir, 'icon.svg'), SIMPLE_SVG);

        const loader = new SvgLoader({ directoryPaths: [fakePath, validDir] });
        const results = loader.load();

        expect(results).toHaveLength(1);
        expect(results[0].fileName).toBe('icon');
        expect(warnSpy).toHaveBeenCalledTimes(1);
      } finally {
        cleanupTempDir(validDir);
      }
    });
  });
});
