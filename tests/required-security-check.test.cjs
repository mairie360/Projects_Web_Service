const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const yaml = require('js-yaml');

const workflow = () => yaml.load(readFileSync(join(__dirname, '..', '.github/workflows/cicd.yml'), 'utf8'));
const checkout = 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1';
const scannerCommit = '539847726d4058a9565c4f682c2d1d8302874b06';

test('the exact required legacy status executes both real blocking scanners without extra access', () => {
  assert.deepEqual(workflow().jobs.required_security_scan, {
    name: 'CICD / Code Security Audit (Semgrep)',
    'runs-on': 'ubuntu-latest',
    'timeout-minutes': 20,
    permissions: { contents: 'read' },
    steps: [
      { name: 'Checkout frontend history', uses: checkout, with: { 'fetch-depth': 0, 'persist-credentials': false } },
      {
        name: 'Checkout reviewed scanner actions', uses: checkout,
        with: { repository: 'mairie360/CICD', ref: scannerCommit, path: 'cicd-repo', 'persist-credentials': false },
      },
      {
        name: 'Run blocking Semgrep scan', uses: './cicd-repo/actions/semgrep',
        with: {
          config: 'p/typescript p/react p/owasp-top-ten p/secrets p/dockerfile p/github-actions',
          fail_on_findings: 'true', artifact_name: 'semgrep-required-check-sarif',
        },
      },
      { name: 'Run blocking redacted Gitleaks scan', uses: './cicd-repo/actions/gitleaks', with: { fail_on_findings: 'true' } },
    ],
  });
});

test('the existing reusable frontend workflow keeps its blocking defaults and only declared secrets', () => {
  assert.deepEqual(workflow().jobs.CICD, {
    uses: 'mairie360/CICD/.github/workflows/frontend-cicd.yml@v4.1.1',
    with: { package_name: 'projects-front', node_version: '24.21.0', cicd_version: 'v4.1.1' },
    secrets: {
      CODECOV_TOKEN: '${{ secrets.CODECOV_TOKEN }}',
      N8N_WEBHOOK_SECRET: '${{ secrets.N8N_WEBHOOK_SECRET }}',
    },
  });
});

test('the required scan runs for every existing workflow event without changing global permissions', () => {
  const ci = workflow();
  assert.deepEqual(ci.on, { push: null, pull_request: null, workflow_dispatch: null });
  assert.deepEqual(ci.permissions, { contents: 'write', packages: 'write', 'id-token': 'write' });
  assert.deepEqual(Object.keys(ci.jobs).sort(), ['CICD', 'required_security_scan']);
});
