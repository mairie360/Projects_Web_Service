import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppShell, defaultSidebarItems } from '@mairie360/lib-components';

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

describe('Projects styles applied to the published shell', () => {
  it('applies the reference sidebar position, shadow and navigation row styles to real elements', () => {
    renderShell();
    const sidebar = screen.getByRole('complementary', { name: 'Navigation principale' });
    const computed = getComputedStyle(sidebar);
    expect(computed.position).toBe('relative');
    expect(computed.zIndex).toBe('20');
    // This is computed CSS output, not matching a stylesheet source selector.
    const shadowParts = computed.boxShadow.split(/\s+(?![^()]*\))/);
    const pixels = (value) => {
      const number = parseFloat(value);
      expect(number === 0 || value.toLowerCase().endsWith('px')).toBe(true);
      return number;
    };
    expect(shadowParts.slice(0, 3).map(pixels)).toEqual([8, 0, 24]);
    const explicitSpread = Number.isFinite(parseFloat(shadowParts[3]));
    if (explicitSpread) expect(pixels(shadowParts[3])).toBe(0);
    const color = document.createElement('span');
    color.style.color = shadowParts.slice(explicitSpread ? 4 : 3).join(' ');
    document.body.append(color);
    try {
      expect(getComputedStyle(color).color).toBe('rgba(12, 28, 48, 0.28)');
    } finally {
      color.remove();
    }
    const navigation = within(sidebar).getByRole('navigation', { name: 'Menu principal' });
    const buttons = within(navigation).getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual(defaultSidebarItems.map(({ label }) => label));
    for (const button of buttons) {
      expect(getComputedStyle(button).minHeight).toBe('44px');
      expect(getComputedStyle(button).flexShrink).toBe('0');
    }
  });

  it('opens the real drawer, applies its lower sidebar layer and closes through the published control', async () => {
    const user = userEvent.setup();
    renderShell();
    const open = screen.getByRole('button', { name: 'Ouvrir la navigation', exact: true });
    await user.click(open);
    const drawer = screen.getByRole('dialog', { name: 'Navigation mobile' });
    const sidebar = within(drawer).getByRole('complementary', { name: 'Navigation principale' });
    expect(getComputedStyle(sidebar).zIndex).toBe('0');
    await user.click(within(drawer).getByRole('button', { name: 'Fermer la navigation', exact: true }));
    expect(screen.queryByRole('dialog', { name: 'Navigation mobile' })).toBeNull();
  });
});
