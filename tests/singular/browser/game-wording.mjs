// Wording check for the game (BUILD_BRIEF.md §2a): every string the player reads, from the
// running game's chapter data. Needs the dev server on :5173.   node tests/singular/browser/game-wording.mjs [chapterId …]
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
const only = process.argv.slice(2);
const inScope = (where) => !only.length || only.some((o) => where.startsWith(o));
const RULES = [
  ['banned word', /\b(simply|just|obviously|clearly|trivially|trivial(?! (solution|combination)))\b/gi],
  ['banned phrase', /\b(it'?s easy to see|easy to see|recall that|note that|it turns out|as you know)\b/gi],
  ['filler opening', /\b(in this (lesson|chapter|level) we'?ll|we'?ll explore|fascinating world|let'?s dive|dive into|deep dive)\b/gi],
  ['hype', /\b(amazing|incredible|magic|magical|awesome|mind-?blowing|revolutionary|super ?powerful)\b/gi],
  ['analogy: fruit', /\b(fruit|fruits|apples?|pears?|bananas?|grapes?|lemons?|cherr(y|ies))\b/gi],
  ['analogy: shopping/cooking', /\b(shopping|recipes?|cooking|chef|kitchen|ingredients?|bake|baking)\b/gi],
  ['analogy: factory/machine', /\b(factory|factories|eats?|eating|spits?( out)?|digests?|machine that)\b/gi],
  ['analogy: sport', /\b(sports?|football|soccer|basketball|tennis|cricket|goalkeeper)\b/gi],
  ['personification of maths', /\b(matrix|matrices|vectors?|eigenvectors?|transformation|determinant|grid|arrows?|components?|directions?|projections?|law|formula|equation|area|volume)\s+(?:(?:does|do)(?: not|n’t|n't)\s+)?(wants?|likes?|loves?|hates?|feels?|thinks?|knows?|know|cares?|care|prefers?|tries|is happy|decides?|remembers?)\b/gi],
  ['favourite direction', /\bfavou?rite (direction|vector|axis|axes)\b/gi],
  ['matrix as machine', /\bmatri(x|ces) (is|as|are) an? (machine|device|engine|function box)\b/gi],
  ['synonym drift', /\b(kernel|linear map|linear operator)\b/gi],
  ['exclamation', /[A-Za-z0-9)\]'"]![ \n"')]|[A-Za-z0-9)\]'"]!$/gm],
];
const allowFile = new URL('../scripts/game-wording-allow.json', import.meta.url);
const allow = existsSync(allowFile) ? JSON.parse(readFileSync(allowFile, 'utf8')) : [];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
await p.goto('http://localhost:5173/singular/index.html?test', { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
const texts = await p.evaluate(() => window.__game.texts());
await b.close();
const hits = [];
for (const { where, text } of texts) {
  if (!inScope(where)) continue;
  // ignore maths and code spans
  const prose = text.replace(/\$[^$]*\$/g, ' ').replace(/`[^`]*`/g, ' ');
  for (const [rule, re] of RULES) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(prose))) {
      const ctx = prose.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40).replace(/\s+/g, ' ');
      if (allow.some((a) => (!a.where || where.includes(a.where)) && ctx.toLowerCase().includes(a.text.toLowerCase()))) continue;
      hits.push({ where, rule, match: m[0], ctx });
    }
  }
}
// Teaching rule 4: no term before the beat that names it.
const terms = texts.filter((t) => t.term);
const termAllow = existsSync(new URL('../scripts/game-term-allow.json', import.meta.url))
  ? JSON.parse(readFileSync(new URL('../scripts/game-term-allow.json', import.meta.url), 'utf8')) : [];
for (const t of terms) {
  const word = t.term.replace(/\$[^$]*\$/g, '').trim().toLowerCase();
  if (word.length < 3) continue;
  const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b`, 'i');
  for (const x of texts) {
    if (x.term || x.order >= t.order) continue;
    if (!inScope(x.where)) continue;
    const prose = x.text.replace(/\$[^$]*\$/g, ' ');
    const m = prose.match(re);
    if (m && !termAllow.some((a) => a.term.toLowerCase() === word && (!a.where || x.where.includes(a.where)))) {
      hits.push({ where: x.where, rule: `term before earned (${t.where})`, match: m[0], ctx: prose.slice(Math.max(0, m.index - 40), m.index + 60) });
    }
  }
}
for (const h of hits) console.log(`${h.where}  [${h.rule}] "${h.match}"  …${h.ctx}…`);
console.log(`${texts.filter((t) => inScope(t.where)).length} strings checked${only.length ? ` in ${only.join(', ')}` : ''}, ${hits.length} hits`);
process.exit(hits.length ? 1 : 0);
