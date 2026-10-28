/* TRANS-FORMA · Curva libre — modelo de curva (JS puro; corre en la página y en node).
   Curva cerrada = puntos de control + marca de punta por punto.
   Sin puntas: Catmull-Rom centrípeta periódica. Con puntas: un tramo Catmull-Rom abierto entre puntas consecutivas
   (extremos por reflexión, igual que catmullRom del motor). Así la S de control (puntas en A y B) es exactamente la del artefacto. */
(function (root) {
  const core = typeof require !== 'undefined' && typeof module !== 'undefined' ? require('./core_curva.js') : root;
  const PER = 24;
  function densePath(pts, corner) {
    const n = pts.length;
    if (n < 3) return null;
    const ci = []; for (let i = 0; i < n; i++) if (corner[i]) ci.push(i);
    let out = [];
    if (!ci.length) {
      const ext = [pts[n - 1], ...pts, pts[0], pts[1]];
      out = core.catmullRom(ext, PER).slice(PER, PER * (n + 1));
    } else {
      for (let k = 0; k < ci.length; k++) {
        const a = ci[k], b = ci[(k + 1) % ci.length], run = [];
        let i = a; do { run.push(pts[i]); i = (i + 1) % n; } while (i !== b); run.push(pts[b]);
        const seg = core.catmullRom(run, PER); seg.pop(); out = out.concat(seg);
      }
    }
    // limpieza: puntos repetidos
    const clean = [];
    for (const p of out) { const q = clean[clean.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-9) clean.push(p); }
    if (clean.length > 1 && Math.hypot(clean[0][0] - clean[clean.length - 1][0], clean[0][1] - clean[clean.length - 1][1]) < 1e-9) clean.pop();
    return clean;
  }
  /* Curva → recorrido antihorario + mapeo de índices (si se invirtió) */
  function ccw(path) { return core.signedArea(path) < 0 ? [path[0], ...path.slice(1).reverse()] : path; }
  /* fracción u ∈ [0,1) del punto del recorrido más cercano a p */
  function projectU(path, p) {
    const cum = core.pathCum(path), P = cum[cum.length - 1]; let best = Infinity, bs = 0;
    for (let i = 0; i < path.length; i++) {
      const a = path[i], b = path[(i + 1) % path.length], abx = b[0] - a[0], aby = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / ((abx * abx + aby * aby) || 1)));
      const d = Math.hypot(a[0] + t * abx - p[0], a[1] + t * aby - p[1]); if (d < best) { best = d; bs = cum[i] + t * (cum[i + 1] - cum[i]); }
    }
    return { u: bs / P, d: best };
  }
  function uPoint(path, u) { const cum = core.pathCum(path); return core.pathAt(path, cum, ((u % 1) + 1) % 1 * cum[cum.length - 1]); }
  /* ── Limpieza del trazo a mano alzada: imperfecciones del pulso ──
     1) remuestreo parejo por longitud de arco;
     2) cierre: si la cola cruza la cabeza, se corta en el cruce (sobrante fuera); si no llega, se elige el par cabeza–cola
        más cercano (con un costo por recortar) y se une con un puente de Hermite tangente a los dos lados, sin quiebre;
     3) rulos: en cada autocruce la curva se parte en dos lazos y se conserva el de mayor área, hasta que quede simple. */
  function xSeg(a, b, c, d) {                 // punto de cruce propio de ab y cd, o null
    const rx = b[0] - a[0], ry = b[1] - a[1], sx = d[0] - c[0], sy = d[1] - c[1], den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-14) return null;
    const qx = c[0] - a[0], qy = c[1] - a[1], t = (qx * sy - qy * sx) / den, u = (qx * ry - qy * rx) / den;
    if (t <= 1e-9 || t >= 1 - 1e-9 || u <= 1e-9 || u >= 1 - 1e-9) return null;
    return [a[0] + t * rx, a[1] + t * ry];
  }
  function cleanStroke(stroke) {
    const fix = { closed: 'exact', trim: 0, gap: 0, loops: 0, bigLoop: false, len: 0 };
    let len = 0; for (let k = 1; k < stroke.length; k++) len += Math.hypot(stroke[k][0] - stroke[k - 1][0], stroke[k][1] - stroke[k - 1][1]);
    const n = Math.max(60, Math.min(500, Math.round(len / 0.015))), hs = len / n; fix.len = len;
    const P = core.resampleOpen(stroke, n).pts, W = Math.floor(n * 0.3), D = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    let poly, cut = null;
    for (let i = 0; i < W; i++) for (let j = n - 1; j >= n - W; j--) {
      if (j <= i + 1) continue;
      const X = xSeg(P[i], P[i + 1], P[j], P[j + 1]);
      if (X && (!cut || j - i > cut.j - cut.i)) cut = { i, j, X };
    }
    const joints = [];                          // empalmes (cortes) que quedan con quiebre: se redondean al final
    if (cut) { poly = [cut.X, ...P.slice(cut.i + 1, cut.j + 1)]; fix.closed = 'cut'; joints.push({ X: cut.X, r: 0.1 }); fix.trim = (n - (cut.j - cut.i)) * hs; }
    else {
      let bi = 0, bj = n, bc = Infinity;
      for (let i = 0; i < W; i++) for (let j = n; j > n - W; j--) { const c = D(P[i], P[j]) + 0.15 * (i + n - j) * hs; if (c < bc) { bc = c; bi = i; bj = j; } }
      const A = P[bj], B = P[bi], g = D(A, B); fix.gap = g; fix.trim = (bi + n - bj) * hs;
      poly = P.slice(bi, bj + 1);
      if (g > 0.5 * hs) {
        const u = (p, q) => { const l = D(p, q) || 1; return [(q[0] - p[0]) / l, (q[1] - p[1]) / l]; };
        const t0 = u(P[Math.max(bi, bj - 2)], A), t1 = u(B, P[Math.min(bj, bi + 2)]), k = Math.max(2, Math.ceil(g / hs));
        for (let s = 1; s < k; s++) {
          const t = s / k, h00 = 2 * t ** 3 - 3 * t * t + 1, h10 = t ** 3 - 2 * t * t + t, h01 = -2 * t ** 3 + 3 * t * t, h11 = t ** 3 - t * t;
          poly.push([h00 * A[0] + h10 * g * t0[0] + h01 * B[0] + h11 * g * t1[0], h00 * A[1] + h10 * g * t0[1] + h01 * B[1] + h11 * g * t1[1]]);
        }
        fix.closed = 'bridge';
      } else poly.pop();
    }
    for (let it = 0; it < 80; it++) {
      const q = poly.length; let hit = null;
      scan: for (let a = 0; a < q; a++) for (let b = a + 2; b < q; b++) {
        if (a === 0 && b === q - 1) continue;
        const X = xSeg(poly[a], poly[(a + 1) % q], poly[b], poly[(b + 1) % q]); if (X) { hit = { a, b, X }; break scan; }
      }
      if (!hit) break;
      const L1 = [hit.X, ...poly.slice(hit.a + 1, hit.b + 1)], L2 = [hit.X, ...poly.slice(hit.b + 1), ...poly.slice(0, hit.a + 1)];
      const A1 = Math.abs(core.signedArea(L1)), A2 = Math.abs(core.signedArea(L2));
      fix.loops++; if (Math.min(A1, A2) > 0.1 * Math.max(A1, A2)) fix.bigLoop = true;
      const drop = A1 >= A2 ? L2 : L1; let dl = 0; for (let k = 1; k < drop.length; k++) dl += D(drop[k], drop[k - 1]);
      poly = A1 >= A2 ? L1 : L2; joints.push({ X: hit.X, r: Math.max(0.1, Math.min(0.8, dl)) });
    }
    // redondeo local de cada empalme: difusión en una ventana proporcional al rulo quitado (±0,1 a ±0,5); el resto no se toca
    const q = poly.length;
    for (const { X, r } of joints) {
      const w = Math.max(3, Math.round(r / hs));
      let c = 0, cd = Infinity; poly.forEach((p, i) => { const d = D(p, X); if (d < cd) { cd = d; c = i; } });
      for (let pass = 0, np = Math.min(800, Math.ceil(w * w / 2)); pass < np; pass++) for (let k = -w; k <= w; k++) {   // ~w² pasadas: la difusión llega a toda la ventana
        const i = ((c + k) % q + q) % q, a = poly[(i - 1 + q) % q], b = poly[(i + 1) % q], f = 0.5 * (1 - Math.abs(k) / (w + 1));
        poly[i] = [poly[i][0] + f * ((a[0] + b[0]) / 2 - poly[i][0]), poly[i][1] + f * ((a[1] + b[1]) / 2 - poly[i][1])];
      }
    }
    return { poly, fix };
  }
  /* Suavizado del trazo limpio → puntos de control (Douglas–Peucker sobre el trazo remuestreado). */
  function ctrlFrom(poly, tol, passes) {
    const rs = core.resampleOpen(poly.concat([poly[0]]), Math.max(40, Math.min(400, poly.length))).pts; rs.pop();
    // suavizado por promedio móvil circular
    let P = rs;
    for (let pass = 0; pass < passes; pass++) P = P.map((p, i) => { const a = P[(i - 1 + P.length) % P.length], b = P[(i + 1) % P.length]; return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4]; });
    const dp = (pts, lo, hi, keep) => {
      let md = -1, mi = -1; const a = pts[lo], b = pts[hi];
      for (let i = lo + 1; i < hi; i++) { const p = pts[i], abx = b[0] - a[0], aby = b[1] - a[1], L = Math.hypot(abx, aby) || 1e-12;
        const d = Math.abs((p[0] - a[0]) * aby - (p[1] - a[1]) * abx) / L; if (d > md) { md = d; mi = i; } }
      if (md > tol) { keep[mi] = 1; dp(pts, lo, mi, keep); dp(pts, mi, hi, keep); }
    };
    // cerrado: partir en el punto más lejano del primero
    let far = 0; P.forEach((p, i) => { if (Math.hypot(p[0] - P[0][0], p[1] - P[0][1]) > Math.hypot(P[far][0] - P[0][0], P[far][1] - P[0][1])) far = i; });
    const keep = new Uint8Array(P.length); keep[0] = 1; keep[far] = 1;
    const ext = P.concat([P[0]]); dp(ext, 0, far, keep); dp(ext, far, P.length, keep);
    let ctrl = P.filter((_, i) => keep[i]);
    // densidad mínima para que la Catmull-Rom siga el trazo
    if (ctrl.length < 6) ctrl = core.resampleOpen(P.concat([P[0]]), 8).pts.slice(0, 8);
    return ctrl;
  }
  /* Trazo a mano alzada → puntos de control limpios. Si la curva suave resultante se cruzara, se suaviza más (hasta 6 veces).
     Devuelve el arreglo de puntos con .fix = qué se corrigió. */
  function strokeToCtrl(stroke, tol) {
    if (stroke.length < 8) return null;
    const { poly, fix } = cleanStroke(stroke);
    if (poly.length < 8 || Math.abs(core.signedArea(poly)) < 1e-4) return null;
    let ctrl = null; fix.tries = 0;
    for (let k = 0; k < 6; k++) {
      ctrl = ctrlFrom(poly, tol * Math.pow(1.6, k), 3 + 2 * k); fix.tries = k;
      const dense = densePath(ctrl, ctrl.map(() => false));
      if (dense && core.isSimple(dense)) break;
    }
    const out = core.signedArea(ctrl) < 0 ? [ctrl[0], ...ctrl.slice(1).reverse()] : ctrl;
    out.fix = fix;
    return out;
  }
  /* Texto breve de lo corregido (vacío si no hubo nada que notar). */
  function fixText(fix) {
    if (!fix) return '';
    const r = [];
    const L = fix.len || 1;                     // umbrales relativos al largo del trazo: lo que no se nota no se avisa
    if (fix.trim > 0.02 * L) r.push('recorté el sobrante del cierre');
    if (fix.closed === 'bridge' && fix.gap > 0.02 * L) r.push('cerré el hueco entre el inicio y el final');
    if (fix.loops) r.push(fix.bigLoop ? 'había un lóbulo grande cruzado: conservé el mayor' : `quité ${fix.loops === 1 ? 'un rulo' : fix.loops + ' rulos'}`);
    if (fix.tries) r.push('suavicé más para que no se cruce');
    return r.length ? 'Trazo corregido: ' + r.join(' · ') + '. Deshacé si no era lo que querías.' : '';
  }
  /* S de control: los 8 puntos de la media gota del artefacto + su rotación de 180° sobre el punto medio de AB. Puntas en A y B. */
  const S_HALF = [[0, 1.52], [-0.647, 1.445], [-1.23, 1.124], [-1.522, 0.54], [-1.304, -0.079], [-0.801, -0.521], [-0.293, -0.956], [0, -1.52]];
  function sControl() {
    const A = S_HALF[0], B = S_HALF[S_HALF.length - 1], M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    const other = S_HALF.map(p => [2 * M[0] - p[0], 2 * M[1] - p[1]]).slice(1, -1);
    const pts = S_HALF.map(p => p.slice()).concat(other), corner = pts.map((_, i) => i === 0 || i === S_HALF.length - 1);
    return { pts, corner };
  }
  /* ── Emprolijar: simetrizar + carenar, con intensidad t ∈ [0,1] ──
     1) remuestreo en N puntos parejos por longitud de arco (las puntas marcadas se fijan en su punto más cercano);
     2) objetivo simétrico S (exacto): giro 180° S_i = (c_i + 2m − c_{i+N/2})/2; espejo: eje por el centroide a ángulo θ y
        correspondencia i ⟷ k − i elegidos por mínimos cuadrados, S_i = (c_i + R c_{k−i})/2; doble eje: giro y después espejo;
     3) mezcla q = c + t (S − c);  4) carenado por difusión (alcance creciente con t, área conservada), con las puntas fijas. */
  const NREG = 400;
  function symTarget(c, sym) {
    const N = c.length; let mx = 0, my = 0; for (const p of c) { mx += p[0] / N; my += p[1] / N; }
    const rotS = a => a.map((p, i) => { const q = a[(i + N / 2) % N]; return [(p[0] + 2 * mx - q[0]) / 2, (p[1] + 2 * my - q[1]) / 2]; });
    const refl = (p, th) => { const cx = Math.cos(2 * th), sx = Math.sin(2 * th), x = p[0] - mx, y = p[1] - my; return [mx + cx * x + sx * y, my + sx * x - cx * y]; };
    const mirS = a => {
      let best = Infinity, bt = 0, bk = 0; const step = 4;
      for (let d = 0; d < 180; d++) { const th = d * Math.PI / 180;
        const r = a.map(p => refl(p, th));
        for (let k = 0; k < N; k += 2) { let s = 0; for (let i = 0; i < N && s < best; i += step) { const q = r[((k - i) % N + N) % N]; s += (a[i][0] - q[0]) ** 2 + (a[i][1] - q[1]) ** 2; } if (s < best) { best = s; bt = th; bk = k; } } }
      // refinamiento: ángulo a 0,1° y k vecino, con todos los puntos
      const full = (th, k) => { let s = 0; for (let i = 0; i < N; i++) { const q = refl(a[((k - i) % N + N) % N], th); s += (a[i][0] - q[0]) ** 2 + (a[i][1] - q[1]) ** 2; } return s; };
      let fb = full(bt, bk), ft = bt, fk = bk;
      for (let d = -10; d <= 10; d++) for (let k = bk - 3; k <= bk + 3; k++) { const th = bt + d * Math.PI / 1800, s = full(th, k); if (s < fb) { fb = s; ft = th; fk = ((k % N) + N) % N; } }
      bt = ft; bk = fk;
      const r = a.map(p => refl(p, bt));
      return { S: a.map((p, i) => { const q = r[((bk - i) % N + N) % N]; return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; }), theta: bt };
    };
    if (sym === 'rot') return { S: rotS(c), cen: [mx, my] };
    if (sym === 'mirror') { const m = mirS(c); return { S: m.S, cen: [mx, my], theta: m.theta }; }
    if (sym === 'd2') { const r = rotS(c), m = mirS(r); return { S: m.S, cen: [mx, my], theta: m.theta }; }
    return { S: c.map(p => p.slice()), cen: [mx, my] };
  }
  function regularize(path, cornerPts, reg) {
    const t = Math.max(0, Math.min(1, reg.t ?? 0.5)), N = NREG;
    const c = core.resampleOpen(path.concat([path[0]]), N).pts; c.pop();
    const pin = new Set();
    for (const cp of cornerPts || []) { let b = 0, bd = Infinity; c.forEach((p, i) => { const d = Math.hypot(p[0] - cp[0], p[1] - cp[1]); if (d < bd) { bd = d; b = i; } }); c[b] = cp.slice(); pin.add(b); }
    const T = symTarget(c, reg.sym || 'none');
    let rms = 0; for (let i = 0; i < N; i++) rms += (c[i][0] - T.S[i][0]) ** 2 + (c[i][1] - T.S[i][1]) ** 2; rms = Math.sqrt(rms / N);
    let q = c.map((p, i) => [p[0] + t * (T.S[i][0] - p[0]), p[1] + t * (T.S[i][1] - p[1])]);
    const lap = (a, w) => a.map((p, i) => { if (pin.has(i)) return p; const u = a[(i - 1 + N) % N], v = a[(i + 1) % N]; return [p[0] + w * ((u[0] + v[0]) / 2 - p[0]), p[1] + w * ((u[1] + v[1]) / 2 - p[1])]; });
    // carenado: difusión con las puntas fijas (alcance σ ≈ 0,06·N·t muestras, n = 1200 t² pasadas) y área restituida
    const areaOf = a => { let s = 0; for (let i = 0; i < N; i++) { const u = a[i], v = a[(i + 1) % N]; s += u[0] * v[1] - v[0] * u[1]; } return s / 2; };
    const A0 = areaOf(q), iters = Math.round(1200 * t * t);
    for (let k = 0; k < iters; k++) q = lap(q, 0.5);
    if (iters) {
      let per = 0; for (let i = 0; i < N; i++) per += Math.hypot(q[(i + 1) % N][0] - q[i][0], q[(i + 1) % N][1] - q[i][1]);
      const sg = Math.sign(A0) || 1, d = (A0 - areaOf(q)) * sg / per;   // desplazamiento parejo hacia afuera
      const pinArr = [...pin], w = i => { if (!pinArr.length) return 1; let m = N; for (const p of pinArr) { const dd = Math.abs(i - p); m = Math.min(m, dd, N - dd); } return Math.min(1, m / 20); };
      q = q.map((p, i) => { const u = q[(i - 1 + N) % N], v = q[(i + 1) % N], tx = v[0] - u[0], ty = v[1] - u[1], l = Math.hypot(tx, ty) || 1;
        const nx = sg * ty / l, ny = -sg * tx / l; return [p[0] + d * w(i) * nx, p[1] + d * w(i) * ny]; });
    }
    let dev = 0; for (let i = 0; i < N; i++) dev = Math.max(dev, Math.hypot(q[i][0] - c[i][0], q[i][1] - c[i][1]));
    return { path: ccw(q), orig: path, info: { sym: reg.sym, cen: T.cen, theta: T.theta, rms, dev } };
  }
  /* camino de una capa: denso, antihorario y, si está activo, emprolijado (la misma función en la página y en el cálculo) */
  function layerPath(L, reg) {
    const p = ccw(densePath(L.pts, L.corner));
    if (!reg || !reg.on) return { path: p, orig: p, info: null };
    return regularize(p, L.pts.filter((_, i) => L.corner[i]), reg);
  }
  /* sugerencia para la lámina 2: la misma forma (puntos de control y puntas), escalada alrededor de su centro para que su perímetro
     iguale al objetivo. Se itera con el camino real (emprolijado incluido) hasta 0,05 %. */
  function fitPerimeter(L, reg, targetP) {
    const perOf = M => { const c = core.pathCum(layerPath(M, reg).path); return c[c.length - 1]; };
    const cen = L.pts.reduce((s, p) => [s[0] + p[0] / L.pts.length, s[1] + p[1] / L.pts.length], [0, 0]);
    let cur = { pts: L.pts.map(p => p.slice()), corner: L.corner.slice() }, k = 1, P0 = perOf(L), P = P0;
    for (let it = 0; it < 8 && Math.abs(P / targetP - 1) > 5e-4; it++) {
      const f = targetP / P; k *= f;
      cur = { pts: cur.pts.map(p => [cen[0] + (p[0] - cen[0]) * f, cen[1] + (p[1] - cen[1]) * f]), corner: cur.corner };
      P = perOf(cur);
    }
    return { layer: cur, k, P0, P };
  }
  const api = { densePath, ccw, projectU, uPoint, strokeToCtrl, cleanStroke, fixText, sControl, S_HALF, regularize, layerPath, symTarget, fitPerimeter };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Curve = api;
})(typeof self !== 'undefined' ? self : this);
