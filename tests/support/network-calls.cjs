const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { root } = require('./typescript.cjs');
const { propertyName } = require('./source-policy.cjs');

// Inventaire statique (AST TypeScript) de tout ce qui peut émettre une requête réseau dans `src/` :
// appels `fetch`, appels des opérations générées `bffProject.<operation>`, appelants de la passerelle serveur `forwardToBff`, et
// primitives réseau interdites côté front (XMLHttpRequest, WebSocket, EventSource, sendBeacon, clients HTTP).

const FORBIDDEN_CONSTRUCTORS = new Set(['XMLHttpRequest', 'EventSource', 'WebSocket']);
const FORBIDDEN_MODULES = new Set(['axios', 'ky', 'got', 'superagent', 'undici', 'http', 'https', 'node:http', 'node:https', 'net', 'node:net']);
// Generated browser transport and the GET-only request-local server adapter.
const AXIOS_GATEWAYS = new Set(['src/lib/bffProjectClient.ts', 'src/lib/server-projects-page.ts']);
const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

/** Every operation of the generated BFF Project client: `{ name: { method, path } }` (path with `{param}` templates). */
function generatedOperations() {
  const file = require.resolve('@mairie360/bff-project-openapi/endpoints/bffProject');
  const source = fs.readFileSync(file, 'utf8');
  const operations = {};
  for (const [, name, method, template] of source.matchAll(/^const (\w+) = \((?:(?!\nconst )[^])*?axiosInstance\.(get|post|put|patch|delete)\(\s*`([^`]+)`/gm)) {
    operations[name] = { method: method.toUpperCase(), path: template.replace(/\$\{(\w+)\}/g, '{$1}') };
  }
  return operations;
}

function sourceFiles(dir = path.join(root, 'src')) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [path.relative(root, full)] : [];
  }).sort();
}

function parse(file) {
  return ts.createSourceFile(file, fs.readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

function visit(node, callback) {
  callback(node);
  node.forEachChild((child) => visit(child, callback));
}

const lineOf = (source, node) => source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
const calleeName = (call) => (ts.isIdentifier(call.expression) ? call.expression.text
  : ts.isPropertyAccessExpression(call.expression) ? call.expression.name.text : undefined);

function enclosingFunctionName(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isFunctionDeclaration(current) && current.name) return current.name.text;
  }
  return undefined;
}

/**
 * Chemin HTTP d'un argument : littéral, ou gabarit dont chaque `${encodeURIComponent(x)}` devient `{x}`
 * et dont un `${createQueryString(...)}` final ajoute une query. Retourne `undefined` si non analysable.
 */
function pathOf(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return { path: node.text, query: false };
  if (ts.isIdentifier(node) && node.text === 'path') return { path: '{path}', query: false };
  if (!ts.isTemplateExpression(node)) return undefined;
  let result = node.head.text;
  let query = false;
  for (const [index, span] of node.templateSpans.entries()) {
    const expression = span.expression;
    const name = ts.isCallExpression(expression) ? calleeName(expression) : undefined;
    if (name === 'encodeURIComponent' && !query) result += `{${expression.arguments[0].getText()}}`;
    else if (name === 'createQueryString' && index === node.templateSpans.length - 1 && span.literal.text === '') query = true;
    else return undefined;
    result += span.literal.text;
  }
  return { path: result, query };
}

/** Méthode HTTP d'un `RequestInit` littéral (GET par défaut), `undefined` si non littérale. */
function methodOf(init) {
  if (!init) return 'GET';
  if (!ts.isObjectLiteralExpression(init)) return undefined;
  const property = init.properties.find((candidate) => ts.isPropertyAssignment(candidate) && propertyName(candidate.name) === 'method');
  if (!property) return 'GET';
  const value = property.initializer;
  return ts.isStringLiteral(value) && HTTP_METHODS.has(value.text.toUpperCase()) ? value.text.toUpperCase() : undefined;
}

function analyseNetworkCalls() {
  const fetchCalls = [];
  const bffCalls = [];
  const forwardCalls = [];
  const forbidden = [];
  const operations = generatedOperations();

  for (const file of sourceFiles()) {
    const source = parse(file);
    visit(source, (node) => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) && FORBIDDEN_MODULES.has(node.moduleSpecifier.text) && !(AXIOS_GATEWAYS.has(file) && node.moduleSpecifier.text === 'axios')) {
        forbidden.push(`${file}:${lineOf(source, node)} importe ${node.moduleSpecifier.text}`);
      }
      if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && FORBIDDEN_CONSTRUCTORS.has(node.expression.text)) {
        forbidden.push(`${file}:${lineOf(source, node)} instancie ${node.expression.text}`);
      }
      if (!ts.isCallExpression(node)) return;
      const name = calleeName(node);
      const location = `${file}:${lineOf(source, node)}`;
      if (name === 'sendBeacon') forbidden.push(`${location} appelle navigator.sendBeacon`);
      if (name === 'require' && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && FORBIDDEN_MODULES.has(node.arguments[0].text)) {
        forbidden.push(`${location} charge ${node.arguments[0].text}`);
      }
      if (['fetch', 'sessionFetch'].includes(name)) {
        const [target, init] = node.arguments;
        fetchCalls.push({
          file, location, function: enclosingFunctionName(node), method: methodOf(init),
          target: target && ts.isIdentifier(target) && target.text !== 'path' ? { identifier: target.text } : target && pathOf(target),
        });
      }
      if (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) && (node.expression.expression.text === 'bffProject' || file === 'src/lib/server-projects-page.ts' && node.expression.expression.text === 'api')) {
        const operation = operations[name];
        bffCalls.push({ file, location, operation: name, method: operation?.method, target: operation && { path: operation.path, query: false } });
      }
      if (name === 'forwardToBff') forwardCalls.push({ file, location, function: enclosingFunctionName(node) });
    });
  }
  return { fetchCalls, bffCalls, forwardCalls, forbidden };
}

module.exports = { generatedOperations, analyseNetworkCalls, sourceFiles, parse, visit };
