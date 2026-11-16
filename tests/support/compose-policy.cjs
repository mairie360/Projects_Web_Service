const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
// Use the YAML parser declared by the already installed ESLint configuration package.
const yaml = createRequire(require.resolve('@eslint/eslintrc'))('js-yaml');
const root = path.join(__dirname, '../..');
const compose = file => {
  const value = yaml.load(fs.readFileSync(path.join(root, file), 'utf8'), { schema: yaml.JSON_SCHEMA });
  if (!value?.services || typeof value.services !== 'object' || Array.isArray(value.services)) throw new Error(`Missing Compose services in ${file}`);
  return value.services;
};
// Inspect the declared default only; do not read host environment or claim an effective deployment.
// Defaults may nest (`${DB_IMAGE:-ghcr.io/…:${UPSTREAM_TAG:-dev}}`): resolve the innermost first.
const declaredDefault = value => { if (typeof value !== 'string') return value; let previous; let current = value; do { previous = current; current = current.replace(/\$\{[A-Za-z_][A-Za-z0-9_]*:?-([^${}]*)\}/g, (_match, fallback) => fallback); } while (current !== previous); return current; };
const bffImages = services => Object.values(services).map(service => declaredDefault(service.image)).filter(image => typeof image === 'string' && image.startsWith('ghcr.io/mairie360/bff-'));
// MAIR-998: the BFF images as written, with the moving tag of the stage kept as `${UPSTREAM_TAG:-dev}`.
const bffImageRefs = services => Object.values(services).map(service => service.image).filter(image => typeof image === 'string' && image.includes('ghcr.io/mairie360/bff-')).map(image => /ghcr\.io\/mairie360\/bff-[\w.-]+(?::(?:\$\{[^}]*\}|[\w.-]+))?/.exec(image)[0]);
const environment = service => Array.isArray(service.environment) ? Object.fromEntries(service.environment.map(entry => { const index = entry.indexOf('='); return index < 0 ? [entry, undefined] : [entry.slice(0, index), entry.slice(index + 1)]; })) : service.environment ?? {};
module.exports = { compose, bffImages, bffImageRefs, environment, declaredDefault };
