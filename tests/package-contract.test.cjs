const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const composePolicy = require('./support/compose-policy.cjs');
const { test } = require('node:test');

// Le contrat du front est celui de BFF_Project publié dans @mairie360/bff-project-openapi, épinglé à une
// version exacte (release X.Y.Z ou paquet dev 0.0.0-dev.<sha> du main du BFF, scripts/contract-version.mjs) :
// contracts/openapi.json doit en être la reconstruction exacte (scripts/orval-contract.mjs), et BFF_Project est le
// seul BFF que le front joint, dans l'image construite depuis le même commit partout où ce dépôt le démarre.
// Les stacks Docker démarrent aussi BFF User, mais uniquement comme dépendance de BFF_Project.

const ROOT = path.join(__dirname, '..');
const PACKAGE_NAME = '@mairie360/bff-project-openapi';
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const manifest = readJson('package.json');
const pinned = manifest.dependencies[PACKAGE_NAME];
const composeFiles = fs.readdirSync(ROOT).filter((name) => /^docker-compose.*\.ya?ml$/.test(name));

test('le paquet de contrat BFF_Project est épinglé à une version publiée exacte, installée et verrouillée', async () => {
  const { isAcceptedContractVersion } = await import('../scripts/contract-version.mjs');
  assert.ok(isAcceptedContractVersion(pinned), `${PACKAGE_NAME} doit être épinglé à une version exacte X.Y.Z ou 0.0.0-dev.<sha> (pas de plage ni de pré-version staging)`);
  assert.equal(readJson(`node_modules/${PACKAGE_NAME}/package.json`).version, pinned);
  assert.equal(readJson('package-lock.json').packages[`node_modules/${PACKAGE_NAME}`].version, pinned);
});

test('seul le contrat métier Project est routé ; les types de session publiés restent une dépendance de développement exacte', async () => {
  const { isAcceptedContractVersion } = await import('../scripts/contract-version.mjs');
  const all = { ...manifest.dependencies, ...manifest.devDependencies };
  const sessionTypes = '@mairie360/bff-user-openapi';
  assert.deepEqual(Object.keys(all).filter((name) => /^@mairie360\/bff-.*-openapi$/.test(name) && name !== sessionTypes), [PACKAGE_NAME]);
  assert.equal(manifest.dependencies[sessionTypes], undefined);
  const sessionPinned = manifest.devDependencies[sessionTypes];
  assert.ok(isAcceptedContractVersion(sessionPinned), `${sessionTypes} doit être épinglé à une version exacte X.Y.Z ou 0.0.0-dev.<sha>`);
  assert.equal(readJson(`node_modules/${sessionTypes}/package.json`).version, sessionPinned);
  const locked = readJson('package-lock.json').packages[`node_modules/${sessionTypes}`];
  assert.equal(locked.version, sessionPinned);
  assert.equal(locked.dev, true);
});

test('contracts/openapi.json est exactement le contrat reconstruit depuis le paquet installé', async () => {
  const { buildOrvalOpenApi } = await import('../scripts/orval-contract.mjs');
  const snapshot = readJson('contracts/openapi.json');
  assert.equal(snapshot.info['x-source-package'], `${PACKAGE_NAME}@${pinned}`);
  assert.equal(snapshot.info.title, 'bff_project');
  assert.deepEqual(snapshot, buildOrvalOpenApi(PACKAGE_NAME, ROOT));
});

test('chaque stack Docker démarre BFF_Project et BFF User dans les images construites depuis les commits des paquets épinglés', async () => {
  const { imageTagForContractVersion } = await import('../scripts/contract-version.mjs');
  const expectedProject = `ghcr.io/mairie360/bff-project:${imageTagForContractVersion(pinned)}`;
  const expectedUser = `ghcr.io/mairie360/bff-user:${imageTagForContractVersion(manifest.devDependencies['@mairie360/bff-user-openapi'])}`;
  for (const file of composeFiles) {
    const services = composePolicy.compose(file);
    const images = composePolicy.bffImages(services);
    assert.deepEqual(images.filter(image => image.startsWith('ghcr.io/mairie360/bff-project:')), [expectedProject], file);
    assert.deepEqual(images.filter(image => image.startsWith('ghcr.io/mairie360/bff-user:')), [expectedUser], file);
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

test('la politique de version accepte les releases et les paquets dev et les associe aux tags d’images', async () => {
  const { isAcceptedContractVersion, imageTagForContractVersion } = await import('../scripts/contract-version.mjs');
  assert.equal(imageTagForContractVersion('0.4.0'), '0.4.0');
  assert.equal(imageTagForContractVersion('0.0.0-dev.68d15b9b3719a593289d8833da176bb555a2c991'), 'dev-68d15b9');
  for (const rejected of ['^0.4.0', '0.4', '0.0.0-staging.68d15b9b3719a593289d8833da176bb555a2c991', '0.0.0-dev.68d15b9', 'latest']) {
    assert.equal(isAcceptedContractVersion(rejected), false, rejected);
  }
});
