import process from 'node:process';
import console from 'node:console';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PACKAGE_NAME, buildOrvalOpenApi, resolveOrvalPackage } from './orval-contract.mjs';
import { isAcceptedContractVersion } from './contract-version.mjs';

// Le seul contrat routé par le proxy de ce front est celui de BFF_Project publié dans @mairie360/bff-project-openapi,
// épinglé à une version exacte (release X.Y.Z, ou paquet dev/staging d'un commit du main du BFF, voir
// contract-version.mjs). contracts/openapi.json en est la reconstruction versionnée
// (lue par le proxy au build et par les tests) ; il n'est jamais copié depuis un checkout du BFF.
//   --sync   (alias --generate) : régénère contracts/openapi.json depuis le paquet installé
//   --check  : échoue si la version n'est pas exacte, si le paquet installé diffère de package.json
//              ou si contracts/openapi.json n'est plus la reconstruction du paquet

const mode = process.argv[2] ?? '--check';
const spec = resolve('contracts/openapi.json');

function checkPinnedPackage() {
  const { dependencies = {}, devDependencies = {} } = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
  const pinned = dependencies[PACKAGE_NAME] ?? devDependencies[PACKAGE_NAME];
  if (!pinned) throw new Error(`${PACKAGE_NAME} doit être une dépendance de package.json.`);
  if (!isAcceptedContractVersion(pinned)) throw new Error(`${PACKAGE_NAME} must be pinned to an exact published version (X.Y.Z, 0.0.0-dev.<sha> or 0.0.0-staging.<sha>), found "${pinned}".`);
  const bffPackages = Object.keys({ ...dependencies, ...devDependencies }).filter((name) => /^@mairie360\/bff-.*-openapi$/.test(name));
  // User supplies types for Login's existing /me relay, never an additional
  // operation in Project's generated contract or business proxy allowlist. It follows the same
  // version policy (release X.Y.Z, or 0.0.0-dev.<sha> / 0.0.0-staging.<sha> of a BFF_user main commit) and stays a devDependency.
  const sessionTypes = '@mairie360/bff-user-openapi';
  const sessionPinned = devDependencies[sessionTypes];
  if (dependencies[sessionTypes] || !isAcceptedContractVersion(sessionPinned) ||
    JSON.parse(readFileSync(resolve('node_modules', sessionTypes, 'package.json'), 'utf8')).version !== sessionPinned) {
    throw new Error('The User session types must stay a devDependency pinned to an exact published version (X.Y.Z, 0.0.0-dev.<sha> or 0.0.0-staging.<sha>), installed as is.');
  }
  const businessPackages = bffPackages.filter(name => name !== sessionTypes);
  if (businessPackages.length !== 1) throw new Error(`Un seul contrat métier de BFF est autorisé (trouvé : ${businessPackages.join(', ')}).`);
  const installed = resolveOrvalPackage().version;
  if (installed !== pinned) throw new Error(`${PACKAGE_NAME}@${installed} est installé mais package.json épingle ${pinned} : lancer npm ci.`);
  return pinned;
}

const version = checkPinnedPackage();
const expected = `${JSON.stringify(buildOrvalOpenApi(), null, 2)}\n`;

if (mode === '--sync' || mode === '--generate') {
  mkdirSync(resolve('contracts'), { recursive: true });
  writeFileSync(spec, expected);
  console.log(`contracts/openapi.json régénéré depuis ${PACKAGE_NAME}@${version}.`);
} else if (mode === '--check') {
  if (!existsSync(spec) || readFileSync(spec, 'utf8') !== expected) {
    throw new Error(`contracts/openapi.json ne correspond pas à ${PACKAGE_NAME}@${version}. Lancer npm run contracts:sync.`);
  }
  console.log(`contracts/openapi.json correspond à ${PACKAGE_NAME}@${version}.`);
} else {
  throw new Error(`Mode inconnu : ${mode} (--sync, --generate ou --check).`);
}
