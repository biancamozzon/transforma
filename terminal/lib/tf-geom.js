/* TRANS-FORMA · © Bianca Mozzon (Blanca Mozzon) · geometría de exportación (JS puro: corre en la página y en node).
   No toca el motor: recibe vértices y triángulos ya calculados y arma los archivos.
   Convención de salida: milímetros, Z hacia arriba (Rhino, Fusion, slicers). */
(function (root) {
  'use strict';

  /* posiciones en coordenadas de la lámina para la fracción u ∈ [0,1] de la transición
     (misma interpolación lineal entre fotogramas que usa la vista) */
  function frameAt(seq, nV, u) {
    const nF = seq.length - 1, f = Math.max(0, Math.min(1, u)) * nF, i0 = Math.floor(f), i1 = Math.min(nF, i0 + 1), w = f - i0;
    const a = seq[i0], b = seq[i1], out = new Float64Array(3 * nV);
    for (let i = 0; i < 3 * nV; i++) out[i] = a[i] * (1 - w) + b[i] * w;
    return out;
  }

  /* apoyar en el piso (z mínima = 0) y centrar en planta; escalar a mm */
  function placeMM(pos, nV, mm) {
    let cx = 0, cy = 0, mz = Infinity;
    for (let i = 0; i < nV; i++) { cx += pos[3 * i] / nV; cy += pos[3 * i + 1] / nV; mz = Math.min(mz, pos[3 * i + 2]); }
    const out = new Float64Array(3 * nV);
    for (let i = 0; i < nV; i++) { out[3 * i] = (pos[3 * i] - cx) * mm; out[3 * i + 1] = (pos[3 * i + 1] - cy) * mm; out[3 * i + 2] = (pos[3 * i + 2] - mz) * mm; }
    return out;
  }

  /* componentes conexas de la malla (Clase D / E: dos láminas) */
  function components(F, nV) {
    const par = new Int32Array(nV); for (let i = 0; i < nV; i++) par[i] = i;
    const find = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    for (const [a, b, c] of F) { const ra = find(a), rb = find(b), rc = find(c); par[rb] = ra; par[find(rc)] = ra; }
    const ids = new Map(), comp = new Int32Array(nV).fill(-1);
    const used = new Uint8Array(nV); for (const f of F) for (const v of f) used[v] = 1;
    for (let i = 0; i < nV; i++) if (used[i]) { const r = find(i); if (!ids.has(r)) ids.set(r, ids.size); comp[i] = ids.get(r); }
    return { comp, n: ids.size };
  }

  /* lámina plana: (x, y) del estado inicial, z = 0. Si hay varias láminas se ponen lado a lado, separadas. */
  function flatLayout(V0, F, nV, mm, gapMM) {
    const { comp, n } = components(F, nV), out = new Float64Array(3 * nV);
    const lo = Array.from({ length: n }, () => [Infinity, Infinity]), hi = Array.from({ length: n }, () => [-Infinity, -Infinity]);
    for (let i = 0; i < nV; i++) { const k = comp[i]; if (k < 0) continue; const x = V0[2 * i], y = V0[2 * i + 1];
      lo[k][0] = Math.min(lo[k][0], x); lo[k][1] = Math.min(lo[k][1], y); hi[k][0] = Math.max(hi[k][0], x); hi[k][1] = Math.max(hi[k][1], y); }
    const off = []; let x0 = 0; const gap = gapMM == null ? 10 : gapMM;
    for (let k = 0; k < n; k++) { off.push([x0 - lo[k][0] * mm, -lo[k][1] * mm]); x0 += (hi[k][0] - lo[k][0]) * mm + gap; }
    for (let i = 0; i < nV; i++) { const k = Math.max(0, comp[i]), o = off[k] || [0, 0]; out[3 * i] = V0[2 * i] * mm + o[0]; out[3 * i + 1] = V0[2 * i + 1] * mm + o[1]; out[3 * i + 2] = 0; }
    return { pos: out, n };
  }

  /* bordes libres de la malla: aristas con un solo triángulo, encadenadas en lazos cerrados */
  function boundaryLoops(F) {
    const cnt = new Map(), key = (a, b) => a < b ? a + ',' + b : b + ',' + a;
    for (const [a, b, c] of F) for (const [p, q] of [[a, b], [b, c], [c, a]]) { const k = key(p, q); cnt.set(k, (cnt.get(k) || 0) + 1); }
    const next = new Map();
    for (const [a, b, c] of F) for (const [p, q] of [[a, b], [b, c], [c, a]]) if (cnt.get(key(p, q)) === 1) next.set(p, q);
    const seen = new Set(), loops = [];
    for (const s of next.keys()) {
      if (seen.has(s)) continue;
      const L = []; let v = s;
      while (v !== undefined && !seen.has(v)) { seen.add(v); L.push(v); v = next.get(v); }
      if (L.length > 2) loops.push(L);
    }
    return loops;
  }

  function vertexNormals(pos, F, nV) {
    const nr = new Float64Array(3 * nV);
    for (const [a, b, c] of F) {
      const ux = pos[3 * b] - pos[3 * a], uy = pos[3 * b + 1] - pos[3 * a + 1], uz = pos[3 * b + 2] - pos[3 * a + 2];
      const vx = pos[3 * c] - pos[3 * a], vy = pos[3 * c + 1] - pos[3 * a + 1], vz = pos[3 * c + 2] - pos[3 * a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const v of [a, b, c]) { nr[3 * v] += nx; nr[3 * v + 1] += ny; nr[3 * v + 2] += nz; }
    }
    for (let i = 0; i < nV; i++) { const L = Math.hypot(nr[3 * i], nr[3 * i + 1], nr[3 * i + 2]) || 1; nr[3 * i] /= L; nr[3 * i + 1] /= L; nr[3 * i + 2] /= L; }
    return nr;
  }

  /* sólido con espesor t (mm): caras ±t/2 sobre la normal y cantos en todos los bordes libres.
     flat = true: la lámina plana se extruye de z = 0 a z = t (lista para imprimir acostada). */
  function thicken(pos, F, nV, t, flat) {
    const nr = flat ? null : vertexNormals(pos, F, nV), P = new Float64Array(6 * nV);
    for (let i = 0; i < nV; i++) for (let c = 0; c < 3; c++) {
      const p = pos[3 * i + c];
      if (flat) { P[3 * i + c] = c === 2 ? t : p; P[3 * (nV + i) + c] = c === 2 ? 0 : p; }
      else { P[3 * i + c] = p + 0.5 * t * nr[3 * i + c]; P[3 * (nV + i) + c] = p - 0.5 * t * nr[3 * i + c]; }
    }
    const T = [];
    for (const [a, b, c] of F) { T.push([a, b, c], [nV + a, nV + c, nV + b]); }
    for (const L of boundaryLoops(F)) for (let k = 0; k < L.length; k++) { const a = L[k], b = L[(k + 1) % L.length]; T.push([a, nV + a, b], [b, nV + a, nV + b]); }
    if (!flat) {                        // si el piso quedó por debajo de 0 al engordar, se vuelve a apoyar
      let mz = Infinity; for (let i = 0; i < 2 * nV; i++) mz = Math.min(mz, P[3 * i + 2]);
      for (let i = 0; i < 2 * nV; i++) P[3 * i + 2] -= mz;
    }
    return { P, T };
  }

  function objText(pos, F, nV, header) {
    const out = ['# ' + header, '# TRANS-FORMA · © Bianca Mozzon (Blanca Mozzon)', '# unidades: mm · Z hacia arriba'];
    for (let i = 0; i < nV; i++) out.push(`v ${pos[3 * i].toFixed(4)} ${pos[3 * i + 1].toFixed(4)} ${pos[3 * i + 2].toFixed(4)}`);
    for (const [a, b, c] of F) out.push(`f ${a + 1} ${b + 1} ${c + 1}`);
    return out.join('\n') + '\n';
  }

  function stlBinary(P, T, header) {
    const nt = T.length, buf = new ArrayBuffer(84 + 50 * nt), dv = new DataView(buf), head = ('(c) Bianca Mozzon (Blanca Mozzon) - ' + (header || 'TRANS-FORMA')).slice(0, 79);
    for (let k = 0; k < head.length; k++) dv.setUint8(k, head.charCodeAt(k) & 0x7f);
    dv.setUint32(80, nt, true);
    let o = 84;
    for (const [a, b, c] of T) {
      const p = [a, b, c].map(i => [P[3 * i], P[3 * i + 1], P[3 * i + 2]]);
      const u = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]], v = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], L = Math.hypot(...n) || 1;
      for (const x of n) { dv.setFloat32(o, x / L, true); o += 4; }
      for (const q of p) for (const x of q) { dv.setFloat32(o, x, true); o += 4; }
      dv.setUint16(o, 0, true); o += 2;
    }
    return new Uint8Array(buf);
  }

  /* patrón de corte: contornos de la lámina plana + marcas de inicio (A, B, …) */
  function svgPattern(pos, loops, marks, title) {
    let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
    for (const L of loops) for (const i of L) { lo = [Math.min(lo[0], pos[3 * i]), Math.min(lo[1], pos[3 * i + 1])]; hi = [Math.max(hi[0], pos[3 * i]), Math.max(hi[1], pos[3 * i + 1])]; }
    const m = 5, W = hi[0] - lo[0] + 2 * m, H = hi[1] - lo[1] + 2 * m;
    const X = x => (x - lo[0] + m).toFixed(3), Y = y => (hi[1] - y + m).toFixed(3);       // SVG: y hacia abajo
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const paths = loops.map(L => '<path d="M' + L.map(i => X(pos[3 * i]) + ' ' + Y(pos[3 * i + 1])).join('L') + 'Z"/>').join('\n    ');
    const dots = (marks || []).map((q, k) => { const x = X(pos[3 * q.i]), y = Y(pos[3 * q.i + 1]);
      return `<circle cx="${x}" cy="${y}" r="0.8"/><text x="${(+x + 1.4).toFixed(3)}" y="${(+y - 1.2).toFixed(3)}">${esc(q.name || String.fromCharCode(65 + k))}</text>`; }).join('\n    ');
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W.toFixed(3)}mm" height="${H.toFixed(3)}mm" viewBox="0 0 ${W.toFixed(3)} ${H.toFixed(3)}">
  <title>${esc(title)}</title>
  <desc>TRANS-FORMA · © Bianca Mozzon (Blanca Mozzon)</desc>
  <g id="corte" fill="none" stroke="#000" stroke-width="0.1">
    ${paths}
  </g>
  <g id="inicios" fill="#C2412D" font-family="sans-serif" font-size="3">
    ${dots}
  </g>
</svg>
`;
  }

  /* DXF R12 (el más compatible): una POLYLINE cerrada por contorno en la capa CORTE, puntos de inicio en INICIOS */
  function dxfPattern(pos, loops, marks) {
    const o = ['999', 'TRANS-FORMA - (c) Bianca Mozzon (Blanca Mozzon)', '0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES'];
    for (const L of loops) {
      o.push('0', 'POLYLINE', '8', 'CORTE', '66', '1', '70', '1');
      for (const i of L) o.push('0', 'VERTEX', '8', 'CORTE', '10', pos[3 * i].toFixed(4), '20', pos[3 * i + 1].toFixed(4), '30', '0');
      o.push('0', 'SEQEND', '8', 'CORTE');
    }
    (marks || []).forEach((q, k) => {
      const x = pos[3 * q.i].toFixed(4), y = pos[3 * q.i + 1].toFixed(4);
      o.push('0', 'POINT', '8', 'INICIOS', '10', x, '20', y, '30', '0');
      o.push('0', 'TEXT', '8', 'INICIOS', '10', (+x + 1.4).toFixed(4), '20', (+y + 1.2).toFixed(4), '30', '0', '40', '3', '1', q.name || String.fromCharCode(65 + k));
    });
    o.push('0', 'ENDSEC', '0', 'EOF');
    return o.join('\r\n') + '\r\n';
  }

  /* .zip sin compresión (método 0) */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zipBytes(files) {
    const enc = new TextEncoder(), parts = [], central = []; let off = 0;
    for (const f of files) {
      const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name); off += 30 + name.length + data.length;
    }
    const cs = central.reduce((s, a) => s + a.length, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
    const all = [...parts, ...central, new Uint8Array(e.buffer)], n = all.reduce((s, a) => s + a.length, 0), out = new Uint8Array(n);
    let p = 0; for (const a of all) { out.set(a, p); p += a.length; }
    return out;
  }

  /* arma los archivos de un resultado del motor.
     r: { seq, F, nV, V0 (Float64Array x,y), marks: [{i, name}] }
     o: { u (transición), mm (mm por módulo), tMM (espesor en mm), base (nombre), title } */
  function volumeFiles(r, o) {
    const pos = placeMM(frameAt(r.seq, r.nV, o.u), r.nV, o.mm), base = o.base;
    const sol = thicken(pos, r.F, r.nV, o.tMM, false);
    return [
      { name: base + '_volumen_superficie.obj', data: objText(pos, r.F, r.nV, o.title + ' · volumen al ' + Math.round(o.u * 100) + ' % · superficie media') },
      { name: base + '_volumen_solido.stl', data: stlBinary(sol.P, sol.T, 'TRANS-FORMA volumen ' + o.tMM + ' mm') },
    ];
  }
  function flatFiles(r, o) {
    const { pos } = flatLayout(r.V0, r.F, r.nV, o.mm, 10), base = o.base;
    // en el plano todas las láminas se miran desde arriba: triángulos antihorarios (la lámina 2 viene dada vuelta)
    const { comp, n } = components(r.F, r.nV), area = new Float64Array(n);
    for (const [a, b, c] of r.F) area[comp[a]] += (pos[3 * b] - pos[3 * a]) * (pos[3 * c + 1] - pos[3 * a + 1]) - (pos[3 * b + 1] - pos[3 * a + 1]) * (pos[3 * c] - pos[3 * a]);
    const F = r.F.map(f => area[comp[f[0]]] < 0 ? [f[0], f[2], f[1]] : f), loops = boundaryLoops(F);
    const sol = thicken(pos, F, r.nV, o.tMM, true);
    return [
      { name: base + '_lamina_plana_corte.svg', data: svgPattern(pos, loops, r.marks, o.title + ' · lámina plana') },
      { name: base + '_lamina_plana_corte.dxf', data: dxfPattern(pos, loops, r.marks) },
      { name: base + '_lamina_plana.obj', data: objText(pos, F, r.nV, o.title + ' · lámina plana') },
      { name: base + '_lamina_plana_solido.stl', data: stlBinary(sol.P, sol.T, 'TRANS-FORMA lamina plana ' + o.tMM + ' mm') },
    ];
  }

  const api = { frameAt, placeMM, components, flatLayout, boundaryLoops, vertexNormals, thicken, objText, stlBinary, svgPattern, dxfPattern, zipBytes, crc32, volumeFiles, flatFiles };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TFGeom = api;
})(typeof self !== 'undefined' ? self : this);
