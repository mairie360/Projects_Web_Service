const assert = require('node:assert/strict');
const { test } = require('node:test');
const { JSDOM } = require('jsdom');
const { requireTs } = require('./support/typescript.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { GridView, TableView } = requireTs('src/components/project/ProjectViews.tsx');
// MAIR-578: the shell adapter is the library's AccessibleShell.
const { AccessibleShell } = require('@mairie360/lib-components/shell');

test('the application adapter retains the shared shell sole skip link and actual main focus target', t => {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(AccessibleShell, {
    hrefs: { projects: 'https://projects.example/' }, user: { name: 'Agent fourni' },
  }, React.createElement('p', null, 'Projet fourni'))));
  t.after(() => dom.window.close());
  const document = dom.window.document;
  const skip = [...document.querySelectorAll('a')].filter(link => link.textContent.trim() === 'Aller au contenu');
  assert.equal(skip.length, 1);
  assert.equal(document.querySelector(skip[0].getAttribute('href')), document.querySelector('main'));
  assert.equal(document.querySelector('main').tabIndex, -1);
  assert.match(document.querySelector('main').textContent, /Projet fourni/);
});

for (const [name, View] of [['grid', GridView], ['table', TableView]]) {
  test(`an empty ${name} result is a named section without inventing project actions`, t => {
    const dom = new JSDOM(renderToStaticMarkup(React.createElement(View, { projects: [], memberOptions: [], labelOptions: [] })));
    t.after(() => dom.window.close());
    const document = dom.window.document;
    const section = document.querySelector('section[aria-labelledby]');
    assert.ok(section, 'An empty result remains identifiable when navigating by sections');
    const heading = document.getElementById(section.getAttribute('aria-labelledby'));
    assert.equal(heading.tagName, 'H3');
    assert.equal(heading.textContent, 'Aucun projet à afficher');
    assert.match(section.textContent, /Aucun projet ne correspond aux filtres sélectionnés/);
    assert.equal(section.querySelectorAll('button, a').length, 0, 'An empty view cannot invent a creation permission');
    assert.equal(document.querySelectorAll('[role="alert"], [role="status"]').length, 0, 'An empty success is not a loading or error announcement');
  });
}
