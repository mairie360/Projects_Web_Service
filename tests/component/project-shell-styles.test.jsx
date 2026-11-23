import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppShell, defaultSidebarItems } from '@mairie360/lib-components/shell';

const stylesheet = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
const hrefs = Object.fromEntries(defaultSidebarItems.map(({ id }) => [id, `https://${id}.example/`]));
let style;

beforeEach(() => {
  style = document.createElement('style');
  style.textContent = stylesheet;
  document.head.append(style);
});
afterEach(() => style.remove());

function renderShell() {
  return render(<AppShell activeItem="projects" isAdmin user={{ name: 'Agent fourni' }} hrefs={hrefs}>
    <p>Contenu fourni par le consommateur</p>
  </AppShell>);
}

describe('Projects styles applied to the published shell (MAIR-1133, lib-components 2.3)', () => {
  it('keeps no local rule over the lib components: the sidebar, the frame and the view switch are the lib\'s', () => {
    for (const selector of ['aside[', '.projects-shell', '[role="tablist"]', 'nav button', '> main']) {
      expect(stylesheet.includes(selector), selector).toBe(false);
    }
    renderShell();
    const sidebar = screen.getByRole('complementary', { name: 'Navigation principale' });
    expect(sidebar.style.boxShadow).toBe('');
    const navigation = within(sidebar).getByRole('navigation', { name: 'Menu principal' });
    expect(within(navigation).getAllByRole('button').map((button) => button.textContent)).toEqual(defaultSidebarItems.map(({ label }) => label));
  });

  it('shows no footer in the page base (C2)', () => {
    renderShell();
    expect(screen.queryByRole('contentinfo')).toBeNull();
    expect(screen.queryByText(/© \d{4} Mairie360/)).toBeNull();
  });

  it('opens the real drawer and closes it through the published control', async () => {
    const user = userEvent.setup();
    renderShell();
    const open = screen.getByRole('button', { name: 'Ouvrir la navigation', exact: true });
    await user.click(open);
    const drawer = screen.getByRole('dialog', { name: 'Navigation mobile' });
    expect(within(drawer).getByRole('complementary', { name: 'Navigation principale' })).toBeTruthy();
    await user.click(within(drawer).getByRole('button', { name: 'Fermer la navigation', exact: true }));
    expect(screen.queryByRole('dialog', { name: 'Navigation mobile' })).toBeNull();
  });
});
