// Content script: floating 🐷 button + full-height right sidebar on any page.
// Click toggles the sidebar; its left edge drags to resize (width persisted via
// chrome.storage.local). The sidebar is an iframe of the extension's own
// panel.html, so auth/state live in the extension origin, consistent across
// sites. Plain JS, copied verbatim by Vite publicDir — no bundling.
(function () {
  if (window.top !== window) return;          // top frame only
  if (document.getElementById('tdbk-host')) return;

  var MIN_W = 300;
  var DEFAULT_W = 380;
  var BTN_GAP = 10;
  function maxW() { return Math.min(760, Math.round(window.innerWidth * 0.92)); }
  function clampW(w) { return Math.max(MIN_W, Math.min(maxW(), w)); }

  var host = document.createElement('div');
  host.id = 'tdbk-host';
  var shadow = host.attachShadow({ mode: 'open' });
  (document.documentElement || document.body).appendChild(host);

  var style = document.createElement('style');
  style.textContent = [
    '.btn{position:fixed;top:96px;right:14px;z-index:2147483647;width:42px;height:42px;',
    'border-radius:50%;background:#00804F;color:#fff;border:none;cursor:pointer;',
    'box-shadow:0 4px 14px rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;',
    'font-size:21px;line-height:1;padding:0;transition:right .18s ease;}',
    '.btn:hover{filter:brightness(1.07);}',
    '.panel{position:fixed;top:0;right:0;height:100vh;z-index:2147483646;',
    'background:#fff;box-shadow:-4px 0 24px rgba(0,0,0,.18);',
    'transform:translateX(102%);transition:transform .18s ease;display:flex;}',
    '.panel.open{transform:translateX(0);}',
    '.panel.dragging{transition:none;}',
    '.grip{width:6px;flex:0 0 6px;cursor:ew-resize;background:transparent;position:relative;}',
    '.grip:hover,.grip.active{background:rgba(0,128,79,.35);}',
    '.grip::after{content:"";position:absolute;top:50%;left:1px;width:4px;height:44px;',
    'margin-top:-22px;border-radius:2px;background:rgba(0,0,0,.18);}',
    '.panel iframe{flex:1;height:100%;border:0;display:block;min-width:0;}',
  ].join('');
  shadow.appendChild(style);

  var panel = document.createElement('div');
  panel.className = 'panel';
  var grip = document.createElement('div');
  grip.className = 'grip';
  grip.title = '拖曳調整寬度';
  var iframe = document.createElement('iframe');
  iframe.allow = 'clipboard-write';
  panel.appendChild(grip);
  panel.appendChild(iframe);
  shadow.appendChild(panel);

  var btn = document.createElement('button');
  btn.className = 'btn';
  btn.title = 'To Do Bank';
  btn.textContent = '🐷';
  shadow.appendChild(btn);

  var width = DEFAULT_W;
  var open = false;
  var loaded = false;

  function applyWidth() {
    width = clampW(width);
    panel.style.width = width + 'px';
    btn.style.right = open ? (width + BTN_GAP) + 'px' : '14px';
  }

  try {
    chrome.storage.local.get({ tdbkWidth: DEFAULT_W }, function (v) {
      width = clampW(Number(v.tdbkWidth) || DEFAULT_W);
      applyWidth();
    });
  } catch { /* storage unavailable — keep default */ }
  applyWidth();

  btn.addEventListener('click', function () {
    open = !open;
    panel.classList.toggle('open', open);
    btn.textContent = open ? '✕' : '🐷';
    if (open && !loaded) {
      iframe.src = chrome.runtime.getURL('panel.html');
      loaded = true;
    }
    applyWidth();
  });

  // ── resize by dragging the left edge ──
  grip.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    grip.setPointerCapture(e.pointerId);
    grip.classList.add('active');
    panel.classList.add('dragging');
    iframe.style.pointerEvents = 'none'; // don't let the iframe eat the drag

    function onMove(ev) {
      width = clampW(window.innerWidth - ev.clientX);
      applyWidth();
    }
    function onUp(ev) {
      grip.releasePointerCapture(ev.pointerId);
      grip.classList.remove('active');
      panel.classList.remove('dragging');
      iframe.style.pointerEvents = '';
      grip.removeEventListener('pointermove', onMove);
      grip.removeEventListener('pointerup', onUp);
      grip.removeEventListener('pointercancel', onUp);
      try { chrome.storage.local.set({ tdbkWidth: width }); } catch { /* ignore */ }
    }
    grip.addEventListener('pointermove', onMove);
    grip.addEventListener('pointerup', onUp);
    grip.addEventListener('pointercancel', onUp);
  });

  // keep within bounds when the window shrinks
  window.addEventListener('resize', applyWidth);
})();
