import fs from 'fs';
import os from 'os';
import path from 'path';
import { FontExporter } from './FontExporter';

describe('FontExporter', () => {
  const unicodeMap: Record<string, number> = {
    home: 0xe001,
    facebook: 0xe000,
    search: 0xe002
  };

  let outputDir: string;

  beforeEach(() => {
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'font-exporter-'));
  });

  afterEach(() => {
    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  const exportAndRead = (familyName: string, map: Record<string, number>, fileName: string, className?: string): string => {
    new FontExporter({ className, familyName, unicodeMap: map }).exportToDirectory(outputDir);

    return fs.readFileSync(path.join(outputDir, fileName), 'utf-8').replace(/\r\n/g, '\n');
  };

  describe('JSON', () => {
    it('should produce valid JSON with name and hex unicode', () => {
      const result = JSON.parse(exportAndRead('Example', unicodeMap, 'Example.json'));

      expect(result).toEqual([
        { name: 'facebook', unicode: 'e000' },
        { name: 'home', unicode: 'e001' },
        { name: 'search', unicode: 'e002' }
      ]);
    });

    it('should sort entries alphabetically by name', () => {
      const result = JSON.parse(exportAndRead('Test', { zebra: 0xe002, alpha: 0xe000, middle: 0xe001 }, 'Test.json'));

      expect(result.map((e: { name: string }) => e.name)).toEqual(['alpha', 'middle', 'zebra']);
    });

    it('should return an empty array for an empty unicode map', () => {
      const result = JSON.parse(exportAndRead('Test', {}, 'Test.json'));

      expect(result).toEqual([]);
    });
  });

  describe('CSS', () => {
    it('should include @font-face block with family name and otf source', () => {
      const css = exportAndRead('Example', unicodeMap, 'Example.css');

      expect(css).toContain('@font-face {');
      expect(css).toContain("font-family: 'Example';");
      expect(css).toContain("src: url('./Example.otf') format('opentype');");
    });

    it('should include base class with ligature settings', () => {
      const css = exportAndRead('Example', unicodeMap, 'Example.css');

      expect(css).toContain('.Example {');
      expect(css).toContain("font-family: 'Example';");
      expect(css).toContain('font-variant-ligatures: common-ligatures discretionary-ligatures;');
      expect(css).toContain("font-feature-settings: 'liga' 1, 'dlig' 1, 'calt' 1;");
      expect(css).toContain('-webkit-font-smoothing: antialiased;');
      expect(css).toContain('-moz-osx-font-smoothing: grayscale;');
    });

    it('should include combined selectors with ::before pseudo-element for each icon', () => {
      const css = exportAndRead('Example', unicodeMap, 'Example.css');

      expect(css).toContain('.Example.facebook::before {');
      expect(css).toContain("content: '\\e000';");
      expect(css).toContain('.Example.home::before {');
      expect(css).toContain("content: '\\e001';");
      expect(css).toContain('.Example.search::before {');
      expect(css).toContain("content: '\\e002';");
    });

    it('should use family name as-is for the class name', () => {
      const css = exportAndRead('MyIcons', { home: 0xe000 }, 'MyIcons.css');

      expect(css).toContain('.MyIcons {');
      expect(css).toContain('.MyIcons.home::before {');
    });

    it('should use custom className for selectors while keeping familyName for font-family', () => {
      const css = exportAndRead('MyIcons', { home: 0xe000 }, 'MyIcons.css', 'icon');

      expect(css).toContain('.icon {');
      expect(css).toContain('.icon.home::before {');
      expect(css).toContain("font-family: 'MyIcons';");
      expect(css).toContain("src: url('./MyIcons.otf') format('opentype');");
    });
  });

  describe('SCSS module', () => {
    it('should include @font-face block', () => {
      const scss = exportAndRead('Example', unicodeMap, 'Example.module.scss');

      expect(scss).toContain('@font-face {');
      expect(scss).toContain("font-family: 'Example';");
      expect(scss).toContain("src: url('./Example.otf') format('opentype');");
    });

    it('should use SCSS nesting with &.icon::before syntax', () => {
      const scss = exportAndRead('Example', unicodeMap, 'Example.module.scss');

      expect(scss).toContain('.Example {');
      expect(scss).toContain('  &.facebook::before {');
      expect(scss).toContain("    content: '\\e000';");
      expect(scss).toContain('  &.home::before {');
      expect(scss).toContain("    content: '\\e001';");
    });

    it('should use custom className for the base selector while keeping familyName for font-family', () => {
      const scss = exportAndRead('MyIcons', { home: 0xe000 }, 'MyIcons.module.scss', 'icon');

      expect(scss).toContain('.icon {');
      expect(scss).toContain("font-family: 'MyIcons';");
      expect(scss).toContain("src: url('./MyIcons.otf') format('opentype');");
      expect(scss).toContain('  &.home::before {');
    });

    it('should include ligature settings in the base class', () => {
      const scss = exportAndRead('Example', unicodeMap, 'Example.module.scss');

      expect(scss).toContain("font-family: 'Example';");
      expect(scss).toContain('font-variant-ligatures: common-ligatures discretionary-ligatures;');
      expect(scss).toContain("font-feature-settings: 'liga' 1, 'dlig' 1, 'calt' 1;");
    });
  });

  describe('JavaScript ESM', () => {
    it('should export iconNames array with ESM syntax', () => {
      const js = exportAndRead('Example', unicodeMap, 'Example.mjs');

      expect(js).toContain("export const iconNames = ['facebook', 'home', 'search'];");
    });

    it('should export iconMap with ESM syntax', () => {
      const js = exportAndRead('Example', unicodeMap, 'Example.mjs');

      expect(js).toContain("'facebook': '\\ue000',");
      expect(js).toContain("'home': '\\ue001',");
      expect(js).toContain("'search': '\\ue002',");
    });

    it('should produce empty array and object for an empty unicode map', () => {
      const js = exportAndRead('Test', {}, 'Test.mjs');

      expect(js).toContain('export const iconNames = [];');
      expect(js).toContain('export const iconMap = {\n};');
    });
  });

  describe('JavaScript CJS', () => {
    it('should declare iconNames array without export keyword', () => {
      const js = exportAndRead('Example', unicodeMap, 'Example.cjs');

      expect(js).toContain("const iconNames = ['facebook', 'home', 'search'];");
      expect(js).not.toContain('export const');
    });

    it('should declare iconMap without export keyword', () => {
      const js = exportAndRead('Example', unicodeMap, 'Example.cjs');

      expect(js).toContain("'facebook': '\\ue000',");
      expect(js).toContain("'home': '\\ue001',");
    });

    it('should use module.exports', () => {
      const js = exportAndRead('Example', unicodeMap, 'Example.cjs');

      expect(js).toContain('module.exports = { iconNames, iconMap };');
    });
  });

  describe('TypeScript', () => {
    it('should export a const array of icon names sorted alphabetically', () => {
      const ts = exportAndRead('Example', unicodeMap, 'Example.ts');

      expect(ts).toContain("export const iconNames = ['facebook', 'home', 'search'] as const;");
    });

    it('should export a const map of icon names to unicode escapes', () => {
      const ts = exportAndRead('Example', unicodeMap, 'Example.ts');

      expect(ts).toContain("'facebook': '\\ue000',");
      expect(ts).toContain("'home': '\\ue001',");
      expect(ts).toContain("'search': '\\ue002',");
    });

    it('should export a TIcon type derived from iconNames', () => {
      const ts = exportAndRead('Example', unicodeMap, 'Example.ts');

      expect(ts).toContain('export type TIcon = typeof iconNames[number];');
    });

    it('should produce empty array and object for an empty unicode map', () => {
      const ts = exportAndRead('Test', {}, 'Test.ts');

      expect(ts).toContain('export const iconNames = [] as const;');
      expect(ts).toContain('export const iconMap = {\n} as const;');
    });
  });
});
