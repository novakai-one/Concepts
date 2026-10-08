// Real Python (Pyodide, served from public/singular/pyodide/) in a Web Worker.
// One worker is kept warm. Each run gets a fresh namespace. A run that takes too long (a loop that
// never ends) terminates the worker; the next run starts a new one.
let worker: Worker | null = null;
let ready: Promise<void> | null = null;
let seq = 0;
const pending = new Map<number, (r: PyResult) => void>();
let base = new URL('./pyodide/', location.href).href;

export function setPyodideBase(url: string): void { base = new URL(url, location.href).href; }

export interface PyTestResult { name: string; ok: boolean; got: string; want: string }
export interface PyResult { error?: string; results?: PyTestResult[]; stdout?: string; value?: unknown }

const WORKER = (indexURL: string) => `
import { loadPyodide } from '${indexURL}pyodide.mjs';
// hosts that cannot serve a .zip get the standard library as base64 text (tools/singular/artifact.mjs)
let stdLibURL;
try { const h = await fetch('${indexURL}python_stdlib.zip', { method: 'HEAD' }); if (!h.ok) throw new Error('no zip'); }
catch {
  const t = await (await fetch('${indexURL}python_stdlib.b64.txt')).text();
  const bin = Uint8Array.from(atob(t.trim()), (c) => c.charCodeAt(0));
  stdLibURL = URL.createObjectURL(new Blob([bin], { type: 'application/zip' }));
}
const py = await loadPyodide(stdLibURL ? { indexURL: '${indexURL}', stdLibURL } : { indexURL: '${indexURL}' });
let out = [];
py.setStdout({ batched: (s) => out.push(s) });
py.setStderr({ batched: (s) => out.push(s) });
py.runPython(\`
import json, math, traceback
def __close(a, b, tol):
    if isinstance(a, bool) or isinstance(b, bool):
        return a == b
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(a - b) <= tol or (a != a and b != b)
    if isinstance(a, (list, tuple)) and isinstance(b, (list, tuple)):
        return len(a) == len(b) and all(__close(x, y, tol) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(__close(a[k], b[k], tol) for k in a)
    return a == b
def __show(x):
    def r(v):
        if isinstance(v, float): return round(v, 6)
        if isinstance(v, (list, tuple)): return [r(t) for t in v]
        return v
    try:
        return json.dumps(r(x))
    except Exception:
        return repr(x)
def __run(lib, code, fn, tests_json):
    ns = {'math': math}
    try:
        exec(lib, ns)
        exec(code, ns)
    except SyntaxError as e:
        return {'error': f'Syntax error on line {e.lineno}: {e.msg}'}
    except Exception as e:
        return {'error': ''.join(traceback.format_exception_only(type(e), e)).strip()}
    f = ns.get(fn)
    if not callable(f):
        return {'error': f'Define a function named {fn}.'}
    res = []
    for t in json.loads(tests_json):
        try:
            got = f(*json.loads(json.dumps(t['args'])))
            res.append({'name': t['name'], 'ok': __close(got, t['expect'], t.get('tol', 1e-6)), 'got': __show(got), 'want': __show(t['expect'])})
        except Exception as e:
            tb = traceback.extract_tb(e.__traceback__)
            line = tb[-1].lineno if tb else '?'
            res.append({'name': t['name'], 'ok': False, 'got': f'{type(e).__name__}: {e} (line {line})', 'want': __show(t['expect'])})
    return {'results': res}
def __call(lib, fn, args_json):
    ns = {'math': math}
    exec(lib, ns)
    return json.dumps(ns[fn](*json.loads(args_json)))
def __map(lib, fn, cases_json):
    ns = {'math': math}
    exec(lib, ns)
    f = ns[fn]
    return json.dumps([f(*a) for a in json.loads(cases_json)])
\`);
postMessage({ ready: true });
onmessage = (e) => {
  const m = e.data;
  out = [];
  try {
    if (m.kind === 'test') {
      const r = py.globals.get('__run')(m.lib, m.code, m.fn, JSON.stringify(m.tests)).toJs({ dict_converter: Object.fromEntries });
      postMessage({ id: m.id, ...r, stdout: out.join('\\n') });
    } else if (m.kind === 'map') {
      const s = py.globals.get('__map')(m.lib, m.fn, JSON.stringify(m.cases));
      postMessage({ id: m.id, value: JSON.parse(s), stdout: out.join('\\n') });
    } else if (m.kind === 'call') {
      const s = py.globals.get('__call')(m.lib, m.fn, JSON.stringify(m.args));
      postMessage({ id: m.id, value: JSON.parse(s), stdout: out.join('\\n') });
    }
  } catch (err) {
    postMessage({ id: m.id, error: String(err.message || err).split('\\n').slice(-3).join('\\n'), stdout: out.join('\\n') });
  }
};
`;

function start(): Promise<void> {
  if (ready) return ready;
  ready = new Promise<void>((resolve, reject) => {
    try {
      const url = URL.createObjectURL(new Blob([WORKER(base)], { type: 'text/javascript' }));
      worker = new Worker(url, { type: 'module' });
    } catch (e) { ready = null; reject(e); return; }
    const t = window.setTimeout(() => { reject(new Error('Python did not start (timed out).')); }, 45000 * SLOW);
    worker.onmessage = (e) => {
      const d = e.data as PyResult & { id?: number; ready?: boolean };
      if (d.ready) { window.clearTimeout(t); resolve(); return; }
      if (d.id !== undefined) { pending.get(d.id)?.(d); pending.delete(d.id); }
    };
    worker.onerror = (e) => { window.clearTimeout(t); ready = null; reject(new Error(e.message || 'Python worker failed')); };
  });
  return ready;
}

/** Start loading Python in the background (call before the player reaches the terminal). */
export function warmPython(): void { void start().catch(() => {}); }

export function pythonState(): 'idle' | 'loading' | 'ready' { return worker ? 'ready' : ready ? 'loading' : 'idle'; }

function kill(): void {
  worker?.terminate();
  worker = null;
  ready = null;
  for (const [, r] of pending) r({ error: 'stopped' });
  pending.clear();
}

async function send(msg: Record<string, unknown>, timeoutMs: number): Promise<PyResult> {
  try { await start(); } catch (e) { return { error: `Python could not start in this browser: ${(e as Error).message}` }; }
  const id = ++seq;
  return new Promise<PyResult>((resolve) => {
    const t = window.setTimeout(() => {
      pending.delete(id);
      kill();
      resolve({ error: `Your code ran for more than ${timeoutMs / 1000} s. Is there a loop that never ends?` });
    }, timeoutMs);
    pending.set(id, (r) => { window.clearTimeout(t); resolve(r); });
    worker!.postMessage({ id, ...msg });
  });
}

/** Automated browsers here run on a starved software GPU and CPU: give Python more time there. */
const SLOW = typeof navigator !== 'undefined' && navigator.webdriver ? 6 : 1;

export function runPythonTests(lib: string, code: string, fn: string, tests: unknown[], timeoutMs = 4000): Promise<PyResult> {
  return send({ kind: 'test', lib, code, fn, tests }, timeoutMs * SLOW);
}

export function callPython(lib: string, fn: string, args: unknown[], timeoutMs = 3000): Promise<PyResult> {
  return send({ kind: 'call', lib, fn, args }, timeoutMs * SLOW);
}

/** Call fn once per argument list, all in one worker message (installs: thousands of points at event time). */
export function mapPython(lib: string, fn: string, cases: unknown[][], timeoutMs = 8000): Promise<PyResult> {
  return send({ kind: 'map', lib, fn, cases }, timeoutMs * SLOW);
}
