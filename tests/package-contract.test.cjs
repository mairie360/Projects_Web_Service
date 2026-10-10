const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const composePolicy = require('./support/compose-policy.cjs');
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
    const services = composePolicy.compose(file);
    const images = composePolicy.bffImages(services).filter(image => image.startsWith('ghcr.io/mairie360/bff-project:'));
    assert.deepEqual(images, [`ghcr.io/mairie360/bff-project:${pinned}`], file);
    for (const service of Object.values(services)) { const context = typeof service.build === 'string' ? service.build : service.build?.context; assert.equal(typeof context === 'string' && /(?:^|[\/])BFF_Project/.test(context), false, `${file} must not build BFF_Project from a checkout`); }
  }
});

test('dans chaque stack, le service du front ne connaît que BFF_Project', () => {
  for (const file of composeFiles) {
    const front = composePolicy.compose(file)['projects-front'];
    assert.ok(front, `${file}: missing projects-front service`);
    const env = composePolicy.environment(front);
    assert.equal(Object.keys(env).some(name => /USER_BFF|BFF_USER|_API_URL/.test(name)), false, file);
    assert.equal(Object.values(env).some(value => typeof value === 'string' && value.includes('bff-user')), false, file);
    assert.equal(env.BFF_PROJECT_BASE_URL, 'http://bff-project:4001', file);
  }
});
