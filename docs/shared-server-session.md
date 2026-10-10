# Shared server session (MAIR-266)

Projects consumes the actual published `@mairie360/lib-components@0.7.1` server entry (`/next`, optional Next peer). Browser business requests use the same-origin `/api/bff` route, allowing the HttpOnly refresh cookie to keep its `/api` scope. Both that entry and the retained root catch-all accept only operations in the unchanged published Project contract; metadata and undeclared operations are refused.

The shared proxy retries a business request once after a 401, delegating renewal to configured Login. Login coordinates concurrent User refresh requests in one process, rotates both cookies and returns them to the requesting front. A rejected renewal returns to configured Login with the current page as a return URL only when its origin matches configured Projects. Renewal outages remain errors; automatic reconnection never invokes revocation or replays a write after navigation.

Explicit logout delegates to the same Login owner. Projects follows its validated receipt and optional SSO end-session destination. A failed or unconfirmed revocation remains visible in the existing alert, with an explicit retry through the logout control. A failed transport preserves the local session.

Tests exercise the actual published server handlers with real HTTP mocks for the unchanged Project contract and selected published User session operations. These checks do not certify authentication, Core revocation, IdP closure or persistence against deployed dev services. The owner coordinator is process-local; overlapping replicas require separate evidence. No BFF/API sources, deployment configuration, security checks or RGAA controls change.
