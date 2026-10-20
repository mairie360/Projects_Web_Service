import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useInstanceRole, useInstanceTimeZone } from '@mairie360/lib-components/react';

const request = vi.hoisted(() => ({ cookies: {} }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: name => request.cookies[name] === undefined ? undefined : { value: request.cookies[name] } }) }));
vi.mock('next/font/google', () => ({ Geist: options => ({ variable: options.variable }) }));
vi.mock('@/app/globals.css', () => ({}));
vi.mock('@/app/municipal-theme.css', () => ({}));
import RootLayout from '@/app/layout';
import { frontUrl, setBrowserFrontUrls } from '@/lib/front-urls';
function InstanceContent() {
  return <p>{useInstanceRole()} {useInstanceTimeZone()} <a href={frontUrl('DASHBOARD_FRONT_URL')}>Dashboard</a></p>;
}
beforeEach(() => { request.cookies = {}; vi.stubEnv('DASHBOARD_FRONT_URL', 'https://dashboard.mairie.test/work/'); vi.stubEnv('INSTANCE_TIMEZONE', 'Indian/Reunion'); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); setBrowserFrontUrls({}); });
it('server display uses its validated role, instance timezone and public frontend URLs without a request', async () => {
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('display must not make a network request'); }));
  let html = renderToStaticMarkup(await RootLayout({ children: <InstanceContent /> }));
  expect(html).toContain('Guest Indian/Reunion');
  expect(html).toContain('href="https://dashboard.mairie.test/work/"');
  request.cookies.accessToken = 'e30.' + Buffer.from(JSON.stringify({ exp: Date.now() / 1000 + 600, role: 'Admin' })).toString('base64url') + '.signature';
  html = renderToStaticMarkup(await RootLayout({ children: <InstanceContent /> }));
  expect(html).toContain('Admin Indian/Reunion');
  expect(html).not.toContain(request.cookies.accessToken);
  expect(fetch).not.toHaveBeenCalled();
});
it('SSR immediately uses the confirmed public appearance and falls back safely when absent', async () => {
  let html = renderToStaticMarkup(await RootLayout({ children: <p>Retained project</p> }));
  expect(html).toContain('data-theme="system"');
  expect(html).toContain('data-density="normal"');
  request.cookies.mairie360_appearance = encodeURIComponent(JSON.stringify({ v: 1, theme: 'dark', density: 'compact', font_family: 'Arial' }));
  html = renderToStaticMarkup(await RootLayout({ children: <p>Retained project</p> }));
  expect(html).toContain('data-theme="dark"');
  expect(html).toContain('data-density="compact"');
  expect(html).toContain('Retained project');
});
