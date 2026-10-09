# Frontend test policy

The CI and packaging assertions are grouped in `tests/ci-policy.test.cjs` (MAIR-437). The previous test bodies remain unchanged: reviewed scanner revisions, blocking defaults, named secrets, permissions, approval, package installation and runtime limits are still checked. Product sources, dependency pins, workflow configuration and accessibility controls are unchanged.

This consolidation does not make an audit failure pass. Local and CI results, merge provenance and delivery evidence remain separate. A test that parses configuration is a policy check, not a rendered product test.
