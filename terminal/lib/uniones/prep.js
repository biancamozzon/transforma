

/* TRANS-FORMA · Curva libre — del dibujo a la entrada del motor (misma función en la página y en node).
   op: 'A' unión del borde · 'B' solo sutura · 'C' sutura + unión en la misma lámina · 'D' dos láminas.
   Regla: c(s_A + t) ≡ c(s_A − t), t ∈ [0, ext], con ext = extensión · P/2. B siempre a P/2 de A. */
(function (root) {
  const isNode = typeof require !== 'undefined' && typeof module !== 'undefined';
  const E = isNode ? require('./core_curva.js') : root, C = isNode ? require('./curve.js') : root.Curve;
  const BUDGET = { B: 1300, C: 1300, D: 520, E: 520 };      // vértices objetivo de malla (D: por lámina), como Cierres v2
  function areaOf(p) { return Math.abs(E.signedArea(p)); }
  function prepare(st) {
    const outerPath = C.layerPath(st.outer, st.regO).path;
    if (!outerPath || outerPath.length < 3) throw new Error('Dibujá un contorno exterior cerrado.');
    if (!E.isSimple(outerPath)) throw new Error('El contorno exterior se cruza consigo mismo. Mové los puntos hasta que la curva quede limpia.');
    const P = E.pathCum(outerPath).at(-1), div = st.div || 52;
    const ext = v => Math.max(0.05, Math.min(1, v ?? 1));
    const base = { bend: st.bend ?? 0.1, flip: !!st.flip, frames: st.frames ?? 48, iters: 80, closed: true };
    if (st.mat === 'rubber') { base.stretchW = 0.08; base.bend *= Math.pow((st.thick ?? 0.03) / 0.03, 2); }
    if (st.lift) { base.lift = st.lift; base.liftRamp = st.liftRamp !== false; }
    const op = st.op || 'A';
    if (op === 'A') {
      const input = E.boundaryFromA(outerPath, (st.uA || 0) * P, 2 * div);
      const e = ext(st.extP); if (e < 1) base.centersF = [{ f: 0, e: e / 2 }];
      return { input, opt: base, outerPath, P };
    }
    if (op === 'E') {      // dos láminas sin caladura, unidas solo por el perímetro; cada una con su A (extensión de la tesis)
      const own = !!st.own2, eP = ext(st.extP);
      let path2 = outerPath;
      if (own) {
        if (!st.outer2 || !st.outer2.pts || st.outer2.pts.length < 3) throw new Error('Falta la lámina 2: dibujala, o elegí «Copia de la 1».');
        path2 = C.layerPath(st.outer2, st.reg2).path;
        if (!E.isSimple(path2)) throw new Error('El contorno de la lámina 2 se cruza consigo mismo.');
      }
      const P2 = E.pathCum(path2).at(-1), hCap = Math.sqrt(areaOf(outerPath) / (0.866 * BUDGET.E));
      const nOut = Math.max(24, Math.round(P / hCap)), h = P / nOut;
      let outer = E.boundaryFromA(outerPath, (st.uA || 0) * P, nOut);
      const dx = outer[0][0]; outer = outer.map(p => [p[0] - dx, p[1]]);                        // A de la lámina 1 sobre el eje x = 0
      let outer2 = E.boundaryFromA(path2, (st.uA2 || 0) * P2, Math.max(24, Math.round(P2 / h)));
      if (!own) outer2 = outer2.map(p => [p[0] - dx, p[1]]);                                      // copia: mismo marco que la 1 (A de la 1 sobre x = 0)
      const mirror = st.mirror !== false;
      return { input: outer, opt: Object.assign(base, { dual2: { outer2, mirror, reflect: mirror, h, elp: eP, align: true }, iters: 50 }), outerPath, P, P2, ratio: P2 / P, shift: dx };
    }
    if (!st.hole || !st.hole.pts || st.hole.pts.length < 3) throw new Error(op === 'D' ? 'Las dos láminas necesitan una caladura: dibujala adentro del contorno.' : 'Esta operación necesita una caladura: dibujala adentro del contorno.');
    const holePath = C.layerPath(st.hole, st.regH).path;
    if (!E.isSimple(holePath)) throw new Error('La caladura se cruza consigo misma.');
    // la caladura tiene que quedar adentro y sin tocar el borde
    const inside = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
    if (!holePath.every(p => inside(p, outerPath))) throw new Error('La caladura tiene que quedar adentro del contorno, sin tocarlo.');
    const Ph = E.pathCum(holePath).at(-1);
    const A = areaOf(outerPath) - areaOf(holePath);
    const per = BUDGET[op], nWant = op === 'D' ? Math.max(40, Math.round(div * 0.75)) : div + 24;
    const hCap = Math.sqrt(A / (0.866 * per));
    const nh = Math.min(nWant, Math.max(24, Math.round(Ph / hCap)));
    let hole = E.boundaryFromA(holePath, (st.uAh || 0) * Ph, nh);
    const h = Ph / hole.length;
    // margen mínimo entre caladura y borde: un paso de malla
    let gap = Infinity; for (const p of holePath) for (let i = 0; i < outerPath.length; i += 2) gap = Math.min(gap, Math.hypot(p[0] - outerPath[i][0], p[1] - outerPath[i][1]));
    if (gap < 1.2 * h) throw new Error('La caladura está demasiado cerca del borde: alejala o achicala.');
    const eh = ext(st.extH), eP = ext(st.extP);
    if (op === 'D') {
      let outer = E.boundaryFromA(outerPath, (st.uA || 0) * P, Math.max(24, Math.round(P / h)));
      const dx = outer[0][0]; outer = outer.map(p => [p[0] - dx, p[1]]); hole = hole.map(p => [p[0] - dx, p[1]]);   // A del borde sobre el eje del espejo
      const dual = { hole, mirror: st.mirror !== false, h: 0, elp: eP, arc: true };
      if (eh < 1) dual.centersF = [{ f: 0, e: eh / 2 }];
      return { input: outer, opt: Object.assign(base, { dual, iters: 50 }), outerPath, holePath, P, Ph, shift: dx };
    }
    const outer = E.boundaryFromA(outerPath, (st.uA || 0) * P, Math.max(24, Math.round(P / h)));
    const opt = Object.assign(base, { hole });
    if (eh < 1) opt.centersF = [{ f: 0, e: eh / 2 }];
    if (op === 'C') { opt.outerZip = true; if (eP < 1) opt.outerCentersF = [{ f: 0, e: eP / 2 }]; }
    return { input: outer, opt, outerPath, holePath, P, Ph };
  }
  const api = { prepare, BUDGET };
  if (isNode && module.exports) module.exports = api; else root.Prep = api;
})(typeof self !== 'undefined' ? self : this);


