// Chapter 4 staging: the Act II opening (the dish hunting the ark's beacon among echoes) and the
// story-out install (the beacon matcher ranks 200 signatures by cosine and locks the Meridian).
import { Vector3 } from 'three';
import type { Game, V3 } from '../../../game/types';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { fadeBlack, letterbox, stamp, titleCard } from '../../../kit/cine';
import { h, inline } from '../../../ui/ui';
import { burst } from '../../../gfx/fx';
import { pylib } from '../../../game/build';
import { rng } from '../../../game/lawcheck';
import { CamRig, DishBeam, Ping, arkSet, type ArkSet } from './ark';
import { ARK_INDEX, ARK_PATTERN, beaconField, crew, rankByCosine } from './logic';
import { S } from './script';

/** Thrown when the player leaves the beat mid-cinematic: stop quietly. */
class Gone extends Error {}
const check = (set: ArkSet) => { if (!set.alive()) throw new Gone(); };

/** The dish sits at the Lantern's nose. */
function dishOf(set: ArkSet, scale: number): Vector3 {
  return set.lantern ? set.lantern.object.localToWorld(new Vector3(2.7 * scale, 0, 0.1 * scale)) : new Vector3();
}

const ARK_AT: V3 = [0, 0, 0];
/** Where the ark's own beacon sits on the hull (the bow, in the ark's frame before orientation). */
const BOW_BEACON: V3 = [27, 0, 6.5];

/** Echo positions around the ark: debris catching the beacon and throwing it back. */
function echoSpots(n: number, seed: number): V3[] {
  const r = rng(seed);
  const out: V3[] = [];
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    out.push([-30 + r() * 70, -18 + Math.cos(a) * (10 + r() * 22), Math.sin(a) * (8 + r() * 14)]);
  }
  return out;
}

// ------------------------------------------------------------------ cold open

export async function coldOpen(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('explore');
    const LS = 1.6;
    const set = await arkSet(g, {
      at: ARK_AT, spine: [1, 0.12, 0], shear: 0.16, debris: 16, starLight: 2.2, starDir: [0.46, 0.89, 0.2],
      lantern: { at: [-34, -40, -2.5], face: [0.78, 0.6, 0.1], scale: LS, thrust: 0.2 },
    });
    check(set);
    const beacon = set.ark.localToWorld(new Vector3(...BOW_BEACON));
    const spots = echoSpots(11, 404);
    const pings = spots.map((p, i) => new Ping(set, p, { size: 0.5, period: 2.4 + (i % 4) * 0.35, phase: i * 0.37 }));
    const arkPing = new Ping(set, [beacon.x, beacon.y, beacon.z], { size: 0.4, period: 3.1, phase: 1.2 });
    arkPing.setLevel(0.45);
    const all = [...pings, arkPing];
    const beam = new DishBeam(set);
    const cam = new CamRig(g, set, [-84, -66, 2], [-8, 0, 0]);
    cam.drift(0.5);
    void fadeBlack(g, false, 1800);
    await letterbox(g, true, 700);
    check(set);
    void titleCard(g, 'Act II', 'Signal', 3600);
    void stamp(g, 'Outside the colony ark *Meridian* · the star low on the horizon', 4200);
    await cam.to([-72, -54, 1], [0, 0, 0], 6500, ease.inOut);
    check(set);
    // the dish wakes and sweeps the echoes, one per line
    const from = () => dishOf(set, LS);
    beam.aim(from(), spots[0], 0.035);
    beam.setOpacity(0);
    await animate(600, (k) => beam.setOpacity(0.07 * k), ease.out);
    const visit = async (i: number, loud = false) => {
      const target = all[i];
      await beam.sweep(new Vector3(...target.pos), 900, 0.035);
      target.setLevel(1); target.ring(); if (loud) { target.ring(); sfx.snap(); } else sfx.tick(i % 5);
    };
    const order = [2, 5, 7, 1, 9, 3, 11, 8];
    let vi = 0;
    void cam.to([-66, -40, 5], [4, 2, 0], 26000, ease.linear);
    await g.say(S.open, {
      onLine: (_l, i) => {
        if (!set.alive()) return;
        const n = i === 2 ? 3 : 1;
        void (async () => { for (let k = 0; k < n && vi < order.length; k++) await visit(order[vi++], i === 2 && k === 2); })();
      },
    });
    check(set);
    await beam.sweep(new Vector3(...arkPing.pos), 1100, 0.03);
    arkPing.ring();
    await titleCard(g, 'Chapter 4', 'How much do two arrows point the same way?', 3000);
    check(set);
    await letterbox(g, false, 500);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

// ------------------------------------------------------------------ install: the beacon matcher

/**
 * The ranking, from one batched Python call of `dot` over every signature (the player's when it is
 * theirs, else the reference), checked against LANTERN's TypeScript version. Any disagreement, error or
 * no answer within 20 s, and the matcher runs on LANTERN's backup. The world never waits longer.
 */
async function rankWithLibrary(): Promise<{ mine: boolean; ranked: ReturnType<typeof rankByCosine> }> {
  const sigs = beaconField();
  const crewRank = rankByCosine(ARK_PATTERN, sigs, crew.dot);
  try {
    const cases: number[][][] = [[ARK_PATTERN, ARK_PATTERN], ...sigs.flatMap((s) => [[ARK_PATTERN, s.sig], [s.sig, s.sig]])];
    const r = await Promise.race([pylib.map<number>('dot', cases), new Promise<null>((res) => window.setTimeout(() => res(null), 20000))]);
    if (!r || r.values.length !== cases.length) return { mine: false, ranked: crewRank };
    const v = r.values;
    const agree = v.every((x, i) => Math.abs(x - crew.dot(cases[i][0], cases[i][1])) < 1e-6 * (1 + Math.abs(x)));
    if (!agree) return { mine: false, ranked: crewRank };
    const pl = Math.sqrt(v[0]);
    const ranked = sigs.map((_, i) => ({ i, raw: v[1 + 2 * i], cos: v[1 + 2 * i] / (pl * Math.sqrt(v[2 + 2 * i])) })).sort((a, b) => b.cos - a.cos);
    return { mine: r.who === 'yours', ranked };
  } catch { return { mine: false, ranked: crewRank }; }
}

export async function install(g: Game): Promise<void> {
  try {
    g.stage.clearWorld();
    g.mood('explore');
    const LS = 1.6;
    const set = await arkSet(g, {
      at: ARK_AT, spine: [1, 0.12, 0], shear: 0.16, debris: 10, starLight: 2.6,
      lantern: { at: [-44, -40, 6], face: [0.7, 0.7, 0.05], scale: LS, thrust: 0.2 },
    });
    check(set);
    const cam = new CamRig(g, set, [-80, -62, 20], [-12, -10, 0]);
    cam.drift(0.35);
    await letterbox(g, true, 500);
    // 200 signatures in the sky around the ark
    const sigs = beaconField();
    const r = rng(2002);
    const beaconPos = set.ark.localToWorld(new Vector3(...BOW_BEACON));
    const pts: V3[] = sigs.map((s) => (s.ark ? [beaconPos.x, beaconPos.y, beaconPos.z] as V3
      : [-45 + r() * 95, -38 + r() * 64, -16 + r() * 34] as V3));
    const pings = pts.map((p, i) => new Ping(set, p, { size: i === ARK_INDEX ? 0.45 : 0.3, period: 7 + (i % 9) * 1.3, phase: (i * 0.61) % 7 }));
    pings.forEach((p, i) => p.setLevel(0.35 + 0.5 * Math.min(1, Math.sqrt(sigs[i].sig.reduce((s, x) => s + x * x, 0)) / 30)));
    const panel = h('div', { class: 'glass', style: 'position:absolute;right:24px;top:24px;width:min(340px,36vw);padding:14px 16px;display:flex;flex-direction:column;gap:6px;pointer-events:none' });
    const head = h('div', { class: 'kicker' }, 'Beacon matcher');
    const runOn = h('div', { style: 'font-size:13px;color:var(--ink-2)' }, 'Ranking…');
    const list = h('div', { style: 'display:flex;flex-direction:column;gap:5px;margin-top:4px' });
    panel.append(head, runOn, list);
    g.ui.scene.appendChild(panel);
    const job = rankWithLibrary();
    await g.say(S.install);
    check(set);
    const { mine, ranked } = await job;
    check(set);
    runOn.innerHTML = inline(mine ? 'Running on: **your** `dot`' : 'Running on: LANTERN backup');
    const said = g.say(mine ? S.installMine : S.installBackup);
    // score the sky: each signature dims to its cosine; the list fills from the top
    const rank = new Map(ranked.map((x, k) => [x.i, k]));
    const rows = ranked.slice(0, 5);
    await animate(3600, (k) => {
      const upto = Math.floor(k * sigs.length);
      for (let i = 0; i < sigs.length; i++) {
        if (i > upto) continue;
        const c = ranked[rank.get(i)!].cos;
        pings[i].setLevel(Math.max(0.03, ((c - 0.15) / 0.85) ** 6));
      }
      runOn.textContent = `Ranked ${Math.min(sigs.length, upto + 1)} of ${sigs.length}`;
    }, ease.linear);
    check(set);
    runOn.innerHTML = inline(mine ? `Ranked ${sigs.length} of ${sigs.length} · your \`dot\`` : `Ranked ${sigs.length} of ${sigs.length} · LANTERN backup`);
    for (const [k, x] of rows.entries()) {
      const bar = h('div', { style: `height:6px;border-radius:3px;background:${k === 0 ? '#59e1ff' : 'rgba(232,241,255,0.35)'};width:${Math.max(4, x.cos * 100)}%` });
      list.append(h('div', { style: 'display:grid;grid-template-columns:20px 1fr 48px;gap:8px;align-items:center;font-size:13px' },
        h('span', { class: 'c-muted' }, String(k + 1)), bar, h('span', { style: `font-family:var(--mono);color:${k === 0 ? '#59e1ff' : 'var(--ink-2)'}` }, x.cos.toFixed(2))));
      sfx.tick(k);
      await wait(180);
    }
    // lock
    const top = pings[ranked[0].i];
    top.setColor('#59e1ff'); top.setLevel(1); top.ring(); top.ring();
    const beam = new DishBeam(set);
    beam.aim(dishOf(set, LS), new Vector3(...top.pos), 0.03);
    beam.setOpacity(0);
    await Promise.all([animate(700, (k) => beam.setOpacity(0.2 * k), ease.out), cam.to([-30, -46, 10], [beaconPos.x, beaconPos.y, beaconPos.z], 2600, ease.inOut)]);
    check(set);
    sfx.success();
    g.stage.flash(0.12, 400);
    void burst(g.stage, top.pos, '#59e1ff', 90, 6, false);
    for (let i = 0; i < pings.length; i++) if (i !== ranked[0].i) pings[i].setLevel(0.03);
    void cam.to([-22, -30, 9], [beaconPos.x - 4, beaconPos.y, beaconPos.z - 2], 16000, ease.linear);
    await said; // the install line finishes before the next one opens
    await g.say(S.lock);
    check(set);
    panel.remove();
    await letterbox(g, false, 500);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}
