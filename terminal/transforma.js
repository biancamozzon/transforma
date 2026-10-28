#!/usr/bin/env node
/* TRANS-FORMA · © Bianca Mozzon (Blanca Mozzon) · herramienta de terminal.
   Corre el mismo motor que las páginas (extraído tal cual de cada una) y guarda volumen, lámina plana y métricas.
   Uso:  node transforma.js figuras
         node transforma.js calcular <figura | archivo.json> [opciones]
         node transforma.js verificar
   Ayuda: node transforma.js ayuda */
'use strict';
const fs = require('fs'), path = require('path');
const LIB = path.join(__dirname, 'lib');
const G = require(path.join(LIB, 'tf-geom.js'));

const AYUDA = `TRANS-FORMA · terminal · © Bianca Mozzon (Blanca Mozzon)

  figuras                         lista las figuras de Cierres que se pueden calcular por nombre
  calcular <figura|archivo.json>  calcula el cierre y guarda los archivos
  verificar                       corre la S de control y la compara con la referencia (0,78 % · 0,0005 h)

Figura: un nombre de la lista (S, T, K, R, D, G, a30a, b31a, d40b…) o un .json exportado
desde Curva libre o Uniones («Exportar curva»).

Opciones de calcular:
  --salida <carpeta>      dónde guardar (por defecto ./salida_<figura>)
  --div <n>               malla, divisiones por mitad (24–64; por defecto 52)
  --fotogramas <n>        pasos de la transición (por defecto 48; la gota 56)
  --rigidez <x>           rigidez a flexión (por defecto la de cada figura)
  --material cartulina|goma
  --espesor-lamina <x>    espesor en módulos (pesa en la goma; por defecto 0,01)
  --invertir              saca el volumen hacia el otro lado
  --altura a,b            altura de A y B en módulos (como «Altura de A y B»)
  --inicio <u>            dónde arranca A, en fracción del perímetro (figuras A, B, C, D, riñón, triángulo)
  --inicio-caladura <u>   A de la caladura (figuras B y D)
  --identica              Clase D: lámina 2 idéntica (por defecto espejo)
  --union <0–100>         Clase D: % de unión perimetral (por defecto 100)
  --transicion <0–1>      estado que se exporta (por defecto 1 = cerrado)
  --mm <x>                milímetros por módulo (por defecto 10)
  --espesor <mm>          espesor de los STL en mm (por defecto 1)
  --solo-metricas         no escribe archivos de malla
`;

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const nx = argv[i + 1]; if (nx === undefined || nx.startsWith('--')) o[k] = true; else { o[k] = nx; i++; } }
    else o._.push(a);
  }
  return o;
}
const num = (v, d) => v === undefined || v === true ? d : (Number.isFinite(+String(v).replace(',', '.')) ? +String(v).replace(',', '.') : d);

/* ── Cierres: reproduce compute() de la página para cada figura (sin doble línea ni varios inicios) ── */
function cierresJob(key, o) {
  const core = require(path.join(LIB, 'cierres', 'core.js')), Fg = require(path.join(LIB, 'cierres', 'figuras.js'));
  const BENDS = { S: 0.1, T: 0.005, K: 0.1, R: 0.1, G: 0.47, D: 0.1 }, PRESET = { G: { frames: 56, lift: [0.8, -0.55] } };
  const div = Math.round(num(o.div, 52)), u = num(o.inicio, null), uh = num(o['inicio-caladura'], 0);
  const mirror = !o.identica, elp = num(o.union, 100) / 100;
  let input, closed = false, poly3 = false, centers = null, ringHole = null, dualOpt = null, outerZip = false, name;
  const FX = Fg.FIGX[key], FC = Fg.FIGC[key], cls = Fg.figCls(key);
  if (key === 'S') { name = 'Cierre de la S'; input = core.resampleOpen(core.catmullRom(Fg.DEFAULT, 24), div).pts;
    if (!core.isSimple(core.outlineFromHalf(input))) throw new Error('El contorno se cruza consigo mismo.'); }
  else if (key === 'D') { name = 'Clase D · dos anillos'; const rp = Fg.ringParts(Math.max(40, Math.round(div * 0.75))); input = rp.outer; closed = true; dualOpt = { hole: rp.hole, mirror, h: 0, elp }; }
  else if (key === 'R') { name = 'Sutura del anillo con S'; const rp = Fg.ringParts(div + 24); input = rp.outer; closed = true; ringHole = rp.hole; }
  else if (FC) { name = 'Sutura · ' + FC.name; const gp = Fg.figParts(key, div + 24, u || 0); input = gp.outer; closed = true; ringHole = gp.hole; }
  else if (cls === 'A') { name = 'Cierre · ' + FX.name; input = Fg.figA(key, 2 * div, u || 0); closed = true; }
  else if (cls === 'B') { name = 'Sutura y unión · ' + FX.name; const gp = Fg.figB(key, div + 24, u || 0, uh); input = gp.outer; closed = true; ringHole = gp.hole; outerZip = true; }
  else if (cls === 'D') { name = 'Clase D · ' + FX.name; const gp = Fg.figD(key, div + 24, uh); input = gp.outer; closed = true; dualOpt = { hole: gp.hole, mirror, h: 0, elp }; }
  else if (key === 'K') { name = 'Cierre del riñón'; const KP = core.pathCum(Fg.KPATH), P = KP[KP.length - 1], w = x => ((x % 1) + 1) % 1;
    input = core.boundaryFromA(Fg.KPATH, w(u === null ? Fg.K_U0 : u) * P, 2 * div); closed = true; }
  else if (key === 'T') { name = 'Cierre del triángulo (tres cierres desde las medianas)';
    const c = [[-1.5, -1.299], [1.5, -1.299], [0, 1.299]];
    if (u === null) { input = core.polygonFromA(c, 0, 0.5, 2 * div, true); poly3 = true; centers = Fg.triCenters(c); }
    else { name = 'Cierre del triángulo (A ⟷ B)'; const { e, t } = Fg.uToEdge(c, u); input = core.polygonFromA(c, e, t, 2 * div); poly3 = Fg.conePoints(c, u).length >= 4; }
    closed = true; }
  else throw new Error('No conozco la figura «' + key + '». Probá: node transforma.js figuras');
  const mat = o.material === 'goma' ? 'rubber' : 'rigid', thick = num(o['espesor-lamina'], 0.01);
  const pre = PRESET[key] || {}, bend = num(o.rigidez, BENDS[key] !== undefined ? BENDS[key] : 0.1);
  const lift = o.altura ? String(o.altura).split(',').map(Number) : pre.lift && !o['sin-altura'] ? pre.lift : null;
  const opt = Object.assign({ closed, bend: bend * (mat === 'rubber' ? Math.pow(thick / 0.03, 2) : 1), flip: !!o.invertir, frames: Math.round(num(o.fotogramas, pre.frames || 48)), iters: 80 },
    lift ? { lift: dualOpt ? [lift[0], lift[1], lift[0], lift[1]] : lift.slice(0, 2), liftRamp: true } : {}, mat === 'rubber' ? { stretchW: 0.08 } : {}, ringHole ? { hole: ringHole } : {}, outerZip ? { outerZip: true } : {},
    dualOpt ? { dual: dualOpt, iters: 50 } : {}, poly3 ? { hull: 1, iters: 60, hullEvery: 12, settle: 40 } : {}, centers ? { centers } : {});
  return { tool: 'Cierres v2', name, simulate: core.simulate, input, opt, centers };
}

/* ── Curva libre / Uniones: el .json exportado pasa por la misma preparación que la página ── */
function jsonJob(file, o) {
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const un = /Uniones/.test(d.app || '') || !!d.joins, dir = path.join(LIB, un ? 'uniones' : 'curva');
  const core = require(path.join(dir, 'core_curva.js')), Pr = require(path.join(dir, 'prep.js'));
  const op = ['A', 'B', 'C', 'D', 'E'].includes(d.op) ? d.op : 'A', usesHole = op !== 'A' && op !== 'E', p = d.params || {};
  const reg = d.reg || {};
  const mat = o.material ? (o.material === 'goma' ? 'rubber' : 'rigid') : (d.mat === 'rubber' ? 'rubber' : 'rigid');
  const prep = Pr.prepare({ op, outer: d.outer, hole: usesHole ? d.hole : null, own2: !!d.own2, outer2: d.outer2 || null, uA2: d.uA2 || 0, reg2: reg.outer2 || null,
    uA: d.uA || 0, uAh: d.uAh || 0, extP: d.extP == null ? 1 : d.extP, extH: d.extH == null ? 1 : d.extH, mirror: d.mirror !== false, regO: reg.outer || null, regH: reg.hole || null,
    div: Math.round(num(o.div, p.div || 52)), bend: num(o.rigidez, p.bend || 0.1), frames: Math.round(num(o.fotogramas, p.frames || 48)), flip: o.invertir ? true : !!d.flip, mat,
    thick: num(o['espesor-lamina'], p.thick || 0.01), lift: o.altura ? String(o.altura).split(',').map(Number) : null, liftRamp: true });
  if (un && d.joins) {          // misma traducción que joinSpec() de Uniones
    const used = T => T === 'P' ? op !== 'B' : ['B', 'C', 'D'].includes(op), out = {}; let any = false;
    for (const T of ['P', 'H']) { const j = d.joins[T]; if (!j || !used(T) || j.type === 'zip') continue; any = true;
      out[T] = j.type === 'pts' ? { trace: 'pts', meet: 'tope', pitch: j.pitch, dia: j.dia } : j.type === 'cord' ? { meet: 'cord', pitch: j.pitch, gap: j.gap, inset: j.inset }
        : j.type === 'lap' ? { trace: 'cont', meet: 'lap', lapW: j.lapW, lapFix: j.fix } : { trace: 'pts', meet: 'lap', pitch: j.pitch, dia: j.dia, lapW: j.lapW, lapFix: j.fix }; }
    if (any) prep.opt.joins = out;
  }
  return { tool: un ? 'Uniones' : 'Curva libre', name: 'operación ' + op + ' · ' + path.basename(file, '.json'), simulate: core.simulate, input: prep.input, opt: prep.opt };
}

function marksOf(r, job) {
  if (r.marksM && r.marksM.length) return r.marksM;
  if (r.liftPts && r.liftPts.length) return r.liftPts;
  let iB = 0; r.s.forEach((v, k) => { if (Math.abs(v - r.P / 2) < Math.abs(r.s[iB] - r.P / 2)) iB = k; });
  const off = r.hole ? r.hole.off : 0, idx = k => r.hole && r.hole.idx ? r.hole.idx[k] : off + k;
  if (job.centers) return job.centers.map(c => { let b = 0; r.s.forEach((v, k) => { if (Math.abs(v - c.s0) < Math.abs(r.s[b] - c.s0)) b = k; }); return idx(b); });
  return [idx(0), idx(iB)];
}

function run(job, o, quiet) {
  const t0 = Date.now(); let lastPct = -1;
  const r = job.simulate(job.input, job.opt, (f, n) => { const p = Math.round(100 * f / n); if (!quiet && p >= lastPct + 10) { lastPct = p; process.stderr.write(`\r  cerrando A → B · ${p} %   `); } });
  if (!quiet) process.stderr.write('\r' + ' '.repeat(40) + '\r');
  const ms = Date.now() - t0, nV = r.V.length, m = r.metrics;
  const res = { herramienta: job.tool, figura: job.name, perimetro_modulos: r.P, vertices: nV, triangulos: r.F.length,
    estiramiento_medio: m.mean, estiramiento_p95: m.p95, estiramiento_pico: m.max, hueco_h: m.gap, tiempo_s: ms / 1000, opciones: job.opt.closed !== undefined ? Object.fromEntries(Object.entries(job.opt).filter(([k]) => ['bend', 'frames', 'flip', 'lift', 'stretchW', 'iters'].includes(k))) : {} };
  return { r, res };
}

function save(job, r, res, o) {
  const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48);
  const out = path.resolve(o.salida && o.salida !== true ? o.salida : 'salida_' + slug(job.name));
  fs.mkdirSync(out, { recursive: true });
  const base = slug(job.tool) + '_' + slug(job.name), nV = r.V.length, ids = marksOf(r, job), comps = G.components(r.F, nV).n;
  const names = ids.length === 2 ? ['A', 'B'] : ids.length === 4 && comps === 2 ? ['A', 'B', 'A2', 'B2'] : ids.map((_, k) => String.fromCharCode(65 + k));
  const R = { seq: r.seq, F: r.F, nV, V0: Float64Array.from(r.V.flatMap(p => [p[0], p[1]])), marks: ids.map((i, k) => ({ i, name: names[k] })) };
  const eo = { u: num(o.transicion, 1), mm: num(o.mm, 10), tMM: num(o.espesor, 1), base, title: job.tool + ' · ' + job.name };
  const files = o['solo-metricas'] ? [] : [...G.volumeFiles(R, eo), ...G.flatFiles(R, eo)];
  files.push({ name: base + '_datos.json', data: JSON.stringify(Object.assign({ app: 'TRANS-FORMA', autora: 'Bianca Mozzon (Blanca Mozzon)', fecha: new Date().toISOString(), transicion: eo.u, mm_por_modulo: eo.mm, espesor_mm: eo.tMM }, res), null, 1) });
  for (const f of files) fs.writeFileSync(path.join(out, f.name), f.data);
  return { out, files: files.map(f => f.name) };
}

const pct = v => (100 * v).toFixed(2) + ' %';
function report(res) {
  console.log(`  ${res.herramienta} · ${res.figura}`);
  console.log(`  perímetro ${res.perimetro_modulos.toFixed(3)} mód. · ${res.vertices} vértices · ${res.triangulos} triángulos`);
  console.log(`  estiramiento medio ${pct(res.estiramiento_medio)} · p95 ${pct(res.estiramiento_p95)} · pico ${(100 * res.estiramiento_pico).toFixed(1)} %`);
  console.log(`  hueco del cierre ${res.hueco_h.toFixed(4)} h · tiempo ${res.tiempo_s.toFixed(1)} s`);
}

function main() {
  const o = args(process.argv.slice(2)), cmd = o._[0];
  if (!cmd || cmd === 'ayuda' || o.help || o.ayuda) { console.log(AYUDA); return; }
  if (cmd === 'figuras') {
    const Fg = require(path.join(LIB, 'cierres', 'figuras.js'));
    console.log('Cierres v2 · figuras por nombre\n');
    console.log('  S      S de dos medias gotas (figura de control)\n  T      triángulo (tres cierres desde las medianas; con --inicio, un cierre A ⟷ B)\n  K      riñón (pág. 29)\n  R      anillo con S (sutura)\n  D      Clase D · dos anillos');
    for (const [k, F] of Object.entries(Fg.FIGX)) console.log(`  ${k.padEnd(6)} Clase ${Fg.figCls(k)} · ${F.name} (${F.pag})`);
    for (const [k, F] of Object.entries(Fg.FIGC)) console.log(`  ${k.padEnd(6)} Clase C · ${F.name} (${F.pag})`);
    console.log('\nTambién: cualquier .json exportado desde Curva libre o Uniones.');
    return;
  }
  if (cmd === 'verificar') {
    const job = cierresJob('S', {}), { res } = run(job, {});
    report(res);
    const ref = { mean: 0.0078, p95: 0.0238, max: 0.234, gap: 0.0005, nV: 863 };
    const ok = Math.abs(res.estiramiento_medio - ref.mean) < 5e-5 && Math.abs(res.estiramiento_p95 - ref.p95) < 5e-5 && Math.abs(res.estiramiento_pico - ref.max) < 5e-4 && Math.abs(res.hueco_h - ref.gap) < 5e-5 && res.vertices === ref.nV;
    console.log(ok ? '\n  OK · la S de control da lo mismo que en los artefactos (0,78 % · 2,38 % · 23,4 % · 0,0005 h · 863 vértices)' : '\n  DISTINTO de la referencia: revisar el motor');
    process.exitCode = ok ? 0 : 1; return;
  }
  if (cmd === 'calcular') {
    const fig = o._[1]; if (!fig) { console.log(AYUDA); process.exitCode = 1; return; }
    const job = /\.json$/i.test(fig) ? jsonJob(fig, o) : cierresJob(fig, o);
    const { r, res } = run(job, o); report(res);
    const s = save(job, r, res, o);
    console.log(`\n  guardado en ${s.out}`); for (const f of s.files) console.log('   · ' + f);
    return;
  }
  console.log('No conozco el comando «' + cmd + '».\n'); console.log(AYUDA); process.exitCode = 1;
}
try { main(); } catch (e) { console.error('Error: ' + e.message); process.exitCode = 1; }
