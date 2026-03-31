;(function (W, D, C) {
  'use strict';

  /* ── state ─────────────────────────────────────────────────── */
  var _tripped  = false;
  var _reloads  = 0;
  var _origLog  = C.log.bind(C);   // save BEFORE we noop console

  /* ── lockdown screen ───────────────────────────────────────── */
  function lockdown() {
    if (_tripped) return;
    _tripped = true;

    try {
      // wipe DOM immediately so nothing can be inspected
      D.documentElement.innerHTML =
        '<body style="margin:0;height:100dvh;display:flex;flex-direction:column;' +
        'align-items:center;justify-content:center;background:#08090d;font-family:monospace">' +
        '<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<rect width="64" height="64" rx="12" fill="#08090d"/>' +
        '<line x1="14" y1="12" x2="50" y2="52" stroke="url(#g)" stroke-width="7" stroke-linecap="round"/>' +
        '<line x1="50" y1="12" x2="14" y2="52" stroke="url(#g)" stroke-width="7" stroke-linecap="round"/>' +
        '<defs><linearGradient id="g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">' +
        '<stop stop-color="#6e5cff"/><stop offset="1" stop-color="#0ff4c6"/></linearGradient></defs></svg>' +
        '<p style="margin:24px 0 8px;color:#6e5cff;font-size:1rem;letter-spacing:.05em">SECURITY VIOLATION</p>' +
        '<p style="margin:0;color:rgba(255,255,255,.3);font-size:.75rem">Inspection tools are not allowed</p>' +
        '</body>';
    } catch (e) {}

    /* reload loop — keeps looping so the console cannot stay open */
    function loop() {
      _reloads++;
      try { W.location.reload(true); } catch (e) {}
      setTimeout(loop, 400);
    }
    setTimeout(loop, 600);
  }

  /* ── detection method 1: window size delta ─────────────────── */
  /* Works for DevTools docked to side or bottom                  */
  function sizeCheck() {
    return (
      W.outerWidth  - W.innerWidth  > 160 ||
      W.outerHeight - W.innerHeight > 160
    );
  }

  /* ── detection method 2: console.log toString (Chrome/Edge) ── */
  /* When the console panel is OPEN, Chrome evaluates the object  */
  /* and calls its toString — we hook that to detect inspection   */
  var _probe = /x/;
  _probe.toString = lockdown;

  /* ── detection method 3: debugger timing ───────────────────── */
  /* A debugger statement pauses execution when DevTools is open  */
  /* causing measurable elapsed time vs. near-zero when closed    */
  function debuggerCheck() {
    var t = D.timeline ? 0 : +new Date();
    /* jshint ignore:start */
    debugger; // eslint-disable-line no-debugger
    /* jshint ignore:end */
    return +new Date() - t > 80;
  }

  /* ── override console ──────────────────────────────────────── */
  var _noop = function () {};
  var _methods = [
    'log','debug','info','warn','error','table','dir','dirxml',
    'assert','group','groupCollapsed','groupEnd','count','countReset',
    'clear','time','timeEnd','timeLog','timeStamp','trace',
    'profile','profileEnd'
  ];
  _methods.forEach(function (m) {
    try { C[m] = _noop; } catch (e) {}
  });

  /* ── periodic guard ────────────────────────────────────────── */
  var _tick = 0;
  setInterval(function () {
    _tick++;

    /* rotate checks so they don't all fire at once */
    if (_tick % 1 === 0 && sizeCheck())      { lockdown(); return; }
    if (_tick % 2 === 0 && debuggerCheck())  { lockdown(); return; }

    /* console toString probe — use saved _origLog so Chrome evaluates it */
    _origLog(_probe);
    try { C.clear(); } catch (e) {}   // keep native console empty
  }, 1000);

  /* ── block devtools keyboard shortcuts ─────────────────────── */
  D.addEventListener('keydown', function (e) {
    var k  = e.key  || '';
    var kU = k.toUpperCase();
    var ct = e.ctrlKey || e.metaKey;
    var sh = e.shiftKey;

    /* F12 */
    if (k === 'F12') { e.preventDefault(); e.stopPropagation(); return false; }

    /* Ctrl/Cmd + Shift + I / J / C / K / M (DevTools panels) */
    if (ct && sh && /^[IJCKM]$/.test(kU)) {
      e.preventDefault(); e.stopPropagation(); return false;
    }

    /* Ctrl/Cmd + U (View Source) */
    if (ct && kU === 'U') { e.preventDefault(); e.stopPropagation(); return false; }

    /* Ctrl/Cmd + S (Save page as) */
    if (ct && kU === 'S' && !sh) { e.preventDefault(); e.stopPropagation(); return false; }

    /* Ctrl/Cmd + P (Print — can expose source) */
    if (ct && kU === 'P' && !sh) { e.preventDefault(); e.stopPropagation(); return false; }

  }, true);

  /* ── block right-click everywhere except inputs ─────────────── */
  D.addEventListener('contextmenu', function (e) {
    var tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return; // allow paste menu in fields
    e.preventDefault();
  }, true);

  /* ── block drag (prevents file drag-out extraction) ─────────── */
  D.addEventListener('dragstart', function (e) {
    var tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    e.preventDefault();
  }, true);

  /* ── prevent opening in iframe (clickjacking) ───────────────── */
  try {
    if (W.top !== W.self) { W.top.location = W.self.location; }
  } catch (e) {
    W.location.href = 'about:blank';
  }

  /* ── disable text selection outside editable elements ──────── */
  /* We inject CSS rather than JS so it doesn't break inputs      */
  var _style = D.createElement('style');
  _style.textContent =
    '*:not(input):not(textarea):not([contenteditable]):not([contenteditable] *)' +
    '{ -webkit-user-select:none!important; user-select:none!important; }' +
    'input,textarea,[contenteditable]{ -webkit-user-select:text!important; user-select:text!important; }';
  D.head && D.head.appendChild(_style);

}(window, document, console));
