const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

// Chargement des sources TypeScript du front dans node:test, sans Jest ni bundler :
// - chaque fichier .ts est transpilé en CommonJS avec une source map inline, pour que le coverage
//   (lancé avec --enable-source-maps) compte les lignes du fichier source et non du code généré ;
// - l'alias `@/*` du tsconfig est résolu vers `src/*`, comme le fait Next.js ;
// - les imports `import type` disparaissent à la transpilation, les .tsx ne sont donc jamais chargés.

const root = path.resolve(__dirname, '..', '..');
const src = path.join(root, 'src');

if (!require.extensions['.ts']) {
  require.extensions['.ts'] = (module, filename) => {
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      fileName: filename,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        resolveJsonModule: true,
        inlineSourceMap: true,
        inlineSources: true,
      },
    });
    module._compile(outputText, filename);
  };

  const resolveFilename = Module._resolveFilename;
  Module._resolveFilename = function resolveAlias(request, ...rest) {
    const aliased = request.startsWith('@/') ? path.join(src, request.slice(2)) : request;
    return resolveFilename.call(this, aliased, ...rest);
  };
}

/** Charge un module TypeScript par chemin relatif à la racine du dépôt. */
function requireTs(relativePath) {
  return require(path.join(root, relativePath));
}

module.exports = { requireTs, root };
