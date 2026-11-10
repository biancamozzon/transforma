/* TRANS-FORMA_V2 · © Bianca Mozzon (Blanca Mozzon) · pantalla de celular (hasta 820 px de ancho).
   1) Cabecera compacta: marca y botón ⚙ en una línea, pestañas debajo; tema, «Explicaciones» y «Acerca de» se despliegan con ⚙.
   2) En cada herramienta, los paneles que flotan sobre el volumen (Caladura, Lámina chica, Puntos) quedan plegados y se abren
      con una columna de íconos en el ángulo superior derecho de la vista 3D (uno abierto por vez; tocar de nuevo lo cierra).
      Un ícono más agranda o achica la vista 3D.
   3) Debajo de «Encuadrar», una flecha achica la vista 3D a una franja fija arriba de la pantalla, para trabajar el 2D con el volumen
      siempre a la vista; la flecha de la franja la vuelve a ampliar (09/11/2026, pedido de Bianca).
   No toca ningún motor ni ningún panel: solo los muestra u oculta. En pantallas de más de 820 px todo queda como estaba. */
(function () {
  'use strict';
  const Q = '(max-width: 820px)';

  /* ── 1 · cabecera ── */
  (function cabecera() {
    const bar = document.querySelector('header.bar'), prefs = bar && bar.querySelector('.prefs'), brand = bar && bar.querySelector('.brand');
    if (!bar || !prefs || !brand) return;
    const st = document.createElement('style'); st.id = 'tf-movil-css';
    st.textContent = '.tfm-gear{display:none}'
      + '@media ' + Q + '{'
      + '.bar{flex-wrap:wrap;gap:0 8px;padding-top:6px}'
      + '.brand{order:1;flex:1 1 auto;padding-bottom:4px}.brand b{font-size:17px}'
      + '.tfm-gear{order:2;display:grid;place-items:center;width:34px;height:34px;margin-bottom:4px;padding:0;border-radius:50%;border:1px solid var(--line);background:transparent;color:var(--ink);font-size:17px;line-height:1;cursor:pointer}'
      + '.tfm-gear[aria-expanded="true"]{background:var(--ink);color:var(--panel);border-color:var(--ink)}'
      + 'nav[role=tablist]{order:3;flex:1 1 100%}'
      + 'nav button{font-size:13.5px;padding:6px 10px 8px}'
      + '.prefs{order:4;flex:1 1 100%;margin-left:0;padding:6px 0 8px;border-top:1px solid var(--line)}'
      + 'body:not(.tfm-prefs) .prefs{display:none}'
      + '}';
    document.head.appendChild(st);
    const g = document.createElement('button'); g.type = 'button'; g.className = 'tfm-gear'; g.textContent = '⚙';
    g.setAttribute('aria-label', 'Tema, explicaciones y acerca de'); g.title = 'Tema, explicaciones y «Acerca de»'; g.setAttribute('aria-expanded', 'false');
    g.addEventListener('click', () => {
      const on = document.body.classList.toggle('tfm-prefs'); g.setAttribute('aria-expanded', String(on));
      for (const f of document.querySelectorAll('#stage iframe')) try { f.contentWindow.dispatchEvent(new Event('resize')); } catch (e) {}
    });
    brand.after(g);
  })();

  /* ── 2 · dentro de cada herramienta ── */
  const CSS = `/* TRANS-FORMA_V2 · © Bianca Mozzon (Blanca Mozzon) · paneles plegables sobre el volumen en el celular */
.tfm-rail { display: none; }
.tfm-strip-btn { display: none; }
@media ${Q} {
  #view .tfm-rail { position: absolute; top: 6px; right: 6px; z-index: 7; display: flex; flex-direction: column; gap: 6px; }
  #view .tfm-rail button { width: 38px; height: 38px; min-height: 0; padding: 0; border-radius: 50%; display: grid; place-items: center;
    background: var(--panel); color: var(--ink); border: 1px solid var(--line); box-shadow: 0 2px 8px rgba(0,0,0,.18); cursor: pointer; }
  #view .tfm-rail button[hidden] { display: none; }
  #view .tfm-rail button[aria-pressed="true"] { background: var(--ink); color: var(--panel); border-color: var(--ink); }
  #view .tfm-rail svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
  #view .tfm-shut { display: none !important; }
  #view .tfm-open { position: absolute !important; top: 6px !important; right: 52px !important; left: auto !important; bottom: auto !important;
    transform: none !important; z-index: 6 !important; max-height: calc(100% - 64px); overflow: auto; overscroll-behavior: contain;
    box-shadow: 0 6px 20px rgba(0,0,0,.28); }
  #view .tfm-open.tfp-ref { flex-wrap: wrap; max-width: calc(100% - 64px); }
  #view .tfm-open.tfp-hole .m { max-width: 170px; }
  #view .side3d.tfm-open .s3-head { cursor: default; }
  #view .side3d.tfm-open .s3-head::before { display: none; }
  html.tfm-big #view { aspect-ratio: auto !important; height: 72dvh !important; min-height: 260px !important; }
  #view .pin-bar { top: auto !important; bottom: 58px; left: 8px; right: 52px; z-index: 6; gap: 3px 8px; padding: 4px 6px 4px 10px; font-size: 10.5px; }
  /* franja fija arriba */
  .tfm-strip-btn { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 0 14px 12px; min-height: 40px; }
  .tfm-strip-btn svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  html.tfm-strip .tfm-stripped { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; z-index: 40 !important; margin: 0 !important;
    border-radius: 0 0 var(--r) var(--r) !important; box-shadow: 0 6px 18px rgba(0,0,0,.28); display: block !important; }
  html.tfm-strip .tfm-stripped > :not(#view):not(.tfm-strip-btn) { display: none !important; }
  html.tfm-strip .tfm-stripped #view { height: 30dvh !important; min-height: 170px !important; max-height: 300px !important; aspect-ratio: auto !important; }
  html.tfm-strip .tfm-stripped .tfm-strip-btn { position: absolute; left: 8px; bottom: 8px; z-index: 8; margin: 0; width: 38px; height: 38px; min-height: 0; padding: 0; border-radius: 50%;
    background: var(--panel); box-shadow: 0 2px 8px rgba(0,0,0,.2); }
  html.tfm-strip .tfm-stripped .tfm-strip-btn span { display: none; }
  html.tfm-strip body { padding-top: calc(min(max(30dvh, 170px), 300px) + 14px) !important; }
  html.tfm-strip #view .tfm-rail button.tfm-bigbtn { display: none; }
}
@media (min-width: 821px) { .tfm-strip-btn { display: none !important; } }`;
  const ICON = {
    hole: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="6"/><ellipse cx="12" cy="12" rx="4.5" ry="3"/></svg>',
    chica: '<svg viewBox="0 0 24 24"><circle cx="10" cy="13" r="7"/><path d="M15.5 4.5l4 4-4 4-4-4z"/></svg>',
    pts: '<svg viewBox="0 0 24 24"><path d="M4 18c4-9 12-9 16 0"/><circle cx="4" cy="18" r="1.8"/><circle cx="12" cy="11.3" r="1.8"/><circle cx="20" cy="18" r="1.8"/></svg>',
    big: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7"/></svg>',
    small: '<svg viewBox="0 0 24 24"><path d="M19 11h-6V5M13 11l7-7M5 13h6v6M11 13l-7 7"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  };
  const INNER = `(function () {
  'use strict';
  const view = document.getElementById('view'); if (!view || view.__tfm) return; view.__tfm = true;
  const mq = matchMedia(${JSON.stringify(Q)}), ICON = ${JSON.stringify(ICON)};
  const P = [
    { k: 'hole', sel: '.tfp-hole', lab: () => 'Caladura' },
    { k: 'chica', sel: '#side3d', lab: el => { const h = el.querySelector('.s3-head'); const t = h && h.textContent.trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Lámina chica'; } },
    { k: 'pts', sel: '.tfp-ref', lab: () => 'Puntos A, B, C, D' },
  ];
  let open = null;
  const rail = document.createElement('div'); rail.className = 'tfm-rail'; rail.setAttribute('role', 'toolbar'); rail.setAttribute('aria-label', 'Paneles del volumen');
  for (const p of P) { const b = document.createElement('button'); b.type = 'button'; b.dataset.k = p.k; b.hidden = true; b.innerHTML = ICON[p.k]; b.setAttribute('aria-pressed', 'false'); rail.appendChild(b); p.b = b; }
  const big = document.createElement('button'); big.type = 'button'; big.innerHTML = ICON.big; big.setAttribute('aria-label', 'Agrandar la vista 3D'); big.title = 'Agrandar la vista 3D';
  big.classList.add('tfm-bigbtn'); rail.appendChild(big); view.appendChild(rail);
  /* franja fija arriba: botón con flecha debajo de la fila de «Encuadrar» */
  const fit = document.getElementById('fit'), pane = view.closest('.pane');
  if (fit && pane) {
    const row = fit.closest('.tools') || fit.parentElement, sb = document.createElement('button'); sb.type = 'button'; sb.className = 'tfm-strip-btn';
    const setSB = on => { sb.innerHTML = (on ? ICON.down : ICON.up) + '<span>' + (on ? 'Ampliar la vista 3D' : 'Achicar la vista 3D y fijarla arriba') + '</span>';
      const t = on ? 'Ampliar la vista 3D' : 'Achicar la vista 3D a una franja fija arriba'; sb.setAttribute('aria-label', t); sb.title = t; sb.setAttribute('aria-pressed', String(on)); };
    setSB(false); row.after(sb); pane.classList.add('tfm-stripped');
    sb.addEventListener('click', () => { const on = document.documentElement.classList.toggle('tfm-strip');
      if (on && document.documentElement.classList.contains('tfm-big')) big.click();
      setSB(on); resize(); setTimeout(resize, 250);
      if (!on) requestAnimationFrame(() => pane.scrollIntoView({ block: 'nearest' })); });
  }
  const el = p => view.querySelector(p.sel);
  const resize = () => { requestAnimationFrame(() => dispatchEvent(new Event('resize'))); };
  big.addEventListener('click', () => { const on = document.documentElement.classList.toggle('tfm-big');
    big.innerHTML = on ? ICON.small : ICON.big; const t = on ? 'Achicar la vista 3D' : 'Agrandar la vista 3D'; big.setAttribute('aria-label', t); big.title = t;
    big.setAttribute('aria-pressed', String(on)); resize(); setTimeout(resize, 250); });
  rail.addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; open = open === b.dataset.k ? null : b.dataset.k; sync(); });
  function sync() {
    const m = mq.matches;
    for (const p of P) { const x = el(p);
      if (!x) { p.b.hidden = true; if (open === p.k) open = null; continue; }
      const avail = !x.hidden;
      p.b.hidden = !avail; if (!avail && open === p.k) open = null;
      const on = m && open === p.k;
      x.classList.toggle('tfm-shut', m && !on); x.classList.toggle('tfm-open', on);
      const lab = p.lab(x); p.b.setAttribute('aria-label', (on ? 'Plegar ' : 'Abrir ') + lab); p.b.title = lab; p.b.setAttribute('aria-pressed', String(on)); }
  }
  setInterval(sync, 400); mq.addEventListener ? mq.addEventListener('change', sync) : mq.addListener(sync); sync();
})();`;
  const put = f => { try {
    const d = f.contentDocument; if (!d || !d.head || !d.getElementById('view')) return;
    if (!d.getElementById('tf-movil-css')) { const s = d.createElement('style'); s.id = 'tf-movil-css'; s.textContent = CSS; d.head.appendChild(s); }
    if (!d.getElementById('tf-movil-js')) { const s = d.createElement('script'); s.id = 'tf-movil-js'; s.textContent = INNER; d.body.appendChild(s); }
  } catch (e) {} };
  const hook = f => { f.addEventListener('load', () => { put(f); setTimeout(() => put(f), 1500); }); put(f); };
  const stage = document.getElementById('stage'); if (!stage) return;
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.tagName === 'IFRAME') hook(n); }).observe(stage, { childList: true });
  for (const f of stage.querySelectorAll('iframe')) hook(f);
})();
