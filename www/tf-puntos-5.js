/* TRANS-FORMA_V2 · © Bianca Mozzon (Blanca Mozzon) · puntos A, B, C, D movibles en el volumen, deshacer / rehacer junto al plano y, en Curva libre, volver a la ubicación guardada de los puntos o guardar la nueva, mover / escalar la caladura (X, Y, Z) respecto del contorno, «Lienzo a 0» y paneo del 3D con Shift + clic derecho.
   Se suma a Cierres, Curva libre y Unión por tramos sin tocar ningún motor: cada herramienta recibe un gancho (window.__tfp) al final
   de su propio código, y una capa de interfaz común. Mover un punto = fijar su altura (dirección espacial del vértice, tesis pág. 50)
   con el mismo tirón que ya usa cada herramienta; el cierre se recalcula entero. Si un ancla no se encuentra, esa herramienta queda
   como estaba (sin la función nueva). */
(function () {
  'use strict';
  /* ── mover la pantalla en el 3D (paneo), en las cinco herramientas: clic derecho y arrastrar, Shift + clic derecho (como en Rhino)
     o Shift + clic izquierdo. Las vistas usan OrbitControls: el clic derecho ya paneaba, pero con Shift giraba; acá Shift + derecho
     también panea (al evento se le saca el Shift antes de que llegue a la vista). ── */
  (function panRhino() {
    const stage = document.getElementById('stage'); if (!stage) return;
    const put = f => { try { const d = f.contentDocument; if (!d || d.__tfPan) return; d.__tfPan = true;
      d.addEventListener('pointerdown', e => { if (e.button === 2 && e.shiftKey && e.target && e.target.tagName === 'CANVAS') { try { Object.defineProperty(e, 'shiftKey', { value: false }); } catch (x) {} } }, true);
      d.addEventListener('mousedown', e => { if (e.button === 2 && e.shiftKey && e.target && e.target.tagName === 'CANVAS') { try { Object.defineProperty(e, 'shiftKey', { value: false }); } catch (x) {} } }, true);
      d.addEventListener('contextmenu', e => { if (e.target && e.target.tagName === 'CANVAS') e.preventDefault(); }, true); } catch (e) {} };
    const hook = f => { f.addEventListener('load', () => put(f)); put(f); };
    new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.tagName === 'IFRAME') hook(n); }).observe(stage, { childList: true });
    for (const f of stage.querySelectorAll('iframe')) hook(f);
  })();
  const PG = window.PAGES; if (!PG) return;
  const once = (h, a, b) => { const i = h.indexOf(a); if (i < 0 || h.indexOf(a, i + a.length) >= 0) return null; return h.slice(0, i) + b + h.slice(i + a.length); };
  const all = (h, a, b) => h.split(a).join(b);

  /* ── capa de interfaz común (corre dentro de cada herramienta) ── */
  const UI = String.raw`(function () {
  'use strict';
  const T = window.__tfp; if (!T) return;
  const $ = id => document.getElementById(id), view = T.view, TH = T.THREE;
  const st = document.createElement('style'); st.id = 'tf-puntos-css';
  st.textContent = '.tfp-pop{position:absolute;z-index:7;display:flex;align-items:center;gap:5px;padding:4px 5px 4px 10px;border-radius:999px;background:var(--panel);border:1px solid var(--line);box-shadow:0 4px 14px rgba(0,0,0,.18);font-family:var(--font-data,monospace);font-size:11px;color:var(--ink);transform:translate(-50%,calc(-100% - 14px));white-space:nowrap;touch-action:none}'
    + '.tfp-pop[hidden]{display:none!important}.tfp-pop b{font-weight:600;color:var(--seam)}'
    + '.tfp-pop button{font:inherit;font-size:11.5px;min-height:26px;padding:2px 10px;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}'
    + '.tfp-pop button.on{background:var(--seam);border-color:var(--seam);color:var(--panel)}.tfp-pop button.ar{padding:2px 7px}.tfp-pop button.x{border:0;padding:2px 6px;color:var(--muted)}'
    + '.tfp-pop output{min-width:7ch;text-align:center;font-variant-numeric:tabular-nums}.tfp-pop .msg{color:var(--muted);white-space:normal;max-width:220px}'
    + '#view.tfp-moving canvas{cursor:ns-resize!important}'
    + '.tfp-ur{position:relative;height:0;z-index:3}.tfp-ur>div{position:absolute;left:8px;bottom:8px;display:flex;gap:4px}'
    + '.tfp-ur button{width:30px;height:30px;min-height:0;padding:0;border-radius:50%;display:grid;place-items:center;font-size:15px;line-height:1;background:var(--panel);border:1px solid var(--line);color:var(--ink);cursor:pointer}'
    + '.tfp-ur button:disabled{opacity:.35;cursor:default}'
    + '.tfp-ur button.z0{width:auto;border-radius:999px;padding:0 10px;font-family:var(--font-data,monospace);font-size:11px}.tfp-ur button.z0.on{background:var(--seam);border-color:var(--seam);color:var(--panel)}'
    + '.tfp-ref{position:absolute;left:12px;bottom:58px;z-index:4;display:flex;align-items:center;gap:4px;padding:3px 4px 3px 10px;border-radius:999px;background:var(--panel);border:1px solid var(--line);font-family:var(--font-data,monospace);font-size:10.5px;color:var(--muted)}'
    + '.tfp-ref button{font:inherit;font-size:11px;min-height:26px;padding:2px 9px;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}'
    + '.tfp-ref button:disabled{opacity:.4;cursor:default}'
    + '.tfp-hole{position:absolute;left:8px;top:50%;transform:translateY(-50%);z-index:3;display:grid;grid-template-columns:auto 28px 5ch 28px;align-items:center;gap:3px 2px;padding:6px 6px 6px 8px;border-radius:14px;background:var(--panel);border:1px solid var(--line);font-family:var(--font-data,monospace);font-size:10.5px;color:var(--muted)}'
    + '.tfp-hole[hidden]{display:none!important}.tfp-hole .h{grid-column:1/-1;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;text-align:center;padding-bottom:2px}'
    + '.tfp-hole .l{font-size:10px;letter-spacing:.06em;text-transform:uppercase;padding-right:4px}.tfp-hole output{color:var(--ink);text-align:center;font-variant-numeric:tabular-nums}.tfp-hole output[data-o=z]{cursor:pointer}'
    + '.tfp-hole button{width:28px;height:28px;min-height:0;padding:0;border-radius:50%;display:grid;place-items:center;font-size:14px;line-height:1;background:transparent;border:1px solid var(--line);color:var(--ink);cursor:pointer}.tfp-hole button:disabled{opacity:.35;cursor:default}'
    + '.tfp-hole .m{grid-column:1/-1;max-width:150px;white-space:normal;color:var(--seam);font-size:10px}.tfp-hole .m:empty{display:none}';
  document.head.appendChild(st);

  /* ── deshacer / rehacer chiquitos en el ángulo inferior izquierdo del plano ── */
  const ed = $('editor');
  let H = null;   // historia propia (Cierres no tenía): fotos del estado cada vez que cambia y el puntero está suelto
  if (T.snap) {
    H = { list: [T.snap()], i: 0, busy: false, down: 0 };
    addEventListener('pointerdown', () => { H.down++; }, true); addEventListener('pointerup', () => { H.down = 0; }, true); addEventListener('pointercancel', () => { H.down = 0; }, true);
    setInterval(() => { if (H.busy || H.down) return; let s; try { s = T.snap(); } catch (e) { return; } if (s === H.list[H.i]) return;
      H.list.splice(H.i + 1); H.list.push(s); if (H.list.length > 120) H.list.shift(); H.i = H.list.length - 1; }, 350);
  }
  const go = d => {
    if (H) { const j = H.i + d; if (j < 0 || j >= H.list.length) return; H.busy = true; H.i = j;
      try { T.restore(H.list[j]); H.list[j] = T.snap(); } catch (e) { console.warn('tf-puntos', e); } H.busy = false; return; }
    if (T.undo) { d < 0 ? T.undo() : T.redo(); return; }
    const b = $(d < 0 ? 'undoBtn' : 'redoBtn'); if (b && !b.disabled) b.click();
  };
  const canGo = d => H ? (d < 0 ? H.i > 0 : H.i < H.list.length - 1) : T.canUndo ? (d < 0 ? T.canUndo() : T.canRedo()) : !!($(d < 0 ? 'undoBtn' : 'redoBtn') && !$(d < 0 ? 'undoBtn' : 'redoBtn').disabled);
  if (ed) {
    const w = document.createElement('div'); w.className = 'tfp-ur';
    w.innerHTML = '<div><button type="button" data-d="-1" aria-label="Deshacer" title="Deshacer (Ctrl/⌘ + Z)">↶</button><button type="button" data-d="1" aria-label="Rehacer" title="Rehacer (Ctrl/⌘ + Shift + Z)">↷</button></div>';
    if (T.zero) { const z = document.createElement('button'); z.type = 'button'; z.className = 'z0'; z.textContent = 'Lienzo a 0';
      z.title = 'Vacía el plano: borra contorno, caladura y láminas, y vuelve los puntos a su lugar. Se puede deshacer.';
      let armed = 0; z.addEventListener('click', () => { if (!armed) { armed = setTimeout(() => { armed = 0; z.textContent = 'Lienzo a 0'; z.classList.remove('on'); }, 2500); z.textContent = '¿Vaciar? tocá de nuevo'; z.classList.add('on'); return; }
        clearTimeout(armed); armed = 0; z.textContent = 'Lienzo a 0'; z.classList.remove('on'); try { T.zero(); } catch (e) { console.warn('tf-puntos', e); } });
      w.firstChild.appendChild(z); }
    ed.after(w);
    const bs = [...w.querySelectorAll('button[data-d]')]; for (const b of bs) b.addEventListener('click', () => go(+b.dataset.d));
    setInterval(() => { for (const b of bs) b.disabled = !canGo(+b.dataset.d); }, 300);
    if (H) document.addEventListener('keydown', e => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return; const t = e.target; if (t && (t.tagName === 'INPUT' && t.type === 'text' || t.tagName === 'TEXTAREA')) return;
      const k = e.key.toLowerCase(); if (k === 'z' && !e.shiftKey) { e.preventDefault(); go(-1); } else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); go(1); } });
  }

  /* ── ubicación de los puntos A, B, C, D (a lo largo de cada curva y su altura): volver a la guardada o guardar la nueva.
     Si nunca se guardó, la de referencia es la que tenían al abrir la herramienta. ── */
  if (view && T.ptsGet) {
    const KEYR = 'tf-ptsref-' + T.kind; let ref = null;
    try { ref = localStorage.getItem(KEYR); } catch (e) {}
    try { if (!ref) ref = T.ptsGet(); } catch (e) {}
    const box = document.createElement('div'); box.className = 'tfp-ref'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Ubicación de los puntos');
    box.innerHTML = '<span>Puntos</span><button type="button" data-r="back" title="Vuelve A, B, C, D a la ubicación guardada (a lo largo de la curva y en altura). Se puede deshacer.">↺ Original</button><button type="button" data-r="save" title="La ubicación actual de A, B, C, D pasa a ser la original (queda guardada en este navegador).">Guardar ubicación</button>';
    view.appendChild(box);
    const [bBack, bSave] = box.querySelectorAll('button'), say = t => { try { T.say && T.say(t); } catch (e) {} box.dataset.msg = t; box.title = t; };
    bBack.addEventListener('click', () => { let c; try { c = T.ptsGet(); } catch (e) { return; } if (!ref || c === ref) return; try { T.ptsSet(ref); say('Volví A, B, C, D a la ubicación guardada. «Deshacer» la trae de nuevo.'); } catch (e) { say('No pude volver los puntos: ' + ((e && e.message) || e)); } });
    bSave.addEventListener('click', () => { try { ref = T.ptsGet(); localStorage.setItem(KEYR, ref); say('Guardé la ubicación actual de A, B, C, D como la original.'); } catch (e) { say('Guardé la ubicación solo en esta sesión (el navegador no deja guardar).'); } });
    setInterval(() => { let c = null; try { c = T.ptsGet(); } catch (e) {} const same = c === ref; bBack.disabled = same; bSave.disabled = same; }, 400);
  }

  /* ── caladura (ELI) en relación al contorno: tamaño, X, Y en el plano y Z (altura) en el volumen ── */
  if (view && T.holeState) {
    const hb = document.createElement('div'); hb.className = 'tfp-hole'; hb.setAttribute('role', 'group'); hb.setAttribute('aria-label', 'Caladura respecto del contorno'); hb.hidden = true;
    const row = (lab, k, a, b, ta, tb) => '<span class="l">' + lab + '</span><button type="button" data-k="' + k + '" data-v="' + a + '" aria-label="' + ta + '" title="' + ta + '">' + (k === 's' ? '−' : k === 'x' ? '←' : '↓') + '</button><output data-o="' + k + '"></output><button type="button" data-k="' + k + '" data-v="' + b + '" aria-label="' + tb + '" title="' + tb + '">' + (k === 's' ? '+' : k === 'x' ? '→' : '↑') + '</button>';
    hb.innerHTML = '<span class="h">caladura</span>' + row('tam', 's', 1 / 1.05, 1.05, 'Achicar la caladura 5 %', 'Agrandar la caladura 5 %') + row('X', 'x', -0.05, 0.05, 'Correr la caladura 0,05 módulo a la izquierda', 'Correr la caladura 0,05 módulo a la derecha')
      + row('Y', 'y', -0.05, 0.05, 'Correr la caladura 0,05 módulo hacia abajo (en el plano)', 'Correr la caladura 0,05 módulo hacia arriba (en el plano)') + row('Z', 'z', -0.1, 0.1, 'Bajar la caladura 0,1 módulo respecto del contorno', 'Subir la caladura 0,1 módulo respecto del contorno')
      + '<span class="m" data-o="m"></span>';
    view.appendChild(hb);
    const out = k => hb.querySelector('[data-o="' + k + '"]'), msg = t => { out('m').textContent = t || ''; };
    hb.addEventListener('click', e => { const b = e.target.closest('button'), o = e.target.closest('output'); let err = null;
      try { if (b) err = T.holeXf(b.dataset.k, +b.dataset.v); else if (o && o.dataset.o === 'z') err = T.holeXf('z', null); } catch (x) { err = 'No pude: ' + ((x && x.message) || x); }
      msg(err); });
    setInterval(() => { let on = false, S = null; try { on = T.holeOn(); S = on ? T.holeState() : null; } catch (e) {} hb.hidden = !S; if (!S) return;
      out('s').textContent = S.w.toFixed(2); out('x').textContent = S.cx.toFixed(2); out('y').textContent = S.cy.toFixed(2);
      const zb = hb.querySelectorAll('[data-k="z"]'), zo = out('z'); for (const b of zb) b.disabled = !T.holeZok;
      zo.textContent = S.z ? (S.z > 0 ? '+' : '') + S.z.toFixed(2) : 'libre'; zo.title = (S.z ? 'Fijada respecto del contorno. Tocá para dejarla libre.' : 'Libre: el motor decide.') + (Number.isFinite(S.zNow) ? ' Lograda: ' + S.zNow.toFixed(2) + ' mód.' : ''); }, 400);
  }

  /* ── puntos del volumen: tocar uno abre la ventanita «Mover»; con «Mover» se arrastra hacia arriba o hacia abajo ── */
  if (!view || !T.canvas || !TH) return;
  const pop = document.createElement('div'); pop.className = 'tfp-pop'; pop.hidden = true; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Mover punto');
  view.appendChild(pop);
  const COARSE = matchMedia('(pointer: coarse)').matches, R = COARSE ? 26 : 16;
  let cur = null;   // { i, v, name, p0: Vector3, dy, moving, ghost, line }
  const v3 = () => new TH.Vector3();
  const scr = p => { const r = T.canvas.getBoundingClientRect(), q = p.clone().project(T.camera); return { x: (q.x + 1) / 2 * r.width, y: (1 - q.y) / 2 * r.height, z: q.z }; };
  const marks = () => { try { return (T.marks() || []).filter(m => m && m.visible !== false && m.parent); } catch (e) { return []; } };
  function vertexOf(p) { const g = T.geo(); if (!g) return -1; const a = g.attributes.position.array; let b = -1, bd = Infinity;
    for (let i = 0; i < a.length / 3; i++) { const d = (a[3 * i] - p.x) ** 2 + (a[3 * i + 1] - p.y) ** 2 + (a[3 * i + 2] - p.z) ** 2; if (d < bd) { bd = d; b = i; } } return b; }
  function nameOf(i, v) { try { if (T.label) { const s = T.label(v, i); if (s) return s; } if (T.names) { const n = T.names(); if (n && n[i]) return n[i]; } } catch (e) {} return T.generic || ('ABCDEFGH'[i] || 'Punto'); }
  function close() { if (cur) { for (const o of [cur.ghost, cur.line]) if (o && o.parent) o.parent.remove(o); } cur = null; pop.hidden = true; view.classList.remove('tfp-moving'); }
  function render() {
    if (!cur) return;
    const free = cur.free;
    pop.innerHTML = '<span>' + (free ? '<b>' + cur.name + '</b>' : '<b>' + cur.name + '</b>') + '</span>'
      + (cur.msg ? '<span class="msg">' + cur.msg + '</span><button type="button" class="x" data-a="x" aria-label="Cerrar">✕</button>'
      : !cur.moving ? '<button type="button" data-a="mv">Mover</button><button type="button" class="x" data-a="x" aria-label="Cerrar">✕</button>'
      : '<button type="button" class="ar" data-a="dn" aria-label="Bajar 0,05 módulo">↓</button><output>' + (cur.dy >= 0 ? '+' : '−') + Math.abs(cur.dy).toFixed(2) + '</output><button type="button" class="ar" data-a="up" aria-label="Subir 0,05 módulo">↑</button>'
        + '<button type="button" class="on" data-a="ok"' + (Math.abs(cur.dy) < 1e-6 ? ' disabled' : '') + '>Aplicar</button><button type="button" class="x" data-a="x" aria-label="Cancelar">✕</button>');
    pop.title = cur.moving ? 'Arrastrá en el volumen hacia arriba o hacia abajo; al soltar se recalcula. En módulos.' : '';
  }
  function place() {
    if (cur) { const p = cur.p0.clone(); p.y += cur.dy; const s = scr(p); pop.style.left = s.x + 'px'; pop.style.top = s.y + 'px';
      if (cur.ghost) { cur.ghost.position.copy(p); cur.ghost.visible = cur.moving && Math.abs(cur.dy) > 1e-6; }
      if (cur.line) { const a = cur.line.geometry.attributes.position.array; a.set([cur.p0.x, cur.p0.y, cur.p0.z, p.x, p.y, p.z]); cur.line.geometry.attributes.position.needsUpdate = true; cur.line.visible = cur.ghost.visible; } }
    requestAnimationFrame(place);
  }
  requestAnimationFrame(place);
  function open(m, i) {
    close(); if (T.prepare) T.prepare();
    const p0 = m.getWorldPosition(v3()), v = vertexOf(p0);
    cur = { i, v, p0, dy: 0, moving: false, name: nameOf(i, v), msg: '' };
    try { const why = T.can ? T.can(i, v) : null; if (why) cur.msg = why; } catch (e) {}
    const mat = new TH.MeshBasicMaterial({ color: getComputedStyle(document.documentElement).getPropertyValue('--seam').trim() || '#c2412d', transparent: true, opacity: 0.6, depthTest: false });
    cur.ghost = new TH.Mesh(new TH.SphereGeometry(0.05, 16, 12), mat); cur.ghost.renderOrder = 9; cur.ghost.visible = false;
    const lg = new TH.BufferGeometry(); lg.setAttribute('position', new TH.BufferAttribute(new Float32Array(6), 3));
    cur.line = new TH.Line(lg, new TH.LineDashedMaterial({ color: mat.color, dashSize: 0.04, gapSize: 0.03, depthTest: false })); cur.line.renderOrder = 9; cur.line.visible = false;
    (m.parent || T.scene).add(cur.ghost, cur.line);
    pop.hidden = false; render();
  }
  function apply() {
    if (!cur || Math.abs(cur.dy) < 1e-6) return; const c = cur; let err = null;
    try { err = T.apply(c.i, c.v, c.dy); } catch (e) { err = 'No se pudo mover: ' + ((e && e.message) || e); }
    if (err) { c.msg = err; c.moving = false; view.classList.remove('tfp-moving'); render(); return; }
    close();
  }
  pop.addEventListener('pointerdown', e => e.stopPropagation());
  pop.addEventListener('click', e => {
    const a = e.target.closest('button'); if (!a || !cur) return; const k = a.dataset.a;
    if (k === 'x') close();
    else if (k === 'mv') { cur.moving = true; view.classList.add('tfp-moving'); render(); }
    else if (k === 'up' || k === 'dn') { cur.dy = Math.round((cur.dy + (k === 'up' ? 0.05 : -0.05)) * 100) / 100; render(); }
    else if (k === 'ok') apply();
  });
  let down = null, drag = null;
  view.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !e.target.closest || !e.target.closest('canvas')) return;
    if (cur && cur.moving) {   // arrastre vertical: la cámara queda quieta
      e.stopPropagation(); e.preventDefault();
      const a = scr(cur.p0), b = scr(cur.p0.clone().add(new TH.Vector3(0, 1, 0))), ppu = Math.max(8, Math.hypot(b.x - a.x, b.y - a.y));
      drag = { y: e.clientY, dy0: cur.dy, ppu }; try { T.canvas.setPointerCapture(e.pointerId); } catch (x) {}
      return;
    }
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
  }, true);
  view.addEventListener('pointermove', e => { if (!drag || !cur) return; e.stopPropagation();
    cur.dy = Math.max(-2, Math.min(2, Math.round((drag.dy0 - (e.clientY - drag.y) / drag.ppu) * 100) / 100)); render(); }, true);
  const up = e => {
    if (drag) { drag = null; e.stopPropagation(); if (cur && Math.abs(cur.dy) > 1e-6) apply(); return; }
    if (!down) return; const d = down; down = null;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || performance.now() - d.t > 700) return;
    try { if (T.ready && !T.ready()) return; } catch (x) { return; }
    const r = T.canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, ms = marks();
    let best = -1, bd = R;
    ms.forEach((m, i) => { const s = scr(m.getWorldPosition(v3())); if (s.z > 1) return; const dd = Math.hypot(s.x - x, s.y - y); if (dd < bd) { bd = dd; best = i; } });
    if (best >= 0) open(ms[best], (T.marks() || []).indexOf(ms[best])); else if (cur && !cur.moving) close();
  };
  view.addEventListener('pointerup', up, true); view.addEventListener('pointercancel', () => { down = null; drag = null; }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && cur) close(); });
  window.__tfpUI = { open: i => { const m = (T.marks() || [])[i]; if (m) open(m, i); }, get cur() { return cur; }, apply, setDy: v => { if (cur) { cur.moving = true; cur.dy = v; render(); } }, close };
})();`;

  function addUI(k) { const h = PG[k], end = h.lastIndexOf('</body>'); if (end < 0) return false; PG[k] = h.slice(0, end) + '<script id="tf-puntos">\n' + UI + '\n<\/script>\n' + h.slice(end); return true; }
  function hook(k, anchor, code, before) {
    if (typeof PG[k] !== 'string') return false;
    const h2 = once(PG[k], anchor, before ? code + anchor : anchor + code);
    if (!h2) { try { console.warn('tf-puntos: no encontré el ancla de ' + k); } catch (e) {} return false; }
    PG[k] = h2; return addUI(k);
  }

  /* ── Cierres: altura por punto con los mismos controles «Altura de A y B» (y de cada inicio) ── */
  hook('cierres', '\nsetShape(shape); compute();\n', `
try { window.__tfp = { kind: 'cierres', THREE, scene, camera, controls, canvas: renderer.domElement, view: $('view'),
  marks: () => marks, geo: () => geo, ready: () => !!result && !!geo, names: () => liftNames(),
  can(i) { return i < liftKeys().length ? null : 'Este punto no tiene altura propia en esta figura.'; },
  apply(i, v, dY) {
    const ks = liftKeys(); if (i >= ks.length) return 'Este punto no tiene altura propia en esta figura.';
    const sg = flip ? -1 : 1, hs = liftHeights(result);
    if (!$('liftOn').checked) { $('liftOn').checked = true; buildLiftMul(); ks.forEach((k, q) => { if (Number.isFinite(hs[q])) $(k).value = hs[q].toFixed(2); }); }
    const base = Number.isFinite(hs[i]) ? hs[i] : +$(ks[i]).value;
    $(ks[i]).value = Math.max(-2, Math.min(2, base + sg * dY)).toFixed(2);
    if (ks[i].startsWith('liftM')) { const sp = liftSpec(); ks.forEach((k, q) => { (liftMV[shape] || (liftMV[shape] = {}))[sp[q].g + sp[q].lab] = +$(k).value; }); }
    liftUI(); changed(); return null; },
  snap: () => JSON.stringify({ shape, S: ctrl, T: tri, K: kid, CU: cu, MULTI: multi, on: $('liftOn').checked, ramp: $('liftRamp').checked, L: LIFTK.map(k => +$(k).value), M: liftMV[shape] || null }),
  restore(s) { const d = JSON.parse(s);
    ctrl = d.S; tri = d.T; Object.assign(kid, d.K); for (const k of Object.keys(cu)) delete cu[k]; Object.assign(cu, d.CU); for (const k of Object.keys(multi)) delete multi[k]; Object.assign(multi, d.MULTI);
    if (d.shape !== shape) setShape(d.shape);
    $('liftOn').checked = d.on; $('liftRamp').checked = d.ramp; LIFTK.forEach((k, q) => { $(k).value = d.L[q]; }); if (d.M) liftMV[shape] = Object.assign({}, d.M); else delete liftMV[shape];
    buildLiftMul(); liftUI(); sel = -1; drawEditor(); changed(); } }; } catch (e) { console.warn('tf-puntos cierres', e); }
`, true);

  /* ── Curva libre: altura por punto con la «Dirección» de cada vértice (ahora con su propia altura) ── */
  if (typeof PG.curva === 'string') {
    let h = PG.curva;
    // dirección del vértice con altura propia: la flecha muestra el signo; el valor guardado es la altura / «cuánto»
    h = all(h, '[[0, 1, -1].indexOf(dirOf(sd.L, k))]', '[[0, 1, -1].indexOf(Math.sign(dirOf(sd.L, k)))]');
    h = all(h, 'Array.isArray(d[k]) ? d[k].slice(0, 4).map(v => v > 0 ? 1 : v < 0 ? -1 : 0) : []', 'Array.isArray(d[k]) ? d[k].slice(0, 4).map(v => Number.isFinite(v) ? v : 0) : []');
    let zOK = false;   // motor: altura de la caladura respecto del contorno (opt.holeZ); probado en node (B, C: llega a ±0,40 pedido ±0,40)
    { const A1 = 'const centers = opt.centers || (opt.centersF && !dual ? centersAbs(opt.centersF, P) : null);', A2 = 'if (liftIds) {';
      const B1 = '// altura de la caladura respecto del contorno (opt.holeZ, módulos): un tirón parejo (peso 1) traslada todo el anillo de la costura\n  // en altura sin deformarlo, hasta que su altura media quede holeZ por encima (o por debajo) de la altura media del contorno; crece con el cierre\n  let zRing = null, zOut = null; const wZ = 1;\n  if (Number.isFinite(opt.holeZ) && opt.holeZ && hole && !opt.dual2) {\n    zRing = []; for (let k = 0; k < nb; k++) zRing.push(sid(k));\n    zOut = []; for (let k = 0; k < input.length; k++) zOut.push(k);\n    if (dual && !dual.patch && !dual.two) { for (let k = 0; k < nb; k++) zRing.push(dual.n1 + dual.no + k); for (let k = 0; k < input.length; k++) zOut.push(dual.n1 + k); }\n    for (const i of zRing) K0.add(i, i, wZ);\n  }\n  ', B2 = 'if (zRing) {\n          if (c < 2) for (const i of zRing) rhs[c][i] += wZ * X[c][i];\n          else { let zr = 0, zo = 0; for (const i of zRing) zr += X[2][i]; for (const i of zOut) zo += X[2][i]; zr /= zRing.length; zo /= zOut.length;\n            const dz = zo + (flip ? -1 : 1) * prog * opt.holeZ - zr; for (const i of zRing) rhs[2][i] += wZ * (X[2][i] + dz); }\n        }\n        ';
      const i1 = h.indexOf(A1), i2 = h.indexOf(A2);
      if (i1 > 0 && h.indexOf(A1, i1 + 1) < 0 && i2 > i1 && h.indexOf(A2, i2 + 1) < 0) { h = h.slice(0, i1) + B1 + h.slice(i1, i2) + B2 + h.slice(i2); zOK = true; } }
    if (zOK) {
      h = all(h, '  prep.ext = { P: fig.extP, H: fig.extH };', '  prep.ext = { P: fig.extP, H: fig.extH }; prep.opt.holeZ = Number.isFinite(fig.holeZ) ? fig.holeZ : 0;');
      h = all(h, 'rotX: fig.rotX, rotY: fig.rotY, rotZ: fig.rotZ });', 'rotX: fig.rotX, rotY: fig.rotY, rotZ: fig.rotZ, holeZ: fig.holeZ || 0 });');
      h = all(h, 'rotZ: fig.rotZ,\n  params:', 'rotZ: fig.rotZ, holeZ: fig.holeZ || 0,\n  params:');
      h = all(h, "for (const a of 'XYZ') fig['rot' + a] = Number.isFinite(d['rot' + a]) ? d['rot' + a] : 0;", "for (const a of 'XYZ') fig['rot' + a] = Number.isFinite(d['rot' + a]) ? d['rot' + a] : 0; fig.holeZ = Number.isFinite(d.holeZ) ? d.holeZ : 0;");
      h = all(h, 'rotZ: Number.isFinite(saved.rotZ) ? saved.rotZ : 0\n};', 'rotZ: Number.isFinite(saved.rotZ) ? saved.rotZ : 0, holeZ: Number.isFinite(saved.holeZ) ? saved.holeZ : 0\n};');
    }
    PG.curva = h;
    hook('curva', 'syncTools(); syncReg(); setOp(fig.op); drawGallery(); compute();', `
try { window.__tfp = { kind: 'curva', THREE, scene, camera, controls, canvas: renderer.domElement, view: $('view'),
  marks: () => marks, geo: () => geo, ready: () => !!result && !!geo,
  match(v) { if (!result || !result.seq) return null; const f0 = result.seq[0], dx = (result.prep && result.prep.shift) || 0; let best = null, bd = 0.12;
    for (const p of dirPoints()) { const C = pathOf(p.L); if (!C) continue; const q = Cv.uPoint(C.path, fig[SIDE[p.L].u] + p.f), d = Math.hypot(q[0] - dx - f0[3 * v], q[1] - f0[3 * v + 1]); if (d < bd) { bd = d; best = p; } }
    return best; },
  label(v) { const p = this.match(v); return p ? p.lab + ' · ' + p.name : null; },
  can(i, v) { return this.match(v) ? null : 'Este punto no tiene altura propia en esta operación.'; },
  apply(i, v, dY) { const p = this.match(v); if (!p) return 'Este punto no tiene altura propia en esta operación.';
    const f = result.seq[result.seq.length - 1], n = result.nV, sg = flip ? -1 : 1, ex = new Set((result.liftPts || []).concat([v])); let zc = 0;
    for (let j = 0; j < n; j++) if (!ex.has(j)) zc += f[3 * j + 2]; zc /= Math.max(1, n - ex.size);
    const nv = Math.max(-2, Math.min(2, sg * (f[3 * v + 2] - zc) + sg * dY)), H = fig.dirH > 0 ? fig.dirH : 0.3;
    if ($('liftOn').checked) { const dp = dirPoints(); [0, 1].forEach(k => { const q = dp[k]; if (q && dp[0] && q.L === dp[0].L && !fig[SIDE[q.L].arr].length) { const a = fig.dirs[q.L] || (fig.dirs[q.L] = []); while (a.length <= q.k) a.push(0); if (!a[q.k]) a[q.k] = (+$(k ? 'liftB' : 'liftA').value || 1e-4) / H; } }); $('liftOn').checked = false; liftUI(); }
    const a = fig.dirs[p.L] || (fig.dirs[p.L] = []); while (a.length <= p.k) a.push(0); a[p.k] = (Math.abs(nv) < 1e-4 ? 1e-4 : nv) / H;
    syncDir(); changed(); return null; },
  undo, redo, canUndo: () => hIdx > 0, canRedo: () => hIdx < hist.length - 1,
  ptsGet: () => JSON.stringify({ uA: fig.uA, uAh: fig.uAh, uA2: fig.uA2, uAp: fig.uAp, oStarts: fig.oStarts, hStarts: fig.hStarts, pStarts: fig.pStarts, qStarts: fig.qStarts, dirs: fig.dirs, dirH: fig.dirH, liftOn: $('liftOn').checked, lift: [+$('liftA').value, +$('liftB').value] }),
  ptsSet(s) { const d = JSON.parse(s);
    for (const k of ['uA', 'uAh', 'uA2', 'uAp', 'dirH']) if (Number.isFinite(d[k])) fig[k] = d[k];
    for (const k of ['oStarts', 'hStarts', 'pStarts', 'qStarts']) fig[k] = Array.isArray(d[k]) ? d[k].slice() : [];
    fig.dirs = { outer: ((d.dirs && d.dirs.outer) || []).slice(), hole: ((d.dirs && d.dirs.hole) || []).slice() };
    $('liftOn').checked = !!d.liftOn; if (Array.isArray(d.lift)) { $('liftA').value = d.lift[0]; $('liftB').value = d.lift[1]; }
    liftUI(); syncDir(); changed(); },
  say: t => status(t),
  holeOn: () => usesHole() && !!fig.hole && !!pathOf('hole'),
  holeZok: ((document.getElementById('core') || {}).textContent || '').includes('opt.holeZ'),
  holeState() { const H = pathOf('hole'); if (!H) return null; let a = 0, x = 0, y = 0, x0 = Infinity, x1 = -Infinity; const P = H.path;
    for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length], c = p[0] * q[1] - q[0] * p[1]; a += c; x += (p[0] + q[0]) * c; y += (p[1] + q[1]) * c; x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); }
    let zNow = null; if (result && result.hole && result.seq && result.op === fig.op) { const f = result.seq[result.seq.length - 1], no = result.nb, off = result.hole.off, nh = result.hole.n; let zo = 0, zh = 0;
      for (let k = 0; k < no; k++) zo += f[3 * k + 2]; for (let k = 0; k < nh; k++) zh += f[3 * (off + k) + 2]; zNow = (flip ? -1 : 1) * (zh / nh - zo / no); }
    return { cx: x / (3 * a), cy: y / (3 * a), w: x1 - x0, z: Number.isFinite(fig.holeZ) ? fig.holeZ : 0, zNow }; },
  holeXf(kind, v) {
    if (kind === 'z') { const S = this.holeState(); let z = Number.isFinite(fig.holeZ) && fig.holeZ ? fig.holeZ : (S && Number.isFinite(S.zNow) ? Math.round(S.zNow * 10) / 10 : 0);
      fig.holeZ = v === null ? 0 : Math.max(-2, Math.min(2, Math.round((z + v) * 100) / 100)); if (v !== null && !fig.holeZ) fig.holeZ = 1e-3; changed(); return null; }
    const L = fig.hole, S = this.holeState(); if (!L || !S) return 'No hay caladura.';
    const c = [S.cx, S.cy], f = p => kind === 's' ? [c[0] + (p[0] - c[0]) * v, c[1] + (p[1] - c[1]) * v] : kind === 'x' ? [p[0] + v, p[1]] : [p[0], p[1] + v];
    const pts = L.pts.map(f), np = Cv.layerPath({ pts, corner: L.corner }, fig.reg.hole).path, O = pathOf('outer');
    const inP = (p, poly) => { let q = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) q = !q; } return q; };
    if (O && !np.every(p => inP(p, O.path))) return 'Así la caladura saldría del contorno.';
    if (np.some(p => Math.abs(p[0]) > 2.45 || Math.abs(p[1]) > 2.45)) return 'Así la caladura saldría del plano.';
    const nl = { pts: pts.map(p => [+p[0].toFixed(5), +p[1].toFixed(5)]), corner: L.corner.slice() };
    if (L.canon) { const cn = Object.assign({}, L.canon); if (kind === 's') { cn.w *= v; cn.cx = c[0] + ((cn.cx || 0) - c[0]) * v; cn.cy = c[1] + ((cn.cy || 0) - c[1]) * v; } else if (kind === 'x') cn.cx = (cn.cx || 0) + v; else cn.cy = (cn.cy || 0) + v; nl.canon = cn; }
    fig.hole = nl; cache = {}; if (layer === 'hole' && tool === 'shape') syncShape(); changed(); return null; },
  zero() {   // lienzo a 0: sin dibujos, puntos en su lugar inicial, sin alturas ni giros; la operación y los parámetros de cálculo quedan
    if (worker) { worker.terminate(); worker = null; }
    fig.outer = fig.hole = fig.outer2 = fig.patch = null; fig.own2 = false; fig.uA = fig.uAh = fig.uA2 = fig.uAp = 0;
    fig.oStarts = []; fig.hStarts = []; fig.pStarts = []; fig.qStarts = []; fig.dirs = { outer: [], hole: [] }; fig.raiseP = fig.rotX = fig.rotY = fig.rotZ = 0; fig.holeZ = 0;
    $('liftOn').checked = false; liftUI(); $('sheet2').value = 'copy'; sug = null; strokeNote = '';
    layer = 'outer'; tool = 'draw'; sel = -1; building = []; stroke = null; hover = null;
    result = null; group.clear(); $('ov').textContent = '—'; $('err').hidden = true; $('busy').hidden = true;
    for (const k of ['mP', 'mVT', 'mMean', 'mP95', 'mMax', 'mGap', 'mT']) if ($(k)) $(k).textContent = '—';
    $('verdict').textContent = '—'; $('verdict').className = 'pill';
    syncSide(); syncReg(); syncDir(); syncTools(); setOp(fig.op); changed(); status('Lienzo en 0: sin dibujos y con los puntos en su lugar. «Deshacer» lo trae de vuelta.'); } }; } catch (e) { console.warn('tf-puntos curva', e); }
`, true);
  }

  /* ── Unión por tramos: el punto se fija con el mismo pedido «Mover puntos en 3D» (pins), solo en altura ── */
  hook('tramos', "view.addEventListener('pointerup', endPick, true);", `
try { window.__tfp = { kind: 'tramos', THREE, scene, camera, controls, canvas: renderer.domElement, view, generic: 'Punto de los tramos',
  marks: () => marks, geo: () => geo, ready: () => !!result && !!geo && !picking,
  prepare() { if (+$('morph').value !== 1000) { $('morph').value = 1000; stopPlay(); frame(); } },
  apply(i, v, dY) { if (picking) return 'Apagá «Mover puntos en 3D» para usar esta ventanita.'; const a = geo.attributes.position.array, p0 = new THREE.Vector3(a[3 * v], a[3 * v + 1], a[3 * v + 2]);
    pdrag = { i: v, p0, p: p0.clone().add(new THREE.Vector3(0, dY, 0)) }; endPick(); return null; } }; } catch (e) { console.warn('tf-puntos tramos', e); }
`, true);
})();
