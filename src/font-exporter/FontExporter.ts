import path from 'path';
import { readFileSync, writeFileSync } from 'fs';
import Handlebars from 'handlebars';
import type { IFontExporterJsonEntry, IFontExporterOptions } from './FontExporter.types';

interface ITemplateContext {
  readonly entries: IFontExporterJsonEntry[];
  readonly familyName: string;
}

const FILE_EXTENSIONS: Record<string, string> = {
  cjs: '.cjs',
  css: '.css',
  esm: '.mjs',
  json: '.json',
  scss: '.module.scss',
  typescript: '.ts'
};

const TEMPLATE_NAMES = Object.keys(FILE_EXTENSIONS);

Handlebars.registerHelper('unicodeEscape', (unicode: string) => `\\${unicode}`);

export class FontExporter {
  private readonly context: ITemplateContext;
  private readonly templates: Record<string, HandlebarsTemplateDelegate<ITemplateContext>>;

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

    this.templates = TEMPLATE_NAMES.reduce(
      (templates, name) => {
        const templatePath = path.join(__dirname, 'templates', `${name}.hbs`);
        const content = readFileSync(templatePath, 'utf-8');

        templates[name] = Handlebars.compile(content);

        return templates;
      },
      {} as Record<string, HandlebarsTemplateDelegate<ITemplateContext>>
    );
  }

  public exportToDirectory(outputDirectory: string): void {
    for (const name of TEMPLATE_NAMES) {
      const content = this.templates[name](this.context);
      const fileName = `${this.context.familyName}${FILE_EXTENSIONS[name]}`;
      const filePath = path.join(outputDirectory, fileName);

      writeFileSync(filePath, content);
    }
  }
}
