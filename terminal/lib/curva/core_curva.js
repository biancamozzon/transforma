/* TRANS-FORMA · © Bianca Mozzon (Blanca Mozzon) · motor del cierre */
/* TRANS-FORMA · motor del cierre (JS puro, corre en Web Worker y en node).
   Regla: c(s) ≡ c(P − s), s∈[0,P/2], desde A (s=0) hasta B (s=P/2).
   Solver: Projective Dynamics cuasi-estático + flexión por Laplaciano cotangente.
   Sistema lineal: Cholesky de envolvente con orden RCM, refactorizado por fotograma. */

function catmullRom(pts, perSeg) {           // centrípeta, abierta, extremos por reflexión
  const P = pts.slice();
  const ext = (a, b) => [2 * a[0] - b[0], 2 * a[1] - b[1]];
  const Q = [ext(P[0], P[1]), ...P, ext(P[P.length - 1], P[P.length - 2])];
  const out = [];
  const d = (a, b) => Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]), 0.5) || 1e-6;
  for (let i = 1; i < Q.length - 2; i++) {
    const p0 = Q[i - 1], p1 = Q[i], p2 = Q[i + 1], p3 = Q[i + 2];
    const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
    for (let k = 0; k < perSeg; k++) {
      const t = t1 + (t2 - t1) * k / perSeg;
      const L = (a, b, ta, tb) => [((tb - t) * a[0] + (t - ta) * b[0]) / (tb - ta), ((tb - t) * a[1] + (t - ta) * b[1]) / (tb - ta)];
      const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
      const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
      out.push(L(B1, B2, t1, t2));
    }
  }
  out.push(P[P.length - 1].slice());
  return out;
}

function resampleOpen(poly, n) {            // n tramos de igual longitud → n+1 puntos
  const cum = [0];
  for (let i = 1; i < poly.length; i++) cum.push(cum[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
  const L = cum[cum.length - 1], out = [];
  let j = 0;
  for (let k = 0; k <= n; k++) {
    const t = L * k / n;
    while (j < cum.length - 2 && cum[j + 1] < t) j++;
    const w = (t - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
    out.push([poly[j][0] + w * (poly[j + 1][0] - poly[j][0]), poly[j][1] + w * (poly[j + 1][1] - poly[j][1])]);
  }
  return { pts: out, length: L };
}

function outlineFromHalf(half) {            // reflexión especular invertida = rotación 180° sobre el punto medio de AB
  const A = half[0], B = half[half.length - 1];
  const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  const other = half.map(p => [2 * M[0] - p[0], 2 * M[1] - p[1]]);
  return half.concat(other.slice(1, -1));
}

function segInter(a, b, c, d) {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d);
  const e = 1e-12;                              // colineales en la misma arista: no cuentan como cruce
  return d1 * d2 < -e && d3 * d4 < -e;
}
function isSimple(poly) {
  const n = poly.length;
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    if (segInter(poly[i], poly[(i + 1) % n], poly[j], poly[(j + 1) % n])) return false;
  }
  return true;
}

function inside(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
function distPoly(p, poly) {
  let m = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const abx = b[0] - a[0], aby = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / (abx * abx + aby * aby)));
    m = Math.min(m, Math.hypot(p[0] - a[0] - t * abx, p[1] - a[1] - t * aby));
  }
  return m;
}

function delaunay(P) {                        // Bowyer–Watson
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const p of P) { minx = Math.min(minx, p[0]); miny = Math.min(miny, p[1]); maxx = Math.max(maxx, p[0]); maxy = Math.max(maxy, p[1]); }
  const dm = Math.max(maxx - minx, maxy - miny) * 20, cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
  const pts = P.concat([[cx - dm, cy - dm], [cx + dm, cy - dm], [cx, cy + dm]]);
  const n = P.length;
  const circ = (a, b, c) => {
    const A = pts[a], B = pts[b], C = pts[c];
    const d = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
    const ux = ((A[0] ** 2 + A[1] ** 2) * (B[1] - C[1]) + (B[0] ** 2 + B[1] ** 2) * (C[1] - A[1]) + (C[0] ** 2 + C[1] ** 2) * (A[1] - B[1])) / d;
    const uy = ((A[0] ** 2 + A[1] ** 2) * (C[0] - B[0]) + (B[0] ** 2 + B[1] ** 2) * (A[0] - C[0]) + (C[0] ** 2 + C[1] ** 2) * (B[0] - A[0])) / d;
    return [ux, uy, (A[0] - ux) ** 2 + (A[1] - uy) ** 2];
  };
  let tris = [[n, n + 1, n + 2, ...circ(n, n + 1, n + 2)]];
  for (let i = 0; i < n; i++) {
    const p = pts[i], bad = [], keep = [];
    for (const t of tris) ((p[0] - t[3]) ** 2 + (p[1] - t[4]) ** 2 < t[5] * (1 - 1e-12) ? bad : keep).push(t);
    const ec = new Map();
    for (const t of bad) for (let k = 0; k < 3; k++) {
      const a = t[k], b = t[(k + 1) % 3], key = a < b ? a + ',' + b : b + ',' + a;
      ec.set(key, ec.has(key) ? null : [a, b]);
    }
    for (const e of ec.values()) if (e) keep.push([e[0], e[1], i, ...circ(e[0], e[1], i)]);
    tris = keep;
  }
  return tris.filter(t => t[0] < n && t[1] < n && t[2] < n).map(t => [t[0], t[1], t[2]]);
}

function edgesMap(F) {
  const m = new Map();
  for (const f of F) for (let k = 0; k < 3; k++) {
    const a = f[k], b = f[(k + 1) % 3], c = f[(k + 2) % 3], key = a < b ? a * 1e6 + b : b * 1e6 + a;
    if (!m.has(key)) m.set(key, { a: Math.min(a, b), b: Math.max(a, b), opp: [] });
    m.get(key).opp.push(c);
  }
  return m;
}

function meshPlanar(poly, h) {
  let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (const p of poly) { lo = [Math.min(lo[0], p[0]), Math.min(lo[1], p[1])]; hi = [Math.max(hi[0], p[0]), Math.max(hi[1], p[1])]; }
  for (const clear of [0.6, 0.72, 0.85]) {
    const pts = poly.map(p => p.slice()), dy = h * Math.sqrt(3) / 2;
    let r = 0;
    for (let y = lo[1]; y <= hi[1] + dy; y += dy, r++)
      for (let x = lo[0] + (r % 2 ? h / 2 : 0); x <= hi[0] + h; x += h) {
        const p = [x, y];
        if (inside(p, poly) && distPoly(p, poly) > clear * h) pts.push(p);
      }
    let F = delaunay(pts).filter(t => inside([(pts[t[0]][0] + pts[t[1]][0] + pts[t[2]][0]) / 3, (pts[t[0]][1] + pts[t[1]][1] + pts[t[2]][1]) / 3], poly));
    F = F.map(t => {
      const a = pts[t[0]], b = pts[t[1]], c = pts[t[2]];
      return ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) < 0 ? [t[0], t[2], t[1]] : t;
    });
    // control de borde: cada lado consecutivo del polígono tiene que ser arista de borde
    const em = edgesMap(F), nb = poly.length;
    let ok = true;
    for (let i = 0; i < nb && ok; i++) {
      const a = i, b = (i + 1) % nb, key = Math.min(a, b) * 1e6 + Math.max(a, b);
      if (!em.has(key) || em.get(key).opp.length !== 1) ok = false;
    }
    let naked = 0; for (const e of em.values()) if (e.opp.length === 1) naked++;
    if (ok && naked === nb) return { V: pts.map(p => [p[0], p[1], 0]), F, nb };
  }
  throw new Error('No pude mallar el contorno. Probá otra densidad de malla o suavizá la curva.');
}

/* Lámina con caladura (ELI): contorno exterior libre + contorno interior. Nodos: exterior, después interior, después grilla. */
function meshPlanarHole(outer, hole, h, solid) {
  let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (const p of outer) { lo = [Math.min(lo[0], p[0]), Math.min(lo[1], p[1])]; hi = [Math.max(hi[0], p[0]), Math.max(hi[1], p[1])]; }
  const no = outer.length, nh = hole.length;
  for (const clear of [0.6, 0.72, 0.85]) {
    const pts = outer.map(p => p.slice()).concat(hole.map(p => p.slice())), dy = h * Math.sqrt(3) / 2;
    let r = 0;
    for (let y = lo[1]; y <= hi[1] + dy; y += dy, r++)
      for (let x = lo[0] + (r % 2 ? h / 2 : 0); x <= hi[0] + h; x += h) {
        const p = [x, y];
        if (inside(p, outer) && (solid || !inside(p, hole)) && distPoly(p, outer) > clear * h && (!hole.length || distPoly(p, hole) > clear * h)) pts.push(p);
      }
    let F = delaunay(pts).filter(t => { const c = [(pts[t[0]][0] + pts[t[1]][0] + pts[t[2]][0]) / 3, (pts[t[0]][1] + pts[t[1]][1] + pts[t[2]][1]) / 3]; return inside(c, outer) && (solid || !inside(c, hole)); });
    F = F.map(t => { const a = pts[t[0]], b = pts[t[1]], c = pts[t[2]]; return ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) < 0 ? [t[0], t[2], t[1]] : t; });
    const em = edgesMap(F); let ok = true;
    const chk = (a, b) => { const key = Math.min(a, b) * 1e6 + Math.max(a, b); if (!em.has(key) || em.get(key).opp.length !== 1) ok = false; };
    for (let i = 0; i < no && ok; i++) chk(i, (i + 1) % no);
    if (!solid) for (let i = 0; i < nh && ok; i++) chk(no + i, no + (i + 1) % nh);
    let naked = 0; for (const e of em.values()) if (e.opp.length === 1) naked++;
    if (ok && naked === no + (solid ? 0 : nh)) return { V: pts.map(p => [p[0], p[1], 0]), F };
  }
  throw new Error('No pude mallar la lámina con caladura. Probá otra densidad de malla.');
}

/* Varios cierres: cada centro s0 une c(s0 + t) ≡ c(s0 − t), t ∈ [0, ext]. depth se normaliza a la escala de P/2
   para que todos los cierres avancen juntos con el mismo progreso. */
function buildPairsMulti(nb, s, P, centers) {
  const out = [], tol = 1e-7 * P, ss = s.concat([P]);
  const at = t => { t = ((t % P) + P) % P; let n = 0; while (n < nb - 1 && ss[n + 1] <= t) n++;
    const a = ss[n], b = ss[n + 1]; return [n, (n + 1) % nb, b - a < tol ? 0 : (t - a) / (b - a)]; };
  for (let i = 0; i < nb; i++) for (const { s0, ext } of centers) {
    let d = s[i] - s0; d = ((d + P / 2) % P + P) % P - P / 2;      // diferencia circular
    const ad = Math.abs(d);
    if (ad < tol || ad > ext + tol) continue;
    const [j, k, w] = at(s0 - d);
    out.push([i, j, k, w, ad / ext * P / 2]);
  }
  return out;
}

function buildPairs(nb, s, P) {
  const out = [], tol = 1e-7 * P, ss = s.concat([P]);
  for (let i = 0; i < nb; i++) {
    const si = s[i], depth = Math.min(si, P - si);
    if (depth < tol || Math.abs(si - P / 2) < tol) continue;
    const t = (P - si) % P;
    let n = 0; while (n < nb - 1 && ss[n + 1] <= t) n++;
    const a = ss[n], b = ss[n + 1], w = b - a < tol ? 0 : (t - a) / (b - a);
    out.push([i, n, (n + 1) % nb, w, depth]);
  }
  return out;
}

/* ---------- matriz dispersa simétrica (mapa por fila) + Cholesky de envolvente ---------- */
class SymMap {
  constructor(n) { this.n = n; this.rows = Array.from({ length: n }, () => new Map()); }
  add(i, j, v) { const r = this.rows[i]; r.set(j, (r.get(j) || 0) + v); }
  addSym(i, j, v) { this.add(i, j, v); if (i !== j) this.add(j, i, v); }
  clone() { const m = new SymMap(this.n); m.rows = this.rows.map(r => new Map(r)); return m; }
}

function rcm(adj) {
  const n = adj.length, deg = adj.map(a => a.length), seen = new Uint8Array(n), order = [];
  while (order.length < n) {
    let start = -1;
    for (let i = 0; i < n; i++) if (!seen[i] && (start < 0 || deg[i] < deg[start])) start = i;
    const q = [start]; seen[start] = 1;
    while (q.length) {
      const v = q.shift(); order.push(v);
      const nb = adj[v].filter(u => !seen[u]).sort((a, b) => deg[a] - deg[b]);
      for (const u of nb) { seen[u] = 1; q.push(u); }
    }
  }
  return order.reverse();
}

class EnvelopeCholesky {
  constructor(perm, pattern) {           // pattern: SymMap con el patrón máximo
    this.n = perm.length; this.perm = perm;
    this.inv = new Int32Array(this.n); perm.forEach((v, i) => this.inv[v] = i);
    this.first = new Int32Array(this.n);
    for (let i = 0; i < this.n; i++) {
      let f = i;
      for (const j of pattern.rows[perm[i]].keys()) f = Math.min(f, this.inv[j]);
      this.first[i] = f;
    }
    this.L = Array.from({ length: this.n }, (_, i) => new Float64Array(i - this.first[i] + 1));
  }
  factor(K) {
    const { n, first, L, perm, inv } = this;
    for (let i = 0; i < n; i++) {
      L[i].fill(0);
      for (const [j, v] of K.rows[perm[i]]) { const jj = inv[j]; if (jj <= i) L[i][jj - first[i]] += v; }
    }
    for (let i = 0; i < n; i++) {
      const fi = first[i], Li = L[i];
      for (let j = fi; j <= i; j++) {
        const fj = first[j], Lj = L[j], k0 = Math.max(fi, fj);
        let s = Li[j - fi];
        for (let k = k0; k < j; k++) s -= Li[k - fi] * Lj[k - fj];
        if (j < i) Li[j - fi] = s / Lj[j - fj];
        else { if (s <= 0) throw new Error('Matriz no definida positiva'); Li[i - fi] = Math.sqrt(s); }
      }
    }
  }
  solve(b) {                               // b en índices originales → x en índices originales
    const { n, first, L, perm } = this, y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const fi = first[i], Li = L[i]; let s = b[perm[i]];
      for (let k = fi; k < i; k++) s -= Li[k - fi] * y[k];
      y[i] = s / Li[i - fi];
    }
    for (let i = n - 1; i >= 0; i--) {
      const fi = first[i], Li = L[i];
      y[i] /= Li[i - fi];
      const yi = y[i];
      for (let k = fi; k < i; k++) y[k] -= Li[k - fi] * yi;
    }
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) x[perm[i]] = y[i];
    return x;
  }
}

/* Polígono de esquinas → contorno remuestreado que arranca en A, sobre la arista `edge`, a fracción t.
   Conserva las esquinas como vértices del borde. n ≈ cantidad total de puntos del borde. */
function polygonFromA(corners, edge, t, n, withMids) {
  // Recorrido cerrado desde A. Los cortes {0, P/2, esquinas s_c y sus parejas P − s_c} son simétricos
  // respecto de s → P − s, así cada nodo del borde tiene su pareja exacta en otro nodo.
  const k = corners.length, a = corners[edge], b = corners[(edge + 1) % k];
  const A = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  const path = [A];
  for (let i = 1; i <= k; i++) path.push(corners[(edge + i) % k]);
  path.push(A);
  for (let i = path.length - 1; i > 0; i--) if (Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]) < 1e-9) path.splice(i, 1);
  const cum = [0];
  for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const P = cum[cum.length - 1];
  const at = s => { let i = 0; while (i < path.length - 2 && cum[i + 1] < s) i++; const w = (s - cum[i]) / ((cum[i + 1] - cum[i]) || 1);
    return [path[i][0] + w * (path[i + 1][0] - path[i][0]), path[i][1] + w * (path[i + 1][1] - path[i][1])]; };
  let br = [0, P / 2];
  for (let i = 1; i < path.length - 1; i++) br.push(cum[i], P - cum[i]);
  if (withMids) for (let i = 0; i < path.length - 1; i++) br.push((cum[i] + cum[i + 1]) / 2);   // puntos medios de cada tramo
  br = br.map(x => ((x % P) + P) % P).sort((x, y) => x - y);
  const brk = [];
  for (const x of br) if (!brk.length || x - brk[brk.length - 1] > 1e-7 * P) brk.push(x);
  if (P - brk[brk.length - 1] < 1e-7 * P) brk.pop();
  brk.push(P);
  const h = P / n, out = [];
  for (let i = 0; i < brk.length - 1; i++) {
    const l = brk[i + 1] - brk[i], m = Math.max(1, Math.round(l / h));
    for (let j = 0; j < m; j++) out.push(at(brk[i] + j * l / m));
  }
  return out;
}


/* Envolvente convexa 3D incremental (O(n·caras)); devuelve planos [nx,ny,nz,d] con n·p − d ≤ 0 adentro. */
function convexHullPlanes(X0, X1, X2, n) {
  const P = i => [X0[i], X1[i], X2[i]];
  const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]], dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const crs = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  let ext = 0; for (let i = 0; i < n; i++) ext = Math.max(ext, Math.abs(X0[i]), Math.abs(X1[i]), Math.abs(X2[i]));
  const eps = 1e-9 * Math.max(ext, 1);
  // tetraedro inicial
  let i0 = 0, i1 = -1, i2 = -1, i3 = -1, best = 0;
  for (let i = 1; i < n; i++) { const d = Math.hypot(...sub(P(i), P(i0))); if (d > best) { best = d; i1 = i; } }
  best = 0; for (let i = 0; i < n; i++) { const d = Math.hypot(...crs(sub(P(i1), P(i0)), sub(P(i), P(i0)))); if (d > best) { best = d; i2 = i; } }
  const nn = crs(sub(P(i1), P(i0)), sub(P(i2), P(i0)));
  best = 0; for (let i = 0; i < n; i++) { const d = Math.abs(dot(nn, sub(P(i), P(i0)))); if (d > best) { best = d; i3 = i; } }
  const span = Math.hypot(...sub(P(i1), P(i0)));
  // best = |nn|·altura del tetraedro inicial; si la altura < 4 % del largo, la forma es casi plana y la envolvente no informa
  if (i1 < 0 || i2 < 0 || i3 < 0 || best < 0.04 * span * Math.hypot(...nn)) return null;
  const cen = [0, 1, 2].map(k => (P(i0)[k] + P(i1)[k] + P(i2)[k] + P(i3)[k]) / 4);
  let faces = [];
  const mk = (a, b, c) => { let nrm = crs(sub(P(b), P(a)), sub(P(c), P(a))); if (dot(nrm, sub(cen, P(a))) > 0) { [b, c] = [c, b]; nrm = crs(sub(P(b), P(a)), sub(P(c), P(a))); }
    const l = Math.hypot(...nrm) || 1e-30; const u = [nrm[0] / l, nrm[1] / l, nrm[2] / l]; return { v: [a, b, c], n: u, d: dot(u, P(a)) }; };
  faces = [mk(i0, i1, i2), mk(i0, i1, i3), mk(i0, i2, i3), mk(i1, i2, i3)];
  for (let i = 0; i < n; i++) {
    if (i === i0 || i === i1 || i === i2 || i === i3) continue;
    const p = P(i), vis = [], keep = [];
    for (const f of faces) (dot(f.n, p) - f.d > eps ? vis : keep).push(f);
    if (!vis.length) continue;
    const cnt = new Map();
    for (const f of vis) for (let k = 0; k < 3; k++) { const a = f.v[k], b = f.v[(k + 1) % 3]; cnt.set(a * 1048576 + b, [a, b]); }
    faces = keep;
    for (const [key, [a, b]] of cnt) if (!cnt.has(b * 1048576 + a)) {
      let nrm = crs(sub(P(b), P(a)), sub(p, P(a))); const l = Math.hypot(...nrm) || 1e-30;
      const u = [nrm[0] / l, nrm[1] / l, nrm[2] / l]; faces.push({ v: [a, b, i], n: u, d: dot(u, P(a)) });
    }
  }
  const out = new Float64Array(4 * faces.length);
  faces.forEach((f, k) => { out[4 * k] = f.n[0]; out[4 * k + 1] = f.n[1]; out[4 * k + 2] = f.n[2]; out[4 * k + 3] = f.d; });
  return out;
}

/* contorno cerrado genérico (riñón): borde remuestreado desde A, con pareja exacta para cada nodo */
function pathCum(path) { const c = [0]; for (let i = 1; i <= path.length; i++) { const a = path[i - 1], b = path[i % path.length]; c.push(c[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); } return c; }
function pathAt(path, cum, s) {
  const P = cum[cum.length - 1]; s = ((s % P) + P) % P;
  let lo = 0, hi = path.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (cum[m] <= s) lo = m; else hi = m - 1; }
  const a = path[lo], b = path[(lo + 1) % path.length], w = (s - cum[lo]) / ((cum[lo + 1] - cum[lo]) || 1);
  return [a[0] + w * (b[0] - a[0]), a[1] + w * (b[1] - a[1])];
}
function signedArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return a / 2; }
function cornersOf(path, cum, tol) {          // [{s, ang}] ángulo interior en cada esquina
  const n = path.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = path[(i - 1 + n) % n], b = path[i], c = path[(i + 1) % n];
    const t1 = Math.atan2(b[1] - a[1], b[0] - a[0]), t2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
    let turn = t2 - t1; while (turn > Math.PI) turn -= 2 * Math.PI; while (turn < -Math.PI) turn += 2 * Math.PI;
    if (Math.abs(turn) > tol) out.push({ s: cum[i], ang: Math.PI - turn });
  }
  return out;
}
function boundaryFromA(path, sA, n, cornerTol = 0.3) {
  if (signedArea(path) < 0) throw new Error('El contorno tiene que ir en sentido antihorario.');
  const cum = pathCum(path), P = cum[cum.length - 1];
  const cs = cornersOf(path, cum, cornerTol).map(c => ((c.s - sA) % P + P) % P);
  let br = [0, P / 2]; for (const s of cs) br.push(s, P - s);
  br = br.map(x => ((x % P) + P) % P).sort((x, y) => x - y);
  const h = P / n, mtol = 0.3 * h, brk = [];
  for (const x of br) if (!brk.length || x - brk[brk.length - 1] > mtol) brk.push(x);
  if (P - brk[brk.length - 1] < mtol) brk.pop();
  brk.push(P);
  const out = [];
  for (let i = 0; i < brk.length - 1; i++) {
    const l = brk[i + 1] - brk[i], m = Math.max(1, Math.round(l / h));
    for (let j = 0; j < m; j++) out.push(pathAt(path, cum, sA + brk[i] + j * l / m));
  }
  return out;
}

/* Clase D: dos láminas de anillo. Cada una sutura su caladura desde A (su nodo 0) y además los dos contornos
   exteriores se unen punto a punto (unión perimetral), avanzando desde arriba hacia abajo por los dos lados.
   mirror: la lámina 2 es la imagen especular de la 1 (tesis pág. 55: da superficies helicoidales); si no, es idéntica. */
/* varios inicios (A, B, C): centros en fracción del perímetro {f, e} → longitud de arco; zd para dibujar la costura */
const centersAbs = (cf, P) => cf.map(c => ({ s0: c.f * P, ext: c.e * P }));
function zdCenters(s, P, cs) { return s.map(v => { let z = Infinity; for (const { s0, ext } of cs) { let d = v - s0; d = ((d + P / 2) % P + P) % P - P / 2; if (d >= -1e-9 && d <= ext + 1e-9) z = Math.min(z, d / ext); } return z; }); }
const nearestS = (s, t) => { let b = 0; s.forEach((v, k) => { if (Math.abs(v - t) < Math.abs(s[b] - t)) b = k; }); return b; };
function buildDual(outer, hole, mirror, h, elp = 1, cf = null, arc = false) {   // elp: fracción de la unión perimetral (1 = total), medida desde arriba por los dos lados
  // arc (Curva libre): la unión entre láminas se empareja por longitud de arco desde A (nodo 0 del contorno exterior),
  // un lado hacia cada mano, en vez de por ángulo alrededor del origen. Idéntica: nodo i ⟷ nodo i. Espejo: nodo i ⟷ nodo −i
  // (la lámina 2 refleja x → −x, así que su recorrido antihorario en planta es el inverso del índice). A tiene que estar en x = 0.
  const M = meshPlanarHole(outer, hole, h, false), no = outer.length, nh = hole.length, n1 = M.V.length, g = 0.05;
  const V = M.V.map(p => [p[0], p[1], g]).concat(M.V.map(p => [mirror ? -p[0] : p[0], p[1], -g]));
  const F = M.F.concat(M.F.map(f => mirror ? [f[0] + n1, f[1] + n1, f[2] + n1] : [f[0] + n1, f[2] + n1, f[1] + n1]));
  const sH = [0]; for (let i = 1; i < nh; i++) sH.push(sH[i - 1] + Math.hypot(hole[i][0] - hole[i - 1][0], hole[i][1] - hole[i - 1][1]));
  const Ph = sH[nh - 1] + Math.hypot(hole[0][0] - hole[nh - 1][0], hole[0][1] - hole[nh - 1][1]);
  const pairs = [];
  const hc = cf ? centersAbs(cf, Ph) : null;
  for (const base of [no, n1 + no]) for (const [i, j, k, w, d] of (hc ? buildPairsMulti(nh, sH, Ph, hc) : buildPairs(nh, sH, Ph))) pairs.push([base + i, base + j, base + k, w, d]);
  // unión perimetral: nodo i de la lámina 1 con el nodo de la lámina 2 que cae en el mismo lugar en planta
  const ang = outer.map(p => Math.atan2(p[1], p[0])), zdP = new Array(no);
  if (arc) {
    const so = [0]; for (let i = 1; i < no; i++) so.push(so[i - 1] + Math.hypot(outer[i][0] - outer[i - 1][0], outer[i][1] - outer[i - 1][1]));
    const PO = so[no - 1] + Math.hypot(outer[0][0] - outer[no - 1][0], outer[0][1] - outer[no - 1][1]);
    for (let i = 0; i < no; i++) {
      const j = mirror ? (no - i) % no : i, z = Math.min(so[i], PO - so[i]) / (PO / 2);
      if (elp > 1e-6 && z <= elp + 1e-9) { zdP[i] = z / elp; pairs.push([i, n1 + j, n1 + j, 0, zdP[i] * Ph / 2]); }
      else zdP[i] = Infinity;
    }
  } else for (let i = 0; i < no; i++) {
    const want = mirror ? Math.PI - ang[i] : ang[i];
    let j = 0, bd = Infinity; for (let q = 0; q < no; q++) { let d = Math.abs(((ang[q] - want) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI); if (d < bd) { bd = d; j = q; } }
    let a = Math.abs(((ang[i] - Math.PI / 2) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);   // distancia angular al arranque (arriba)
    const z = a / Math.PI;
    if (elp > 1e-6 && z <= elp + 1e-9) { zdP[i] = z / elp; pairs.push([i, n1 + j, n1 + j, 0, zdP[i] * Ph / 2]); }   // la parte unida avanza durante toda la transición
    else zdP[i] = Infinity;
  }
  const bnd = new Uint8Array(2 * n1); for (let i = 0; i < no + nh; i++) { bnd[i] = 1; bnd[n1 + i] = 1; }
  const zdH = hc ? zdCenters(sH, Ph, hc) : sH.map(v => v <= Ph / 2 + 1e-9 ? v / (Ph / 2) : Infinity);
  return { V, F, pairs, bnd, no, nh, n1, sH, Ph, lift2: iB => [n1 + no, n1 + no + iB],
    extraSeams: [{ idx: Array.from({ length: nh }, (_, k) => n1 + no + k), zd: zdH }, { idx: Array.from({ length: no }, (_, k) => k), zd: zdP }],
    extraLoops: [Array.from({ length: no }, (_, k) => n1 + k), Array.from({ length: nh }, (_, k) => n1 + no + k)] };
}

/* Operación E (extensión de la tesis de Bica): dos láminas SIN caladura ni sutura, unidas solo por el perímetro.
   Cada lámina tiene su A propio (nodo 0 de su contorno) y su B a P/2. El nodo i de la lámina 1, a longitud de arco d de A1
   (con signo), se une al punto de la lámina 2 a longitud de arco d·P2/P1 de A2 (idéntica) o −d·P2/P1 (espejo), con interpolación
   entre los nodos de la 2. Si A2 ≠ A1 el emparejado se tuerce y la superficie toma volumen.
   reflect: la lámina 2 se da vuelta (x → −x en planta) antes de apilarla; en la copia el eje es x = 0, donde la preparación puso a A1.
   El emparejado sigue siempre el mismo sentido en el espacio (como la Clase D): por eso en espejo es −d en el orden del dibujo.
   align: la 2 se apila girada y trasladada para que las parejas queden lo más cerca posible. */
function buildDual2(outer1, outer2, mirror, reflect, h, elp = 1, align = false) {
  const no1 = outer1.length, no2 = outer2.length;
  const cum = o => { const s = [0]; for (let i = 1; i < o.length; i++) s.push(s[i - 1] + Math.hypot(o[i][0] - o[i - 1][0], o[i][1] - o[i - 1][1]));
    return [s, s[o.length - 1] + Math.hypot(o[0][0] - o[o.length - 1][0], o[0][1] - o[o.length - 1][1])]; };
  const [s1, P1] = cum(outer1);
  const [s2, P2] = cum(outer2);
  // apilado: la 2 (ya dada vuelta si es espejo) se gira y se traslada en planta para que las parejas queden lo más cerca posible
  // (Kabsch 2D, mínimos cuadrados). Así, si las láminas coinciden punto a punto, arrancan superpuestas y el cierre las deja planas.
  let cs = 1, sn = 0, tx = 0, ty = 0;
  const fl = p => [reflect ? -p[0] : p[0], p[1]];
  if (align) {
    const pt = u => { u = ((u % P2) + P2) % P2; let j = 0; while (j < no2 - 1 && s2[j + 1] <= u) j++; const a = s2[j], b = j + 1 < no2 ? s2[j + 1] : P2, w = b - a < 1e-12 ? 0 : (u - a) / (b - a), A = outer2[j], B = outer2[(j + 1) % no2];
      return fl([A[0] + w * (B[0] - A[0]), A[1] + w * (B[1] - A[1])]); };
    const Q = [], Pp = [];
    for (let i = 0; i < no1; i++) { const d = s1[i] <= P1 / 2 ? s1[i] : s1[i] - P1; Q.push(pt((mirror ? -d : d) * P2 / P1)); Pp.push(outer1[i]); }
    const m = A => [A.reduce((s, p) => s + p[0], 0) / A.length, A.reduce((s, p) => s + p[1], 0) / A.length], pc = m(Pp), qc = m(Q);
    let sxx = 0, sxy = 0; for (let i = 0; i < no1; i++) { const qx = Q[i][0] - qc[0], qy = Q[i][1] - qc[1], px = Pp[i][0] - pc[0], py = Pp[i][1] - pc[1]; sxx += qx * px + qy * py; sxy += qx * py - qy * px; }
    const th = Math.atan2(sxy, sxx); cs = Math.cos(th); sn = Math.sin(th);
    tx = pc[0] - (cs * qc[0] - sn * qc[1]); ty = pc[1] - (sn * qc[0] + cs * qc[1]);
  }
  const M1 = meshPlanar(outer1, h), M2 = meshPlanar(outer2, h), n1 = M1.V.length, g = 0.05;
  const V = M1.V.map(p => [p[0], p[1], g]).concat(M2.V.map(p => { const q = fl(p); return [cs * q[0] - sn * q[1] + tx, sn * q[0] + cs * q[1] + ty, -g]; }));
  const F = M1.F.concat(M2.F.map(f => reflect ? [f[0] + n1, f[1] + n1, f[2] + n1] : [f[0] + n1, f[2] + n1, f[1] + n1]));
  const at2 = u => { u = ((u % P2) + P2) % P2; let j = 0; while (j < no2 - 1 && s2[j + 1] <= u) j++;
    const a = s2[j], b = j + 1 < no2 ? s2[j + 1] : P2; return [j, (j + 1) % no2, b - a < 1e-12 * P2 ? 0 : (u - a) / (b - a)]; };
  const pairs = [], zd1 = new Array(no1);
  for (let i = 0; i < no1; i++) {
    const d = s1[i] <= P1 / 2 ? s1[i] : s1[i] - P1, z = Math.abs(d) / (P1 / 2);
    if (elp > 1e-6 && z <= elp + 1e-9) { zd1[i] = z / elp; const [j, k, w] = at2((mirror ? -d : d) * P2 / P1); pairs.push([i, n1 + j, n1 + k, w, zd1[i] * P1 / 2]); }
    else zd1[i] = Infinity;
  }
  const zd2 = s2.map(v => { const z = Math.min(v, P2 - v) / (P2 / 2); return elp > 1e-6 && z <= elp + 1e-9 ? z / elp : Infinity; });
  const bnd = new Uint8Array(n1 + M2.V.length); for (let i = 0; i < no1; i++) bnd[i] = 1; for (let i = 0; i < no2; i++) bnd[n1 + i] = 1;
  let b2 = 0; s2.forEach((v, k) => { if (Math.abs(v - P2 / 2) < Math.abs(s2[b2] - P2 / 2)) b2 = k; });
  const loop2 = Array.from({ length: no2 }, (_, k) => n1 + k);
  return { V, F, pairs, bnd, no: no1, no2, n1, two: true, P1, P2, s1, zd1, lift2: () => [n1, n1 + b2],
    extraSeams: [{ idx: loop2, zd: zd2 }], extraLoops: [loop2] };
}

function simulate(input, opt, onFrame) {
  const bend = opt.bend ?? 0.1, flip = !!opt.flip, frames = opt.frames ?? 48, iters = opt.iters ?? 80,
        settle = opt.settle ?? 6, wPair = 200, eps = 1e-3, pressure = opt.pressure ?? 0, wHull = opt.hull ?? 0, hullEvery = opt.hullEvery ?? 8, hullRamp = p => Math.min(1, (opt.hullFrom ?? 0) <= 0 ? 1 : p / opt.hullFrom);
  // con caladura: `input` es el contorno exterior (libre) y opt.hole la ELI, que se sutura desde A (su nodo 0)
  // opt.seamIdx: costura alineada al borde; sus nodos son vértices de la malla (del borde o interiores: opt.innerPts)
  let shared = false, hole = null, solidSeam = false, seamPoly, poly, nb, off = 0, nbAll, sid, s, P, h, V, F, dual = null;
  if (opt.dual2) {
    const d2 = opt.dual2;
    dual = buildDual2(input, d2.outer2, d2.mirror, d2.reflect, d2.h, d2.elp ?? 1, !!d2.align);
    ({ V, F } = dual); poly = input; seamPoly = input; nb = dual.no; s = dual.s1; P = dual.P1; h = P / nb; off = 0; nbAll = 0; hole = null;
    sid = k => k;
  } else if (opt.dual) {
    { const hl = opt.dual.hole; let Lh = 0; for (let i = 0; i < hl.length; i++) Lh += Math.hypot(hl[(i + 1) % hl.length][0] - hl[i][0], hl[(i + 1) % hl.length][1] - hl[i][1]);
      dual = buildDual(input, hl, opt.dual.mirror, opt.dual.h || Lh / hl.length, opt.dual.elp ?? 1, opt.dual.centersF || null, !!opt.dual.arc); }
    ({ V, F } = dual); poly = input; seamPoly = opt.dual.hole; nb = dual.nh; s = dual.sH; P = dual.Ph; h = P / nb; off = dual.no; nbAll = 0; hole = seamPoly;
    sid = k => dual.no + k;
  } else {
    shared = !!opt.seamIdx;
    hole = shared ? opt.innerPts : (opt.hole || opt.seamLine || null); solidSeam = shared || !!opt.seamLine;
    seamPoly = shared ? opt.seamNodes : hole || (opt.closed ? input : outlineFromHalf(input));
    poly = hole || shared ? input : seamPoly;
    if (!isSimple(poly) || (hole && !solidSeam && !isSimple(hole))) throw new Error('El contorno se cruza consigo mismo. Mové los puntos para que la figura no se superponga.');
    nb = seamPoly.length; off = hole && !shared ? input.length : 0; nbAll = hole || shared ? input.length + (solidSeam ? 0 : hole.length) : nb;
    sid = shared ? (k => opt.seamIdx[k]) : (k => k + off);   // índice de malla del nodo k de la costura
    s = [0]; for (let i = 1; i < nb; i++) s.push(s[i - 1] + Math.hypot(seamPoly[i][0] - seamPoly[i - 1][0], seamPoly[i][1] - seamPoly[i - 1][1]));
    P = s[nb - 1] + Math.hypot(seamPoly[0][0] - seamPoly[nb - 1][0], seamPoly[0][1] - seamPoly[nb - 1][1]);
    h = P / nb;
    ({ V, F } = hole || shared ? meshPlanarHole(input, hole || [], h, solidSeam) : meshPlanar(poly, h));
  }
  const n = V.length;
  const em = [...edgesMap(F).values()];
  const E = em.map(e => [e.a, e.b]);
  const L0 = E.map(([a, b]) => Math.hypot(V[b][0] - V[a][0], V[b][1] - V[a][1]));
  const hm = L0.reduce((a, b) => a + b, 0) / L0.length;
  // matriz base
  const K0 = new SymMap(n);
  const wE = opt.stretchW ?? 1;      // goma: aristas blandas, la lámina puede estirar y comprimirse
  for (const [a, b] of E) { K0.add(a, a, wE); K0.add(b, b, wE); K0.addSym(a, b, -wE); }
  // Laplaciano cotangente
  const Lrows = Array.from({ length: n }, () => new Map()), area = new Float64Array(n);
  for (const f of F) {
    for (let k = 0; k < 3; k++) {
      const i = f[k], j = f[(k + 1) % 3], o = f[(k + 2) % 3];
      const u = [V[i][0] - V[o][0], V[i][1] - V[o][1]], v = [V[j][0] - V[o][0], V[j][1] - V[o][1]];
      const cot = (u[0] * v[0] + u[1] * v[1]) / Math.max(Math.abs(u[0] * v[1] - u[1] * v[0]), 1e-12);
      const add = (r, c, w) => Lrows[r].set(c, (Lrows[r].get(c) || 0) + w);
      add(i, j, -0.5 * cot); add(j, i, -0.5 * cot); add(i, i, 0.5 * cot); add(j, j, 0.5 * cot);
    }
    const a = V[f[0]], b = V[f[1]], c = V[f[2]];
    const ar = 0.5 * Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 3;
    area[f[0]] += ar; area[f[1]] += ar; area[f[2]] += ar;
  }
  const bscale = bend * hm * hm;
  for (let r = nbAll; r < n; r++) {               // solo filas interiores
    if (dual && dual.bnd[r]) continue;
    const ent = [...Lrows[r].entries()], w = bscale / area[r];
    for (const [p, lp] of ent) for (const [q, lq] of ent) K0.add(p, q, w * lp * lq);
  }
  for (let i = 0; i < n; i++) K0.add(i, i, eps + wHull);
  const centers = opt.centers || (opt.centersF && !dual ? centersAbs(opt.centersF, P) : null);
  const liftBt = Number.isFinite(opt.liftBf) ? opt.liftBf * P : P / 2;   // con tres inicios, B no está a medio perímetro
  // altura de A y B: cada uno se lleva a una altura fija respecto de la altura media del resto de la lámina
  let liftIds = null; const wLift = 5;   // tirón firme pero no absoluto: si la altura pedida obliga a estirar, se queda lo más cerca posible
  if (opt.lift && opt.liftF) {     // varios inicios: un punto por inicio (costura principal, borde de la Clase B, lámina 2)
    let so = null, PO = 0;
    if (opt.liftF.some(q => q.s === 'o')) { so = [0]; for (let i = 1; i < input.length; i++) so.push(so[i - 1] + Math.hypot(input[i][0] - input[i - 1][0], input[i][1] - input[i - 1][1]));
      PO = so[so.length - 1] + Math.hypot(input[0][0] - input[input.length - 1][0], input[0][1] - input[input.length - 1][1]); }
    liftIds = opt.liftF.map(q => q.s === 'o' ? nearestS(so, q.f * PO) : q.sheet ? dual.n1 + dual.no + nearestS(s, q.f * P) : sid(nearestS(s, q.f * P)));
    liftIds = liftIds.slice(0, opt.lift.length); for (const i of liftIds) K0.add(i, i, wLift); }
  else if (opt.lift) { let iBn = 0; for (let k = 0; k < nb; k++) if (Math.abs(s[k] - liftBt) < Math.abs(s[iBn] - liftBt)) iBn = k;
    liftIds = [sid(0), sid(iBn)]; if (dual) liftIds.push(...dual.lift2(iBn));   // Clases D y E: A y B de la lámina 2
    liftIds = liftIds.slice(0, opt.lift.length); for (const i of liftIds) K0.add(i, i, wLift); }
  const pairs = dual ? dual.pairs : (centers ? buildPairsMulti(nb, s, P, centers) : buildPairs(nb, s, P)).map(([i, j, k, w, d]) => [sid(i), sid(j), sid(k), w, d]);
  // Clase B: además de suturar la caladura, el borde exterior se une consigo mismo desde su nodo 0 (A del borde).
  // Las dos cremalleras avanzan juntas: la del borde se escala para terminar en el mismo fotograma que la sutura.
  let outerSeam = null;
  if (opt.outerZip && hole && !shared && !solidSeam && !dual) {
    const no = input.length, so = [0];
    for (let i = 1; i < no; i++) so.push(so[i - 1] + Math.hypot(input[i][0] - input[i - 1][0], input[i][1] - input[i - 1][1]));
    const PO = so[no - 1] + Math.hypot(input[0][0] - input[no - 1][0], input[0][1] - input[no - 1][1]), sc = P / PO;
    const oc = opt.outerCentersF ? centersAbs(opt.outerCentersF, PO) : null;
    for (const [i, j, k, w, d] of (oc ? buildPairsMulti(no, so, PO, oc) : buildPairs(no, so, PO))) pairs.push([i, j, k, w, d * sc]);
    outerSeam = { idx: Array.from({ length: no }, (_, k) => k), zd: oc ? zdCenters(so, PO, oc) : so.map(v => v <= PO / 2 + 1e-9 ? v / (PO / 2) : Infinity) };
    if (oc) outerSeam.marks = oc.map(c => nearestS(so, c.s0));
  }
  // patrón máximo (todos los pares) para orden y envolvente
  const pat = K0.clone();
  for (const [i, j, k] of pairs) { pat.addSym(i, j, 1); pat.addSym(i, k, 1); pat.addSym(j, k, 1); }
  const adj = pat.rows.map((r, i) => [...r.keys()].filter(j => j !== i));
  const chol = new EnvelopeCholesky(rcm(adj), pat);
  // estado inicial con semilla fuera del plano
  const X = [new Float64Array(n), new Float64Array(n), new Float64Array(n)];
  let cx = 0, cy = 0; for (const p of V) { cx += p[0] / n; cy += p[1] / n; }
  let r2max = 0; for (const p of V) r2max = Math.max(r2max, (p[0] - cx) ** 2 + (p[1] - cy) ** 2);
  for (let i = 0; i < n; i++) {
    X[0][i] = V[i][0]; X[1][i] = V[i][1];
    X[2][i] = (flip ? -1 : 1) * hm * (1 - ((V[i][0] - cx) ** 2 + (V[i][1] - cy) ** 2) / r2max);
    if (dual) X[2][i] = V[i][2] + (i < dual.n1 ? 1 : -1) * Math.abs(X[2][i]);   // las dos láminas se abren como almohada
  }
  let lastKey = -1;
  let hullPlanes = null; const hullCap = Infinity;
  const step = (prog) => {
    const act = pairs.filter(p => p[4] <= prog * P / 2 + 1e-12);
    if (act.length !== lastKey) {
      const K = K0.clone();
      for (const [i, j, k, w] of act) {
        const id = [i, j, k], c = [1, -(1 - w), -w];
        for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) K.add(id[a], id[b], wPair * c[a] * c[b]);
      }
      chol.factor(K); lastKey = act.length;
    }
    const prev = X.map(c => c.slice());
    for (let it = 0; it < iters; it++) {
      const rhs = [new Float64Array(n), new Float64Array(n), new Float64Array(n)];
      for (let e = 0; e < E.length; e++) {
        const [a, b] = E[e];
        const dx = X[0][b] - X[0][a], dy = X[1][b] - X[1][a], dz = X[2][b] - X[2][a];
        const l = Math.max(Math.hypot(dx, dy, dz), 1e-12), sc = wE * L0[e] / l;
        rhs[0][a] -= dx * sc; rhs[0][b] += dx * sc;
        rhs[1][a] -= dy * sc; rhs[1][b] += dy * sc;
        rhs[2][a] -= dz * sc; rhs[2][b] += dz * sc;
      }
      if (pressure > 0 && prog > 0) {
        let vol = 0; const fx = new Float64Array(n), fy = new Float64Array(n), fz = new Float64Array(n);
        for (const f of F) {
          const [a, b, c] = f;
          const ux = X[0][b] - X[0][a], uy = X[1][b] - X[1][a], uz = X[2][b] - X[2][a];
          const vx = X[0][c] - X[0][a], vy = X[1][c] - X[1][a], vz = X[2][c] - X[2][a];
          const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;   // 2·área·normal
          vol += (X[0][a] * nx + X[1][a] * ny + X[2][a] * nz) / 6;
          for (const v of f) { fx[v] += nx / 6; fy[v] += ny / 6; fz[v] += nz / 6; }
        }
        const sg = (vol >= 0 ? 1 : -1) * pressure * prog;
        for (let i = 0; i < n; i++) { rhs[0][i] += sg * fx[i]; rhs[1][i] += sg * fy[i]; rhs[2][i] += sg * fz[i]; }
      }
      if (wHull > 0) {
        // vértices hundidos respecto de la envolvente convexa → empujados a la cara más cercana
        if (it % hullEvery === 0) hullPlanes = convexHullPlanes(X[0], X[1], X[2], n);
        const wh = wHull * hullRamp(prog);
        for (let i = 0; i < n; i++) {
          let tx = X[0][i], ty = X[1][i], tz = X[2][i];
          if (hullPlanes && wh > 0) {
            let bd = -Infinity, bq = -1; const H = hullPlanes, m = H.length;
            for (let q = 0; q < m; q += 4) { const v = H[q] * tx + H[q + 1] * ty + H[q + 2] * tz - H[q + 3]; if (v > bd) { bd = v; bq = q; } }
            if (bq >= 0 && bd < 0) { const st = Math.max(bd, -hullCap); tx -= st * H[bq]; ty -= st * H[bq + 1]; tz -= st * H[bq + 2]; }   // paso acotado
          }
          // peso fijo en la matriz: cuando wh < wHull, se mezcla con la posición actual
          const a = wh / wHull;
          rhs[0][i] += wHull * (a * tx + (1 - a) * X[0][i]); rhs[1][i] += wHull * (a * ty + (1 - a) * X[1][i]); rhs[2][i] += wHull * (a * tz + (1 - a) * X[2][i]);
        }
      }
      for (let c = 0; c < 3; c++) {
        for (let i = 0; i < n; i++) rhs[c][i] += eps * prev[c][i];
        if (liftIds) {
          if (c < 2) for (const i of liftIds) rhs[c][i] += wLift * X[c][i];   // en planta queda libre
          else { let zc = 0; for (let i = 0; i < n; i++) zc += X[2][i]; for (const i of liftIds) zc -= X[2][i]; zc /= (n - liftIds.length);
            liftIds.forEach((i, q) => { rhs[2][i] += wLift * (zc + (flip ? -1 : 1) * (opt.liftRamp === false ? 1 : prog) * opt.lift[q]); }); }   // crece con el cierre: en 0 % A y B quedan en el plano
        }
        X[c] = chol.solve(rhs[c]);
      }
    }
  };
  const pack = () => { const a = new Float32Array(3 * n); for (let i = 0; i < n; i++) { a[3 * i] = X[0][i]; a[3 * i + 1] = X[1][i]; a[3 * i + 2] = X[2][i]; } return a; };
  const seq = [];
  for (let f = 0; f <= frames; f++) {
    step(f / frames);
    if (f === frames) for (let k = 0; k < settle; k++) step(1);
    const fr = pack(); seq.push(fr);
    if (onFrame) onFrame(f, frames, fr);
  }
  // métricas del estado final
  const st = E.map(([a, b], e) => Math.abs(Math.hypot(X[0][b] - X[0][a], X[1][b] - X[1][a], X[2][b] - X[2][a]) - L0[e]) / L0[e]).sort((a, b) => a - b);
  let gap = 0;
  for (const [i, j, k, w] of pairs) gap = Math.max(gap, Math.hypot(...[0, 1, 2].map(c => (1 - w) * X[c][j] + w * X[c][k] - X[c][i])));
  const metrics = { mean: st.reduce((a, b) => a + b, 0) / st.length, p95: st[Math.floor(0.95 * (st.length - 1))], max: st[st.length - 1], gap: gap / hm };
  const zd = new Array(nb).fill(Infinity);
  if (centers) { for (let i = 0; i < nb; i++) for (const { s0, ext } of centers) { let d = s[i] - s0; d = ((d + P / 2) % P + P) % P - P / 2; if (d >= -1e-9 && d <= ext + 1e-9) zd[i] = Math.min(zd[i], d / ext); } }
  else for (let i = 0; i < nb; i++) if (s[i] <= P / 2 + 1e-9) zd[i] = s[i] / (P / 2);
  const liftPts = opt.liftF && liftIds ? liftIds : dual ? (() => { let iBn = 0; for (let k = 0; k < nb; k++) if (Math.abs(s[k] - liftBt) < Math.abs(s[iBn] - liftBt)) iBn = k; return [sid(0), sid(iBn), ...dual.lift2(iBn)]; })() : null;
  if (dual && dual.two) return { liftPts, marksM: null, V, F, nb: dual.no, s, P, pairs, seq, metrics, poly, zd: dual.zd1, hole: null, extraSeams: dual.extraSeams, extraLoops: dual.extraLoops, P2: dual.P2 };
  const dc = dual && opt.dual.centersF ? centersAbs(opt.dual.centersF, P) : null;
  const marksM = dc ? dc.map(c => sid(nearestS(s, c.s0))).concat(dc.map(c => dual.n1 + dual.no + nearestS(s, c.s0)))
    : opt.centersF && centers ? centers.map(c => sid(nearestS(s, c.s0))) : null;
  if (dual) return { liftPts, marksM, V, F, nb: dual.no, s, P, pairs, seq, metrics, poly, zd, hole: { off: dual.no, n: nb, inner: false, idx: null }, extraSeams: dual.extraSeams, extraLoops: dual.extraLoops };
  return { liftPts: opt.liftF && liftIds ? liftIds : undefined, V, F, nb: hole ? input.length : nb, s, P, pairs, seq, metrics, poly, zd, hole: hole || shared ? { off, n: nb, inner: solidSeam, idx: shared ? opt.seamIdx : null } : null, extraSeams: outerSeam ? [outerSeam] : undefined, marksM: marksM ? marksM.concat(outerSeam && outerSeam.marks ? outerSeam.marks : []) : outerSeam && outerSeam.marks ? outerSeam.marks : null };
}

if (typeof module !== 'undefined') module.exports = { cornersOf, catmullRom, resampleOpen, outlineFromHalf, polygonFromA, boundaryFromA, pathCum, pathAt, signedArea, simulate, isSimple };


