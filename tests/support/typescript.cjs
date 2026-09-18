const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

// Chargement des sources TypeScript du front dans node:test, sans Jest ni bundler :
// - chaque fichier .ts est transpilé en CommonJS avec une source map inline, pour que le coverage
//   (lancé avec --enable-source-maps) compte les lignes du fichier source et non du code généré ;
// - l'alias `@/*` du tsconfig est résolu vers `src/*`, comme le fait Next.js ;
// - les .tsx sont transpilés avec le runtime JSX automatique (`react/jsx-runtime`), comme le fait Next.js.

const root = path.resolve(__dirname, '..', '..');
const src = path.join(root, 'src');

// Node >= 23 définit déjà require.extensions['.ts'] (type stripping natif, sans parameter properties ni
// imports sans extension) : le hook est donc toujours remplacé, une seule fois grâce au marqueur.
if (!require.extensions['.ts']?.mairie360) {
  const loadTs = (module, filename) => {
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      fileName: filename,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        resolveJsonModule: true,
        inlineSourceMap: true,
        inlineSources: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    });
    module._compile(outputText, filename);
  };
  loadTs.mairie360 = true;
  require.extensions['.ts'] = loadTs;
  require.extensions['.tsx'] = loadTs;

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
