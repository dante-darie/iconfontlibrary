import Handlebars from 'handlebars';
import type { Plugin } from 'vite';

export default function handlebarsPlugin(): Plugin {
  return {
    name: 'handlebars',
    transform(code: string, id: string) {
      if (!id.endsWith('.hbs')) {
        return null;
      }

      const precompiled = Handlebars.precompile(code);

      return {
        code: `import Handlebars from 'handlebars/runtime.js';\nexport default Handlebars.template(${precompiled});`,
        map: null
      };
    }
  };
}
