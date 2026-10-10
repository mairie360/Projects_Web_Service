const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.join(__dirname, '../..');
const parse = file => { const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS); if (source.parseDiagnostics.length) throw new Error(`Invalid TypeScript syntax in ${file}`); return source; };
const nodes = (source, predicate) => { const found = []; const visit = node => { if (predicate(node)) found.push(node); ts.forEachChild(node, visit); }; visit(source); return found; };
const imported = source => source.statements.filter(ts.isImportDeclaration).map(node => ({ node, specifier: node.moduleSpecifier.text }));
const callable = node => ts.isArrowFunction(node) || ts.isFunctionExpression(node);
const exportedCallable = (source, name) => {
  const direct = source.statements.find(node => node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)
    && ((ts.isFunctionDeclaration(node) && node.name?.text === name) || (ts.isVariableStatement(node) && node.declarationList.declarations.some(binding => ts.isIdentifier(binding.name) && binding.name.text === name && binding.initializer && callable(binding.initializer)))));
  if (direct) return direct;
  const publicName = source.statements.flatMap(node => ts.isExportDeclaration(node) && !node.moduleSpecifier && node.exportClause && ts.isNamedExports(node.exportClause) ? node.exportClause.elements : []).find(node => node.name.text === name);
  if (!publicName) return undefined;
  const localName = publicName.propertyName?.text ?? publicName.name.text;
  return source.statements.find(node => (ts.isFunctionDeclaration(node) && node.name?.text === localName) || (ts.isVariableStatement(node) && node.declarationList.declarations.some(binding => ts.isIdentifier(binding.name) && binding.name.text === localName && binding.initializer && callable(binding.initializer))));
};
const bindingNames = node => ts.isFunctionDeclaration(node) ? [node.name?.text].filter(Boolean) : ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) ? [node.name.text] : [];
const callName = expression => ts.isIdentifier(expression) ? expression.text : ts.isPropertyAccessExpression(expression) ? expression.name.text : ts.isElementAccessExpression(expression) && ts.isStringLiteralLike(expression.argumentExpression) ? expression.argumentExpression.text : undefined;
const calls = source => nodes(source, ts.isCallExpression);
const importedCallNames = source => {
  const names = new Map();
  for (const { node } of imported(source)) {
    const bindings = node.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) for (const binding of bindings.elements) names.set(binding.name.text, binding.propertyName?.text ?? binding.name.text);
  }
  return names;
};
module.exports = { ts, parse, nodes, imported, exportedCallable, bindingNames, callName, calls, importedCallNames };
