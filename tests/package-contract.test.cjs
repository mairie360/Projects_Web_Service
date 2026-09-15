const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

// Le contrat du front est celui de BFF_Project publié dans @mairie360/bff-project-openapi, épinglé à une
// version exacte X.Y.Z : contracts/openapi.json doit en être la reconstruction exacte (scripts/orval-contract.mjs),
// et BFF_Project est le seul BFF que le front joint, dans la même version partout où ce dépôt le démarre.
// Les stacks Docker démarrent aussi BFF User, mais uniquement comme dépendance de BFF_Project.

const ROOT = path.join(__dirname, '..');
const PACKAGE_NAME = '@mairie360/bff-project-openapi';
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const manifest = readJson('package.json');
const pinned = manifest.dependencies[PACKAGE_NAME];
const composeFiles = fs.readdirSync(ROOT).filter((name) => /^docker-compose.*\.ya?ml$/.test(name));

/** Bloc YAML d'un service (lignes indentées sous `  <name>:`). */
function serviceBlock(file, name) {
  const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n');
  const start = lines.findIndex((line) => line === `  ${name}:` || line.startsWith(`  ${name}: `));
  if (start === -1) return undefined;
  const end = lines.findIndex((line, index) => index > start && /^( {2}[\w-]+:|\S)/.test(line));
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
}

test('le paquet de contrat BFF_Project est épinglé à une version publiée X.Y.Z, installée et verrouillée', () => {
  assert.match(pinned ?? '', /^\d+\.\d+\.\d+$/, `${PACKAGE_NAME} doit être épinglé à une version exacte (pas de plage ni de pré-version dev/staging)`);
  assert.equal(readJson(`node_modules/${PACKAGE_NAME}/package.json`).version, pinned);
  assert.equal(readJson('package-lock.json').packages[`node_modules/${PACKAGE_NAME}`].version, pinned);
});

test('un seul paquet de contrat de BFF est utilisé', () => {
  const all = { ...manifest.dependencies, ...manifest.devDependencies };
  assert.deepEqual(Object.keys(all).filter((name) => /^@mairie360\/bff-.*-openapi$/.test(name)), [PACKAGE_NAME]);
});

test('contracts/openapi.json est exactement le contrat reconstruit depuis le paquet installé', async () => {
  const { buildOrvalOpenApi } = await import('../scripts/orval-contract.mjs');
  const snapshot = readJson('contracts/openapi.json');
  assert.equal(snapshot.info['x-source-package'], `${PACKAGE_NAME}@${pinned}`);
  assert.equal(snapshot.info.title, 'bff_project');
  assert.deepEqual(snapshot, buildOrvalOpenApi(PACKAGE_NAME, ROOT));
});

test('chaque stack Docker démarre BFF_Project dans la version du paquet de contrat', () => {
  for (const file of composeFiles) {
    const images = [...fs.readFileSync(path.join(ROOT, file), 'utf8').matchAll(/ghcr\.io\/mairie360\/(bff-project):([\w.-]+)/g)];
    assert.deepEqual(images.map(([, name, tag]) => `${name}:${tag}`), [`bff-project:${pinned}`], file);
    assert.doesNotMatch(fs.readFileSync(path.join(ROOT, file), 'utf8'), /context:\s*\.\.\/BFF_Project/, `${file} ne doit pas construire BFF_Project depuis un checkout`);
  }
});

test('dans chaque stack, le service du front ne connaît que BFF_Project', () => {
  for (const file of composeFiles) {
    const front = serviceBlock(file, 'projects-front');
    assert.ok(front, `${file} : service projects-front introuvable`);
    assert.doesNotMatch(front, /USER_BFF|BFF_USER|bff-user|_API_URL/, `${file} : projects-front ne doit référencer aucun autre service`);
    assert.match(front, /BFF_PROJECT_BASE_URL: http:\/\/bff-project:4001/, file);
  }
});
