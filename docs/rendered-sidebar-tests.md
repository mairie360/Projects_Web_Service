# Sidebar styles applied to the published shell

The component regression mounts the actual installed AppShell with explicit test
destinations and applies Projects' actual stylesheet. It checks the rendered
sidebar position/layer, reference shadow and the declared minimum height and
shrink behavior of the real navigation buttons. It then opens the published
mobile drawer, checks its sidebar layer, and closes it through the actual control.
The previous source-text/sidebar tests move to these component checks; the root
typography and parsed global-style policies remain in the Node suite.

JSDOM does not compile Tailwind, apply responsive media queries, measure row
geometry or implement browser hit testing. Computed properties supported by this
environment and real component interaction are useful partial checks. Actual
main snapshots must still be exercised on mobile, tablet and desktop, including
the hit test on the drawer Close button. No application stylesheet, shared
package, dependency, contract, workflow or RGAA configuration changes.

Tracking: MAIR-437. This does not complete the wider frontend test audit or
certify real dev authentication, permissions or persistence.
