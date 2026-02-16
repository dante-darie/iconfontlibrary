import path from 'path';
import { writeFileSync } from 'fs';
import Handlebars from 'handlebars/runtime';
import type { IFontExporterJsonEntry, IFontExporterOptions } from './FontExporter.types';
import cjsTemplate from './templates/cjs.hbs';
import cssTemplate from './templates/css.hbs';
import esmTemplate from './templates/esm.hbs';
import jsonTemplate from './templates/json.hbs';
import scssTemplate from './templates/scss.hbs';
import typescriptTemplate from './templates/typescript.hbs';

interface ITemplateContext {
  readonly entries: IFontExporterJsonEntry[];
  readonly familyName: string;
}

interface ITemplateEntry {
  readonly extension: string;
  readonly template: HandlebarsTemplateDelegate<ITemplateContext>;
}

const TEMPLATES: Record<string, ITemplateEntry> = {
  cjs: { extension: '.cjs', template: cjsTemplate },
  css: { extension: '.css', template: cssTemplate },
  esm: { extension: '.mjs', template: esmTemplate },
  json: { extension: '.json', template: jsonTemplate },
  scss: { extension: '.module.scss', template: scssTemplate },
  typescript: { extension: '.ts', template: typescriptTemplate }
};

Handlebars.registerHelper('unicodeEscape', (unicode: string) => `\\${unicode}`);

export class FontExporter {
  private readonly context: ITemplateContext;

  constructor(options: IFontExporterOptions) {
    const entries = Object.keys(options.unicodeMap)
      .sort()
      .map((name) => ({
        name,
        unicode: options.unicodeMap[name].toString(16)
      }));

    this.context = {
      entries,
      familyName: options.familyName
    };
  }

  public exportToDirectory(outputDirectory: string): void {
    for (const name of Object.keys(TEMPLATES)) {
      const { extension, template } = TEMPLATES[name];
      const content = template(this.context);
      const fileName = `${this.context.familyName}${extension}`;
      const filePath = path.join(outputDirectory, fileName);

      writeFileSync(filePath, content);
    }
  }
}
