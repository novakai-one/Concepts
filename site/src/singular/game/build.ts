// The builder thread: the player writes a function (Python by default, real Python 3 via Pyodide;
// JavaScript also supported), tests run in a Web Worker with a time limit, and a passing function
// joins the player's library. Later chapters inject library functions by name, and the game can
// call them (pylib.call / lib.call) to drive real systems.
// Nothing here blocks: Show solution and Skip are always available, and a missing or failing
// function falls back to the reference version.
import type { BuildDef, Game } from './types';
import type { Hud } from './hud';
import { h, md, inline, button } from '../ui/ui';
import { S, save } from '../core/save';
import { sfx } from '../audio/sfx';
import { runPythonTests, callPython, mapPython, warmPython, pythonState } from './pyrunner';
import { swarmSize, assembleParts, dealOrder, hashStr, fillAnswers, deriveFill, composeFill, testHint, failurePattern, BLANK, type HelpMode } from './codehelp';
import { rng } from './lawcheck';

const REF = new Map<string, string>();      // reference solutions by function name
const LANG = new Map<string, 'python' | 'js'>();
const DEFS = new Map<string, BuildDef>();
const PASSING = 'buildPassing';
const DOCS = 'buildDocs';

/** Register every BuildDef (called once at boot from the chapter registry). */
export function registerBuild(def: BuildDef, replace = false): void {
  // a later story chapter may refactor a function (reachable -> solve); a dev chapter never replaces one
  if (REF.has(def.fn) && !replace) return;
  REF.set(def.fn, def.solution); LANG.set(def.fn, def.lang ?? 'python'); DEFS.set(def.fn, def); }

/** The player's own docstrings ("in your own words"), by function name. */
export function docs(): Record<string, string> {
  return ((S().flags[DOCS] as Record<string, string>) ??= {});
}

function passing(): Record<string, boolean> {
  return ((S().flags[PASSING] as Record<string, boolean>) ??= {});
}

/** Source for a library function: the player's if it passed its tests, otherwise the reference. */
export function libSource(fn: string): string | null {
  const own = S().code[fn];
  if (own && passing()[fn]) return own;
  return REF.get(fn) ?? null;
}

export function isPlayerFn(fn: string): boolean { return !!(S().code[fn] && passing()[fn]); }

const compiled = new Map<string, { src: string; f: (...a: unknown[]) => unknown }>();

/** Call a library function on the main thread (player version if passing, else reference). */
export const lib = {
  call<T = unknown>(fn: string, ...args: unknown[]): T {
    const src = libSource(fn);
    if (!src) throw new Error(`no library function ${fn}`);
    let c = compiled.get(fn);
    if (!c || c.src !== src) {
      const deps = [...REF.keys()].filter((k) => k !== fn && LANG.get(k) === 'js').map((k) => libSource(k)).filter(Boolean).join('\n');
      // eslint-disable-next-line no-new-func
      const f = new Function(`${deps}\n${src}\nreturn ${fn};`)() as (...a: unknown[]) => unknown;
      c = { src, f };
      compiled.set(fn, c);
    }
    try {
      return c.f(...structuredClone(args)) as T;
    } catch {
      const ref = REF.get(fn)!;
      // eslint-disable-next-line no-new-func
      const f = new Function(`${ref}\nreturn ${fn};`)() as (...a: unknown[]) => unknown;
      return f(...args) as T;
    }
  },
  has(fn: string): boolean { return !!libSource(fn); },
  mine: isPlayerFn,
};

/** Python library: every registered Python function (the player's where passing), in order. */
function pyLibrary(except?: string): string {
  return [...REF.keys()].filter((k) => k !== except && LANG.get(k) === 'python').map((k) => libSource(k)).filter(Boolean).join('\n\n');
}

/** Call a Python library function (async: it runs in the Python worker). Falls back to the reference. */
export const pylib = {
  async call<T = unknown>(fn: string, ...args: unknown[]): Promise<T> {
    const r = await callPython(pyLibrary(), fn, args);
    if (r.error === undefined) return r.value as T;
    const ref = REF.get(fn);
    if (!ref) throw new Error(r.error);
    const r2 = await callPython(`${pyLibrary(fn)}\n\n${ref}`, fn, args);
    if (r2.error) throw new Error(r2.error);
    return r2.value as T;
  },
  /**
   * Run fn over many argument lists in one Python call (installs, GDD §5.5). The player's version runs when it
   * passed its tests; otherwise (or on any error) the reference does. `who` says which one produced the values.
   */
  async map<T = unknown>(fn: string, cases: unknown[][]): Promise<{ values: T[]; who: 'yours' | 'backup' }> {
    if (isPlayerFn(fn)) {
      const r = await mapPython(pyLibrary(), fn, cases);
      if (r.error === undefined) return { values: r.value as T[], who: 'yours' };
    }
    const ref = REF.get(fn);
    if (!ref) throw new Error(`no library function ${fn}`);
    const r2 = await mapPython(`${pyLibrary(fn)}\n\n${ref}`, fn, cases);
    if (r2.error !== undefined) throw new Error(r2.error);
    return { values: r2.value as T[], who: 'backup' };
  },
  warm: warmPython,
  state: pythonState,
};

/** Every function in the player's library, as one file: lantern.py (GDD §5.7). */
export function exportLibrary(): string {
  const head = '# lantern.py: the functions you wrote while playing SINGULAR.\n# Plain Python lists and math only. Each of your functions passed its tests in the game.\n# Functions you have not written yet are LANTERN\'s backup versions, marked as such.\n\nimport math\n';
  return head + [...REF.keys()].filter((k) => LANG.get(k) === 'python').map((k) => {
    const own = S().code[k];
    const words = docs()[k]?.trim();
    const note = words ? `${words.split('\n').map((l) => `# ${l}`).join('\n')}\n` : '';
    return own && passing()[k] ? `\n# ---- ${k}: yours\n${note}${own.trimEnd()}\n` : `\n# ---- ${k}: LANTERN backup (not written yet)\n${REF.get(k)!.trimEnd()}\n`;
  }).join('');
}

/** The fixed tests of every Python build as plain asserts: test_lantern.py (run with pytest or python). */
export function exportTests(): string {
  const lit = (x: unknown): string => JSON.stringify(x).replace(/\btrue\b/g, 'True').replace(/\bfalse\b/g, 'False').replace(/\bnull\b/g, 'None');
  const out = ['# test_lantern.py: the tests your functions passed in SINGULAR.', '# Run: python test_lantern.py  (or: pytest test_lantern.py)', '', 'import math', 'from lantern import *', '',
    'def close(a, b, tol=1e-6):',
    '    if isinstance(a, (list, tuple)) and isinstance(b, (list, tuple)):',
    '        return len(a) == len(b) and all(close(x, y, tol) for x, y in zip(a, b))',
    '    if isinstance(a, dict) and isinstance(b, dict):',
    '        return a.keys() == b.keys() and all(close(a[k], b[k], tol) for k in a)',
    '    if isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool):',
    '        return abs(a - b) <= tol',
    '    return a == b', ''];
  const names: string[] = [];
  for (const [fn, def] of DEFS) {
    if ((def.lang ?? 'python') !== 'python') continue;
    names.push(`test_${fn}`);
    out.push(`def test_${fn}():`);
    for (const t of def.tests) out.push(`    assert close(${fn}(${t.args.map(lit).join(', ')}), ${lit(t.expect)}${t.tol ? `, ${t.tol}` : ''})  # ${t.name.replace(/`/g, '')}`);
    out.push('');
  }
  out.push('if __name__ == "__main__":', ...names.map((n) => `    ${n}()`), '    print("All tests pass.")', '');
  return out.join('\n');
}

const WORKER_SRC = `
const close = (a, b, tol) => {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= tol || (Number.isNaN(a) && Number.isNaN(b));
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => close(x, b[i], tol));
  if (a && b && typeof a === 'object' && typeof b === 'object') { const ka = Object.keys(a), kb = Object.keys(b); return ka.length === kb.length && ka.every((k) => close(a[k], b[k], tol)); }
  return a === b;
};
const show = (x) => { try { return JSON.stringify(x, (k, v) => typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v); } catch { return String(x); } };
self.onmessage = (e) => {
  const { libSrc, code, fn, tests } = e.data;
  const out = [];
  let f;
  try {
    f = new Function(libSrc + '\\n' + code + '\\n;return typeof ' + fn + " === 'function' ? " + fn + ' : undefined;')();
  } catch (err) { self.postMessage({ error: 'Your code has a syntax error: ' + err.message }); return; }
  if (!f) { self.postMessage({ error: 'Define a function named ' + fn + '.' }); return; }
  for (const t of tests) {
    try {
      const got = f(...JSON.parse(JSON.stringify(t.args)));
      out.push({ name: t.name, ok: close(got, t.expect, t.tol ?? 1e-6), got: show(got), want: show(t.expect) });
    } catch (err) { out.push({ name: t.name, ok: false, got: 'error: ' + err.message, want: show(t.expect) }); }
  }
  self.postMessage({ results: out });
};`;

interface TestResult { name: string; ok: boolean; got: string; want: string }

/** Every library function a build may reach: its `uses`, their `uses`, and so on (lincomb needs scale and add). */
export function usesClosure(def: BuildDef): string[] {
  const seen = new Set<string>();
  const visit = (fn: string) => { if (seen.has(fn) || fn === def.fn) return; seen.add(fn); for (const u of DEFS.get(fn)?.uses ?? []) visit(u); };
  for (const u of def.uses ?? []) visit(u);
  return [...seen];
}

export async function runTests(def: BuildDef, code: string, timeoutMs = 2000, tests = def.tests): Promise<{ error?: string; results?: TestResult[]; stdout?: string }> {
  if ((def.lang ?? 'python') === 'python') {
    const lib = usesClosure(def).map((u) => libSource(u)).filter(Boolean).join('\n\n');
    return runPythonTests(lib, code, def.fn, tests, Math.max(timeoutMs, 4000));
  }
  return new Promise((resolve) => {
    let w: Worker;
    try {
      w = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })));
    } catch {
      resolve({ error: 'This browser blocked the code runner (Web Workers).' });
      return;
    }
    const timer = window.setTimeout(() => { w.terminate(); resolve({ error: `Your code ran for more than ${timeoutMs / 1000} s. Is there a loop that never ends?` }); }, timeoutMs);
    w.onmessage = (e) => { window.clearTimeout(timer); w.terminate(); resolve(e.data); };
    w.onerror = (e) => { window.clearTimeout(timer); w.terminate(); resolve({ error: e.message }); };
    const libSrc = usesClosure(def).map((u) => libSource(u)).filter(Boolean).join('\n');
    w.postMessage({ libSrc, code, fn: def.fn, tests });
  });
}

/** Tiny highlighter for the editor overlay (comments, keywords, numbers). */
function highlight(src: string, lang: 'python' | 'js'): string {
  const esc = src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const comment = lang === 'python' ? /(#[^\n]*)/g : /(\/\/[^\n]*)/g;
  const kw = lang === 'python'
    ? /\b(def|return|for|in|if|elif|else|while|and|or|not|import|from|as|True|False|None|lambda|range|len|sum|zip|abs|min|max|enumerate|math|print)\b(?![^<]*<\/span>)/g
    : /\b(function|return|const|let|var|for|while|if|else|of|in|new|true|false|null|undefined|Math)\b(?![^<]*<\/span>)/g;
  return esc
    .replace(comment, '<span class="hl-c">$1</span>')
    .replace(kw, '<span class="hl-k">$1</span>')
    .replace(/\b(\d+\.?\d*)\b(?![^<]*<\/span>)/g, '<span class="hl-n">$1</span>') + '\n';
}

/** The Write-mode editor: a textarea over a highlighted copy. */
function writeEditor(initial: string, lang: 'python' | 'js', onRun: () => void) {
  const indent = lang === 'python' ? '    ' : '  ';
  const ta = h('textarea', { class: 'code-ta', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', 'aria-label': 'Your code' }) as HTMLTextAreaElement;
  const pre = h('pre', { class: 'code-hl', 'aria-hidden': 'true' });
  const sync = () => { pre.innerHTML = highlight(ta.value, lang); pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; };
  ta.value = initial;
  ta.addEventListener('input', sync);
  ta.addEventListener('scroll', sync);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const st = ta.selectionStart, en = ta.selectionEnd;
      ta.value = `${ta.value.slice(0, st)}${indent}${ta.value.slice(en)}`;
      ta.selectionStart = ta.selectionEnd = st + indent.length;
      sync();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onRun(); }
    if (e.key !== 'Escape') e.stopPropagation(); // Esc still opens the menu
  });
  sync();
  return {
    el: h('div', { class: 'code-wrap' }, pre, ta),
    code: () => ta.value,
    set: (v: string) => { ta.value = v; sync(); },
    focus: () => ta.focus(),
    /** Show me: type the solution line by line. */
    async type(src: string, fast: boolean) {
      const lines = src.replace(/\s+$/, '').split('\n');
      ta.value = '';
      for (const l of lines) { ta.value += `${l}\n`; sync(); if (!fast) await new Promise((r) => window.setTimeout(r, 140)); }
    },
  };
}

/** The Fill-mode editor: the function with inputs in its blanks. */
function fillEditor(template: string, lang: 'python' | 'js', saved: string[] | undefined, onRun: () => void) {
  const parts = template.split(BLANK);
  const inputs: HTMLInputElement[] = [];
  const pre = h('pre', { class: 'fill-code' });
  parts.forEach((p, i) => {
    pre.insertAdjacentHTML('beforeend', highlight(p, lang).replace(/\n$/, ''));
    if (i < parts.length - 1) {
      const inp = h('input', { class: 'blank', type: 'text', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', 'aria-label': `Blank ${i + 1}` }) as HTMLInputElement;
      inp.value = saved?.[i] ?? '';
      const fit = () => { inp.style.width = `${Math.max(5, inp.value.length + 2)}ch`; };
      inp.addEventListener('input', fit);
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); const next = inputs[i + 1]; if (next && !(e.ctrlKey || e.metaKey)) next.focus(); else onRun(); }
        if (e.key !== 'Escape') e.stopPropagation();
      });
      fit();
      inputs.push(inp);
      pre.append(inp);
    }
  });
  return {
    el: h('div', { class: 'code-wrap fill-wrap' }, pre),
    code: () => composeFill(template, inputs.map((x) => x.value)),
    entries: () => inputs.map((x) => x.value),
    set: (vals: string[]) => vals.forEach((v, i) => { if (inputs[i]) { inputs[i].value = v; inputs[i].dispatchEvent(new Event('input')); } }),
    focus: () => inputs[0]?.focus(),
  };
}

/** The Assemble-mode editor (a Parsons puzzle): click lines into order; decoys are misconceptions. */
function assembleEditor(head: string[], body: string[], decoys: string[], seed: number, savedOrder: string[] | undefined) {
  let placed: string[] = savedOrder?.filter((l) => body.includes(l) || decoys.includes(l)) ?? [];
  const pool = h('div', { class: 'asm-pool', role: 'list', 'aria-label': 'Lines to use' });
  const list = h('div', { class: 'asm-list', role: 'list', 'aria-label': 'Your function' });
  const dealt = dealOrder([...body, ...decoys], seed);
  const lineBtn = (text: string, cls: string, onClick: () => void, extra?: HTMLElement) => {
    const b = h('button', { class: `asm-line ${cls}`, type: 'button', role: 'listitem' }, h('code', null, text.replace(/^ +/, (m) => ' '.repeat(m.length))));
    b.addEventListener('click', (e) => { e.stopPropagation(); sfx.click(); onClick(); });
    if (extra) b.append(extra);
    return b;
  };
  const render = () => {
    const used = new Map<string, number>();
    for (const l of placed) used.set(l, (used.get(l) ?? 0) + 1);
    pool.replaceChildren(h('div', { class: 'kicker' }, 'Lines'), ...dealt.filter((l) => {
      const n = used.get(l) ?? 0;
      if (n > 0) { used.set(l, n - 1); return false; }
      return true;
    }).map((l) => lineBtn(l, '', () => { placed.push(l); render(); })));
    list.replaceChildren(h('div', { class: 'kicker' }, 'Your function'),
      ...head.map((l) => h('div', { class: 'asm-line fixed' }, h('code', null, l.replace(/^ +/, (m) => ' '.repeat(m.length))))),
      ...placed.map((l, i) => {
        const up = h('span', { class: 'asm-up', title: 'Move up', role: 'button', 'aria-label': 'Move up' }, '↑');
        up.addEventListener('click', (e) => { e.stopPropagation(); if (i > 0) { [placed[i - 1], placed[i]] = [placed[i], placed[i - 1]]; sfx.click(); render(); } });
        return lineBtn(l, 'placed', () => { placed.splice(i, 1); render(); }, i > 0 ? up : undefined);
      }),
      ...(placed.length ? [] : [h('div', { class: 'c-muted asm-empty' }, 'Click lines on the left to add them here, in order. Click a placed line to take it back.')]));
  };
  render();
  return {
    el: h('div', { class: 'code-wrap asm' }, pool, list),
    code: () => `${[...head, ...placed].join('\n')}\n`,
    order: () => placed.slice(),
    set: (order: string[]) => { placed = order.slice(); render(); },
    focus: () => (pool.querySelector('button') as HTMLButtonElement | null)?.focus(),
  };
}

type Editor = { el: HTMLElement; code: () => string; focus: () => void };

export async function runBuild(g: Game, def: BuildDef, hud: Hud): Promise<void> {
  const lang = def.lang ?? 'python';
  if (lang === 'python') warmPython();
  const settings = S().settings;
  const saved = S().code[def.fn];
  const fillT = def.fill ? { template: def.fill, answers: fillAnswers(def.fill, def.solution) } : deriveFill(def.solution);
  const asm = assembleParts(def.solution, def.assemble);
  const modes: HelpMode[] = ['assemble', 'fill', 'write'].filter((m) => (m === 'fill' ? !!fillT : m === 'assemble' ? asm.body.length + asm.decoys.length >= 2 : true)) as HelpMode[];
  const want = settings.codeHelp === 'off' ? 'write' : settings.codeHelp;
  let mode: HelpMode = saved && passing()[def.fn] ? 'write' : modes.includes(want) ? want : 'write';
  const state = ((S().flags.buildDraft as Record<string, { fill?: string[]; order?: string[] }>) ??= {});
  const draft = (state[def.fn] ??= {});

  const results = h('div', { class: 'test-results' });
  const swarmEl = h('div', { class: 'swarm' });
  swarmEl.hidden = true;
  const status = h('div', { class: 'build-status', role: 'status' });
  const stdout = h('pre', { class: 'build-stdout' });
  stdout.hidden = true;
  if (lang === 'python' && pythonState() !== 'ready') status.innerHTML = '<span class="c-muted">Starting Python…</span>';
  const uses = (def.uses ?? []).length
    ? h('div', { class: 'c-muted build-uses', html: inline(`You can call: ${def.uses!.map((u) => `\`${u}\`${isPlayerFn(u) ? ' (yours)' : ''}`).join(', ')}`) })
    : null;
  const resetResults = () => {
    results.replaceChildren(...def.tests.map((t) => h('div', { class: 'test' }, h('span', { class: 'mark c-muted' }, '·'), h('span', { class: 'tname', html: inline(t.name) }))));
  };
  resetResults();

  let passed = !!(saved && passing()[def.fn]);
  let running = false;
  let editor: Editor;
  let writeEd: ReturnType<typeof writeEditor> | null = null;
  let fillEd: ReturnType<typeof fillEditor> | null = null;
  let asmEd: ReturnType<typeof assembleEditor> | null = null;
  const host = h('div', { class: 'editor-host' });
  const tabs = h('div', { class: 'build-modes seg', role: 'tablist', 'aria-label': 'Code help' });
  const label: Record<HelpMode, string> = { assemble: 'Assemble', fill: 'Fill', write: 'Write' };
  const tip: Record<HelpMode, string> = { assemble: 'Put the given lines in order', fill: 'Fill the blanks', write: 'Write the body yourself' };
  const mount = (m: HelpMode) => {
    if (!modes.includes(m)) m = 'write';
    mode = m;
    if (m === 'write') editor = writeEd ??= writeEditor(saved ?? def.starter, lang, () => void run());
    else if (m === 'fill') editor = fillEd ??= fillEditor(fillT!.template, lang, draft.fill, () => void run());
    else editor = asmEd ??= assembleEditor(asm.head, asm.body, asm.decoys, hashStr(def.fn), draft.order);
    host.replaceChildren(editor.el);
    tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
  };
  for (const m of modes) {
    const b = h('button', { class: 'btn small', type: 'button', role: 'tab', title: tip[m], 'data-mode': m }, label[m]);
    b.addEventListener('click', () => { sfx.click(); mount(m); editor.focus(); });
    tabs.append(b);
  }
  tabs.append(h('span', { class: 'c-muted build-mode-tip' }, 'Code help'));

  const showSwarm = (n: number, ok: number, fails: { args: unknown[]; got: string; want: string }[], pattern: string | null) => {
    swarmEl.hidden = false;
    swarmEl.replaceChildren(
      h('div', { class: `swarm-head ${ok === n ? 'c-green' : 'c-red'}` }, `Swarm: ${ok} of ${n} random cases pass`),
      h('div', { class: 'swarm-bar' }, h('span', { style: `width:${(100 * ok) / n}%` })),
      ...(pattern ? [h('div', { class: 'swarm-pattern' }, pattern)] : []),
      ...fails.slice(0, 3).map((f) => h('div', { class: 'tdiff' }, `${def.fn}(${f.args.map((a) => JSON.stringify(a)).join(', ')}) gave ${f.got}, want ${f.want}`)));
  };

  const docBox = h('div', { class: 'doc-box' });
  docBox.hidden = true;
  const openDocs = () => {
    if (!docBox.hidden) return;
    docBox.hidden = false;
    const ta = h('textarea', { class: 'own-words', rows: 4, placeholder: 'Your docstring, in your own words. Saved with your code and exported in lantern.py.' }) as HTMLTextAreaElement;
    ta.value = docs()[def.fn] ?? '';
    ta.addEventListener('input', () => { docs()[def.fn] = ta.value; save(); });
    ta.addEventListener('keydown', (e) => { if (e.key !== 'Escape') e.stopPropagation(); });
    const note = def.ilseNote ? h('details', { class: 'ilse-note' }, h('summary', null, 'Ilse’s original note'), h('div', { html: md(def.ilseNote) })) : null;
    docBox.replaceChildren(
      h('div', { class: 'kicker' }, 'In your own words'),
      h('p', { class: 'doc-prompt', html: inline(def.docPrompt ?? 'What question does this function answer, and why does the code work? Write it the way you would tell Bram.') }),
      ta, ...(note ? [note] : []));
  };

  const run = async (): Promise<void> => {
    if (running) return;
    running = true;
    try {
      const code = editor.code();
      if (fillEd) draft.fill = fillEd.entries();
      if (asmEd) draft.order = asmEd.order();
      status.textContent = lang === 'python' && pythonState() !== 'ready' ? 'Starting Python (first run takes a few seconds)…' : 'Running…';
      const r = await runTests(def, code);
      results.replaceChildren();
      stdout.hidden = !r.stdout;
      stdout.textContent = r.stdout ? `print output:\n${r.stdout}` : '';
      swarmEl.hidden = true;
      if (r.error) { status.innerHTML = `<span class="c-red">${inline(r.error)}</span>`; resetResults(); sfx.miss(); return; }
      const all = r.results ?? [];
      const n = all.filter((x) => x.ok).length;
      for (const t of all) {
        const hint = t.ok ? null : testHint(t.got, t.want);
        results.appendChild(h('div', { class: `test ${t.ok ? 'ok' : 'fail'}` },
          h('span', { class: 'mark' }, t.ok ? '✓' : '✗'),
          h('span', { class: 'tname', html: inline(t.name) }),
          t.ok ? null : h('span', { class: 'tdiff' }, `got ${t.got}, want ${t.want}`),
          hint ? h('span', { class: 'thint', html: inline(hint) }) : null));
      }
      let ok = n === all.length;
      if (ok && def.swarm) {
        const size = swarmSize(settings.difficulty);
        const r0 = rng(hashStr(def.fn) + Math.floor(Math.random() * 1e6));
        const cases = Array.from({ length: size }, () => def.swarm!.gen(r0, settings.difficulty));
        const tests = cases.map((args, i) => ({ name: `case ${i + 1}`, args, expect: def.swarm!.crew(...args), tol: def.swarm!.tol }));
        status.textContent = `Running the swarm: ${size} random cases…`;
        const sr = await runTests(def, code, 4000, tests);
        if (sr.error) { status.innerHTML = `<span class="c-red">${inline(sr.error)}</span>`; sfx.miss(); return; }
        const res = sr.results ?? [];
        const failIdx = res.map((x, i) => (x.ok ? -1 : i)).filter((i) => i >= 0);
        const passIdx = res.map((x, i) => (x.ok ? i : -1)).filter((i) => i >= 0);
        showSwarm(size, passIdx.length, failIdx.map((i) => ({ args: cases[i], got: res[i].got, want: res[i].want })), failurePattern(failIdx.map((i) => cases[i]), passIdx.map((i) => cases[i])));
        ok = failIdx.length === 0;
      }
      passed = ok;
      status.innerHTML = passed
        ? `<span class="c-green">All tests pass${def.swarm ? ', and the swarm' : ''}. This function is now part of your library.</span>`
        : n === all.length ? '<span>The fixed tests pass, but some random cases fail.</span>' : `<span>${n} of ${all.length} tests pass.</span>`;
      S().code[def.fn] = code;
      passing()[def.fn] = passed;
      save();
      if (passed) { sfx.solved(); openDocs(); } else sfx.miss();
    } finally { running = false; }
  };

  const showMe = async () => {
    if (mode === 'fill' && fillEd && fillT?.answers) fillEd.set(fillT.answers);
    else if (mode === 'assemble' && asmEd) asmEd.set(asm.body);
    else { mount('write'); await writeEd!.type(def.solution, g.headless || settings.reduceMotion); }
    await run();
  };

  const box = h('div', { class: 'build glass' },
    h('div', { class: 'build-left' },
      h('div', { class: 'kicker' }, `Build · ${def.fn}() · ${lang === 'python' ? 'Python' : 'JavaScript'}`),
      h('h2', { html: inline(def.title) }),
      h('div', { class: 'build-brief', html: md(def.brief) }),
      uses,
      h('div', { class: 'kicker', style: 'margin-top:14px' }, 'Tests'),
      results,
      swarmEl,
      def.payoff ? h('div', { class: 'build-payoff', html: md(`**What it powers:** ${def.payoff}`) }) : null,
      docBox),
    h('div', { class: 'build-right' },
      tabs,
      host,
      status,
      stdout,
      h('div', { class: 'build-actions' },
        button('Run tests', () => void run(), { cls: 'primary small', kbd: 'Ctrl+Enter' }),
        button('Show me', () => void showMe(), { cls: 'small' }),
        button('Start over', () => {
          if (mode === 'write') writeEd?.set(def.starter);
          else if (mode === 'fill') fillEd?.set(fillT!.template.split(BLANK).slice(1).map(() => ''));
          else asmEd?.set([]);
          resetResults(); swarmEl.hidden = true; status.textContent = '';
        }, { cls: 'ghost small' }))));
  box.style.pointerEvents = 'auto';
  mount(mode);
  if (passed) openDocs();
  g.ui.scene.appendChild(box);
  editor!.focus();
  buildTest.current = { run, showMe, mode: () => mode, setMode: (m: HelpMode) => mount(m), passed: () => passed };
  try {
    await hud.primary('Continue');
  } finally {
    buildTest.current = null;
    if (!passed) { const c = editor!.code(); if (c !== def.starter) { S().code[def.fn] = c; save(); } }
    box.remove();
  }
}

/** Debug hooks for tests: the open builder. */
export const buildTest: { current: null | { run: () => Promise<void>; showMe: () => Promise<void>; mode: () => HelpMode; setMode: (m: HelpMode) => void; passed: () => boolean } } = { current: null };
