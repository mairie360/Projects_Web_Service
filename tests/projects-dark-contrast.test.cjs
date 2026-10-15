const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync, existsSync } = require('node:fs');
const { resolve, dirname } = require('node:path');
const { pathToFileURL } = require('node:url');
const { createRequire } = require('node:module');
const root = process.env.MAIRIE_THEME_ROOT || resolve(__dirname, '..');
const load = createRequire(resolve(root, 'package.json'));
const { JSDOM } = load('jsdom');
const postcss = load('postcss');
const { transform, Features } = load('lightningcss');
const markup = `<body class="mairie-ui"><main><section class="bg-white text-[#172033]">
<button id="view" class="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium bg-[#d4eeee] text-[#2b706c]">Kanban</button>
<span id="counter" class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d8dee4] px-1.5 text-xs font-semibold text-[#57606a]">2</span>
<span id="badge" class="rounded-full border border-[#aceebb] bg-[#dafbe1] px-2 text-xs text-[#1a7f37]">En cours</span>
<span id="priority" class="rounded-full border border-[#f1e5ff] bg-[#f1e5ff] px-2 text-xs text-[#8250df]">Moyenne</span>
<div class="bg-[#f6f8fa]"><p id="assignee-help" class="text-xs text-[#6e7781]">Choisir un ou plusieurs assignés</p></div>
<table><tbody><tr><td id="date" class="px-5 py-4 text-sm text-[#5e6873]">15/10/2026</td></tr></tbody></table>
<button id="primary" class="!h-9 !min-h-0 !rounded-md !px-4 !text-sm !font-semibold !text-white !border-[#2da44e] !bg-[#2da44e] hover:!bg-[#2c974b]">Créer le projet</button>
<button id="primary-hover" class="qa-hover !h-9 !min-h-0 !rounded-md !px-4 !text-sm !font-semibold !text-white !border-[#2da44e] !bg-[#2da44e] hover:!bg-[#2c974b]">Créer le projet</button>
<button id="plain-primary" class="bg-[#2da44e] text-white hover:bg-[#2c974b]">Ajouter</button><button id="plain-primary-hover" class="qa-hover bg-[#2da44e] text-white hover:bg-[#2c974b]">Ajouter</button>
<button id="disabled" disabled class="!h-9 !min-h-0 !rounded-md !px-4 !text-sm !font-semibold !text-white !border-[#a5bca9] !bg-[#a5bca9] !cursor-not-allowed">Créer le projet</button>
<button id="other-primary" class="bg-[#1256a6] text-white">Action bleue</button>
</section></main></body>`;

async function screen(theme) {
  const { compile } = load('tailwindcss');
  const globals = readFileSync(resolve(root, 'src/app/globals.css'), 'utf8');
  const municipalPath = process.env.MAIRIE_THEME_FILE || resolve(root, existsSync(resolve(root, 'src/styles/municipal-theme.css')) ? 'src/styles/municipal-theme.css' : 'src/app/municipal-theme.css');
  const municipal = readFileSync(municipalPath, 'utf8');
  const dom = new JSDOM(`<html data-theme="${theme}"><head></head>${markup}</html>`);
  dom.window.document.documentElement.setAttribute('data-qa-municipal', 'true');
  const classes = [...dom.window.document.querySelectorAll('[class]')].flatMap(element => [...element.classList]);
  const style = dom.window.document.createElement('style');
  const compiled = (await compile(`${globals}\n${municipal}`, {
    base: resolve(root, 'src/app'),
    loadStylesheet: async (id, base) => {
      const path = id === 'tailwindcss' ? load.resolve('tailwindcss/index.css') : id.startsWith('.') || id.startsWith('/') ? resolve(base, id) : load.resolve(id);
      return { path, base: dirname(path), content: readFileSync(path, 'utf8') };
    },
    loadModule: async id => ({ path: load.resolve(id), base: root, module: (await import(pathToFileURL(load.resolve(id)).href)).default }),
  })).build(classes);
  // JSDOM does not apply layered utility priority reliably. Keep the compiler's
  // layer order while exposing the declarations to its CSS cascade.
  const parsed = postcss.parse(transform({ filename: 'projects-contrast.css', code: Buffer.from(compiled), include: Features.Nesting }).code.toString());
  const layers = [];
  parsed.walkAtRules('layer', rule => {
    rule.params.split(',').map(name => name.trim()).filter(Boolean).forEach(name => { if (!layers.includes(name)) layers.push(name); });
  });
  const importantLayers = new WeakMap();
  parsed.walkDecls(declaration => {
    if (!declaration.important || !['background', 'background-color'].includes(declaration.prop)) return;
    let ancestor = declaration.parent; let layer;
    while (ancestor) { if (ancestor.type === 'atrule' && ancestor.name === 'layer') { layer = ancestor.params.trim(); break; } ancestor = ancestor.parent; }
    importantLayers.set(declaration, layer === undefined ? Infinity : layers.indexOf(layer));
  });
  parsed.walkAtRules('layer', rule => rule.replaceWith(...(rule.nodes ?? [])));
  // There is no DaisyUI theme-controller input in this fixture. Its :has rules
  // cannot match; omit them because older JSDOM misparses escaped ! utilities
  // when evaluating those unrelated selectors. Explicit data-theme rules stay.
  parsed.walkRules(rule => {
    // The fixture body is municipal; preserve the :has rule's specificity while
    // avoiding the same older JSDOM escaped-class bug for this known condition.
    rule.selector = rule.selector.replaceAll('html:has(body.mairie-ui)', 'html[data-qa-municipal="true"]');
    const selectors = rule.selectors.filter(selector => !selector.includes('.theme-controller'));
    if (selectors.length) rule.selectors = selectors; else rule.remove();
  });
  // Model a hover-capable pointer explicitly; JSDOM has no native pointer media.
  parsed.walkAtRules('media', rule => { if (rule.params === '(hover: hover)') rule.replaceWith(...(rule.nodes ?? [])); });
  parsed.walkRules(rule => { rule.selector = rule.selector.replaceAll(':hover', '.qa-hover'); });
  const importantBackgrounds = [];
  parsed.walkDecls(declaration => {
    if (declaration.important && ['background', 'background-color'].includes(declaration.prop)) importantBackgrounds.push({ rule: declaration.parent, rank: importantLayers.get(declaration) });
  });
  style.textContent = parsed.toString();
  dom.window.document.head.append(style);
  const computed = element => { try { return dom.window.getComputedStyle(element); } catch (error) { throw new Error(`${element.id}: ${error.name}: ${error.message}`, { cause: error }); } };
  // JSDOM drops shorthand backgrounds containing var(), unlike browsers.
  // Resolve only the actual active colour tokens before applying its cascade.
  const tokens = computed(dom.window.document.documentElement);
  const resolveTokens = css => css.replace(/var\((--mairie-[\w-]+)\)/g, (match, name) => {
    const value = tokens.getPropertyValue(name).trim();
    return /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value) ? value : match;
  });
  style.textContent = resolveTokens(style.textContent);
  // Important declarations reverse layer order: base beats utilities, and any
  // named layer beats unlayered !important. Flattening without this step gives
  // a false positive for escaped !bg utilities (confirmed in native Chrome).
  // Keep JSDOM's selector specificity/order only within the winning layer.
  const layeredBackground = element => {
    const matches = rule => rule.selectors.some(selector => !/::|:(?:before|after|first-letter|first-line)\b/.test(selector) && element.matches(selector));
    const applicable = importantBackgrounds.filter(candidate => matches(candidate.rule));
    if (!applicable.length) return computed(element).backgroundColor;
    const strongest = Math.min(...applicable.map(candidate => candidate.rank));
    const adjusted = parsed.clone(); let index = 0;
    adjusted.walkDecls(declaration => {
      if (!['background', 'background-color'].includes(declaration.prop)) return;
      // Important declarations also beat all normal declarations, regardless
      // of layer or selector specificity (older JSDOM misses this as well).
      if (!declaration.important) { if (declaration.parent.type === 'rule' && matches(declaration.parent)) declaration.remove(); return; }
      const candidate = importantBackgrounds[index++];
      if (candidate.rank > strongest && matches(declaration.parent)) declaration.remove();
    });
    const previous = style.textContent;
    try { style.textContent = resolveTokens(adjusted.toString()); return computed(element).backgroundColor; }
    finally { style.textContent = previous; }
  };
  const variable = (element, name) => {
    for (let current = element; current; current = current.parentElement) {
      const value = computed(current).getPropertyValue(name).trim();
      if (value) return value;
    }
    return '';
  };
  const colour = (value, element) => {
    for (let pass = 0; pass < 10 && value.includes('var('); ++pass) value = value.replace(/var\((--[\w-]+)(?:,\s*([^)]*))?\)/g, (_match, name, fallback) => variable(element, name) || fallback || '');
    if (/^#[\da-f]{3}$/i.test(value)) value = '#' + [...value.slice(1)].map(char => char + char).join('');
    if (/^#[\da-f]{6}$/i.test(value)) return [1, 3, 5].map(index => parseInt(value.slice(index, index + 2), 16));
    const rgb = /^rgb[a]?\((\d+)[, ]+(\d+)[, ]+(\d+)/.exec(value);
    assert.ok(rgb, `Expected an applied solid colour, received ${value}`);
    return rgb.slice(1, 4).map(Number);
  };
  const background = element => {
    for (let current = element; current; current = current.parentElement) {
      const value = layeredBackground(current);
      if (value && value !== 'transparent' && value !== 'rgba(0, 0, 0, 0)') return colour(value, current);
    }
    throw new Error('No rendered background');
  };
  const luminance = channels => channels.map(channel => channel / 255).map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  return {
    dom,
    colour: id => colour(computed(dom.window.document.getElementById(id)).color, dom.window.document.getElementById(id)),
    background: id => background(dom.window.document.getElementById(id)),
    contrast(id) {
      const element = dom.window.document.getElementById(id);
      const pair = [luminance(colour(computed(element).color, element)), luminance(background(element))].sort((a, b) => b - a);
      return (pair[0] + 0.05) / (pair[1] + 0.05);
    },
  };
}


for (const id of ['view', 'counter', 'badge', 'date', 'priority']) test(`dark rendered Projects ${id} reaches AA text contrast`, async context => {
  const view = await screen('dark');
  try {
    const ratio = view.contrast(id);
    context.diagnostic(`${id}: text rgb(${view.colour(id)}) on rgb(${view.background(id)}), contrast ${ratio.toFixed(2)}:1`);
    assert.ok(ratio >= 4.5, `${id} contrast ${ratio.toFixed(2)} must reach4.5`);
  } finally { view.dom.window.close(); }
});
for (const theme of ['light', 'dark']) test(`${theme}: important and plain green primary buttons preserve white AA text through hover`, async context => {
  const view = await screen(theme);
  try {
    for (const id of ['primary', 'primary-hover', 'plain-primary', 'plain-primary-hover']) {
      const ratio = view.contrast(id);
      context.diagnostic(`${id}: text rgb(${view.colour(id)}) on rgb(${view.background(id)}), contrast ${ratio.toFixed(2)}:1`);
      assert.deepEqual(view.colour(id), [255,255,255]);
      assert.ok(ratio >= 4.5, `${id} contrast ${ratio.toFixed(2)} must reach4.5`);
    }
    assert.notDeepEqual(view.background('primary'), view.background('primary-hover'));
    assert.notDeepEqual(view.background('plain-primary'), view.background('plain-primary-hover'));
    assert.deepEqual(view.background('other-primary'), [18,86,166]);
    assert.deepEqual(view.colour('other-primary'), [255,255,255]);
    assert.deepEqual(view.background('disabled'), [165,188,169]);
    assert.equal(view.dom.window.document.getElementById('disabled').disabled, true);
  } finally { view.dom.window.close(); }
});
test('light Projects keeps neutral metadata, selected tab and status badge colours', async () => {
  const view = await screen('light');
  try {
    assert.deepEqual(view.background('view'), [212,238,238]);
    assert.deepEqual(view.colour('view'), [43,112,108]);
    assert.deepEqual(view.background('counter'), [216,222,228]);
    assert.deepEqual(view.background('badge'), [218,251,225]);
    assert.deepEqual(view.colour('badge'), [26,127,55]);
    assert.deepEqual(view.colour('date'), [94,104,115]);
  } finally { view.dom.window.close(); }
});

test('light Projects medium priority badge reaches AA text contrast', async context => {
  const view = await screen('light');
  try {
    const ratio = view.contrast('priority');
    context.diagnostic(`priority: text rgb(${view.colour('priority')}) on rgb(${view.background('priority')}), contrast ${ratio.toFixed(2)}:1`);
    assert.ok(ratio >= 4.5, `priority contrast ${ratio.toFixed(2)} must reach4.5`);
  } finally { view.dom.window.close(); }
});

test('light Projects assignee helper reaches AA on its actual pale surface', async context => {
  const view = await screen('light');
  try {
    const ratio = view.contrast('assignee-help');
    context.diagnostic(`assignee-help: text rgb(${view.colour('assignee-help')}) on rgb(${view.background('assignee-help')}), contrast ${ratio.toFixed(2)}:1`);
    assert.ok(ratio >= 4.5, `assignee helper contrast ${ratio.toFixed(2)} must reach4.5`);
  } finally { view.dom.window.close(); }
});
