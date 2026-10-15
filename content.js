(function() {
  'use strict';

  // ---------- DARK THEME ----------
  const THEME_STORAGE_KEY = 'eld_dark_theme';

  function isDarkThemeEnabled() {
    try {
      const val = localStorage.getItem(THEME_STORAGE_KEY);
      return val === null ? true : val === 'true';
    } catch (e) {
      return true;
    }
  }

  function applyDarkTheme(enabled) {
    const root = document.documentElement;
    if (root) {
      if (enabled) {
        root.classList.add('eld-dark-theme');
      } else {
        root.classList.remove('eld-dark-theme');
      }
    }
  }

  function showThemeToast(enabled) {
    try {
      let toast = document.getElementById('eld-theme-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'eld-theme-toast';
        Object.assign(toast.style, {
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '8px 16px',
          borderRadius: '6px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '13px',
          fontWeight: '600',
          zIndex: '999999',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          pointerEvents: 'none'
        });
        (document.body || document.documentElement).appendChild(toast);
      }
      toast.textContent = enabled ? '🌙 Dark Mode: ON' : '☀️ Dark Mode: OFF';
      toast.style.backgroundColor = enabled ? '#27272a' : '#f4f4f5';
      toast.style.color = enabled ? '#fafafa' : '#18181b';
      toast.style.border = enabled ? '1px solid #3f3f46' : '1px solid #d4d4d8';
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';

      if (toast._timer) clearTimeout(toast._timer);
      toast._timer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
      }, 1500);
    } catch (e) {}
  }

  function toggleDarkTheme() {
    const nextState = !isDarkThemeEnabled();
    try {
      localStorage.setItem(THEME_STORAGE_KEY, String(nextState));
    } catch (e) {}
    applyDarkTheme(nextState);
    showThemeToast(nextState);
    console.log('[ELDAutoCheck] Dark theme:', nextState ? 'ENABLED' : 'DISABLED');
  }

  // Initialize immediately on document start to eliminate FOUC / white flash
  applyDarkTheme(isDarkThemeEnabled());
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyDarkTheme(isDarkThemeEnabled()), { once: true });
  }

  // ---------- CONFIG ----------
  const DEBUG = false; // set true for verbose hotkey logs (then reload extension)
  const HOTKEY_CHECK_INTERVAL_MS = 10000; // how often to ensure listeners (10s)
  console.log("ELDAutoCheck extension LOADING at:", new Date().toISOString());

  // Hotkey mapping (physical-key fallback + ukrainian/russian Cyrillic map)
  // Physical keys: q,w,e,a,s,d,x,c,z -> mapped to tool titles
  const KEY_TO_TITLE = {
    q: 'Create',   // Q -> Create
    w: 'Edit',     // W -> Edit
    e: 'Shift',    // E -> Shift
    a: 'Delete',   // A -> Delete
    s: 'Bulk',     // S -> Bulk
    d: 'Normalize',// D -> Normalize
    x: 'Preview',  // X -> Preview (button text)
    c: 'Save'      // C -> Save (button text)
  };

  // Keys that should still work while typing in input/textarea/contenteditable
  const ALLOW_WHEN_TYPING = new Set(['x']); // allow Preview (x/ч) while typing

  // Cyrillic fallback mapping: map Ukrainian/Russian letters to physical latin keys
  const CYR_TO_LAT = {
    'ф': 'a', 'Ф': 'a',   // ф -> A
    'і': 's', 'І': 's',   // і -> S
    'ы': 's', 'Ы': 's',   // ы -> S (Russian)
    'в': 'd', 'В': 'd',   // в -> D
    'а': 'f', 'А': 'f',   // (preserve if needed)
    'й': 'q', 'Й': 'q',   // й -> Q
    'ц': 'w', 'Ц': 'w',   // ц -> W
    'у': 'e', 'У': 'e',   // у -> E
    'я': 'z', 'Я': 'z',   // я -> Z (for transaction commit)
    'ч': 'x', 'Ч': 'x',   // ч -> X (preview)
    'с': 'c', 'С': 'c'    // с -> C (save)
  };

  // ---------- Utilities ----------
  function debugLog(...args) { if (DEBUG) console.log('[ELDAutoCheck hotkeys]', ...args); }
  function runWhenIdle(fn, timeout = 500) {
    if (window.requestIdleCallback) {
      try { requestIdleCallback(fn, { timeout }); return; } catch (e) {}
    }
    setTimeout(fn, 50);
  }

  function isElementVisible(el) {
    if (!el) return false;
    try {
      const style = window.getComputedStyle(el);
      return el.offsetParent !== null && style && style.display !== 'none' && style.visibility !== 'hidden' && !el.disabled;
    } catch (e) {
      return false;
    }
  }

  // Attempt to simulate a more "user-like" click by dispatching a sequence of events.
  // IMPORTANT: browsers do not allow creating events with isTrusted=true from script.
  // If the page rejects synthetic events based on isTrusted, this cannot be bypassed programmatically.
  function simulateUserClick(el) {
    if (!el) return false;
    try {
      // ensure focusable
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });

      // Dispatch pointer/mouse down events
      try {
        const pd = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, view: window, pointerId: 1, isPrimary: true });
        el.dispatchEvent(pd);
      } catch (e) { /* ignore if not supported */ }

      try {
        const md = new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window });
        el.dispatchEvent(md);
      } catch (e) {}

      // Instead of calling el.click() immediately (which can cause duplicate handlers),
      // schedule mouseup+click after a short delay to simulate a single human click.
      setTimeout(() => {
        try {
          const mu = new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window });
          el.dispatchEvent(mu);
          const cl = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
          el.dispatchEvent(cl);
        } catch (e) {}
      }, 80);

      // Additionally, send Enter key events in case the UI listens for keyboard activation
      setTimeout(() => {
        try {
          const kd = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true });
          el.dispatchEvent(kd);
          const ku = new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true });
          el.dispatchEvent(ku);
        } catch (e) {}
      }, 140);

      return true;
    } catch (err) {
      console.error('simulateUserClick error:', err);
      return false;
    }
  }

  // ---------- HOTKEYS ----------
  let listenersAttached = false;
  let ensureIntervalId = null;

  function normalizeKeyFromEvent(e) {
    // Prefer physical key code (layout-independent)
    if (e && e.code && typeof e.code === 'string' && e.code.startsWith('Key')) {
      return e.code.slice(3).toLowerCase();
    }
    // Fallback to character, map Cyrillic letters to Latin
    if (e && e.key && typeof e.key === 'string') {
      const k = e.key;
      if (CYR_TO_LAT[k]) return CYR_TO_LAT[k];
      if (/^[a-zA-Z]$/.test(k)) return k.toLowerCase();
    }
    return null;
  }

  function findButtonByTitle(title) {
    if (!title) return null;
    // 1) exact title match (case-insensitive)
    const sel = 'button[title]';
    const list = document.querySelectorAll(sel);
    for (const b of list) {
      const t = b.getAttribute('title') || '';
      if (t.toLowerCase() === title.toLowerCase()) return b;
    }
    // 2) icon heuristics for known titles
    const iconMap = {
      create: ['fa-plus', 'fa-plus-circle'],
      edit: ['fa-pencil', 'fa-pencil-alt'],
      shift: ['fa-arrows-h', 'fa-arrows-alt-h'],
      delete: ['fa-trash-o', 'fa-trash', 'fa-trash-o'],
      bulk: ['fa-users'],
      normalize: ['fa-magic']
    };
    const candidates = iconMap[title.toLowerCase()] || [];
    for (const cls of candidates) {
      const icon = document.querySelector('i.' + cls);
      if (icon) {
        const btn = icon.closest('button');
        if (btn) return btn;
      }
    }
    // 3) partial title match on attribute
    for (const b of list) {
      const t = b.getAttribute('title') || '';
      if (t.toLowerCase().includes(title.toLowerCase())) return b;
    }
    return null;
  }

  function findButtonByText(text) {
    if (!text) return null;
    const buttons = Array.from(document.querySelectorAll('button'));
    // exact match first (trimmed)
    for (const b of buttons) {
      const t = (b.textContent || '').trim();
      if (t === text) return b;
    }
    // then case-insensitive exact
    for (const b of buttons) {
      const t = (b.textContent || '').trim();
      if (t.toLowerCase() === text.toLowerCase()) return b;
    }
    // then includes
    for (const b of buttons) {
      const t = (b.textContent || '').trim();
      if (t.toLowerCase().includes(text.toLowerCase())) return b;
    }
    return null;
  }

  function activateButtonForKey(key) {
    const title = KEY_TO_TITLE[key.toLowerCase()];
    if (!title) return false;
    // Try title attribute / icon lookup
    let btn = findButtonByTitle(title);
    // If not found, try matching by button text
    if (!btn) btn = findButtonByText(title);
    if (!btn) { debugLog('Button not found for title/text', title); return false; }

    // If this is the Preview action, only click if the preview button is visible
    if (title.toLowerCase() === 'preview' && !isElementVisible(btn)) {
      debugLog('Preview button found but not visible — not clicking');
      return false;
    }

    // For preview, attempt a more user-like click sequence WITHOUT a synchronous fallback
    if (title.toLowerCase() === 'preview') {
      simulateUserClick(btn);
      return true;
    }

    try {
      btn.focus({ preventScroll: true });
      btn.click();
      // dispatch mouse events for apps that listen for them
      ['mousedown', 'mouseup', 'click'].forEach(type => {
        const ev = new MouseEvent(type, { bubbles: true, cancelable: true, view: window });
        btn.dispatchEvent(ev);
      });
      debugLog('Activated', title, 'for key', key);
      return true;
    } catch (err) {
      console.error('Hotkey activation error:', err);
      return false;
    }
  }

  function keyHandler(e) {
    try {
      if (e.isComposing) return;

      // Dark Theme Toggle hotkey: Alt+T / Alt+Е
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const isTKey = e.code === 'KeyT' || (e.key && (e.key.toLowerCase() === 't' || e.key.toLowerCase() === 'е'));
        if (isTKey) {
          e.preventDefault();
          e.stopPropagation();
          toggleDarkTheme();
          return;
        }
      }

      if (e.ctrlKey || e.altKey || e.metaKey) return; // ignore combos
      const t = e.target;
      const k = normalizeKeyFromEvent(e);
      if (!k) return;
      if (e.repeat) return;

      // If focus is inside an input/textarea/contentEditable and key is not allowed, ignore
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        if (!ALLOW_WHEN_TYPING.has(k)) return;
        // else allow processing of this hotkey (e.g., Preview)
      }

      // Special hotkey: 'z' (or Ukrainian 'я') triggers transaction commit processing
      if (k === 'z') {
        debugLog('Z pressed -> triggering processTransaction (commit)');
        e.preventDefault(); e.stopPropagation();
        try { runWhenIdle(() => { if (typeof processTransaction === 'function') processTransaction(); else debugLog('processTransaction not defined yet'); }); } catch (err) { console.error('Error invoking processTransaction via hotkey:', err); }
        return;
      }

      // Normal tool activations
      if (!Object.prototype.hasOwnProperty.call(KEY_TO_TITLE, k)) return;

      debugLog('Key pressed normalized:', k, 'raw key:', e.key, 'code:', e.code);
      e.preventDefault(); e.stopPropagation();
      const ok = activateButtonForKey(k);
      if (!ok) debugLog('Activation failed for', k);
    } catch (err) { console.error('Hotkey handler error:', err); }
  }

  function attachListeners() {
    if (listenersAttached) return; listenersAttached = true;
    window.addEventListener('keydown', keyHandler, true);
    document.addEventListener('keydown', keyHandler, true);
    try { (document.documentElement || document).addEventListener('keydown', keyHandler, true); } catch(e){}
    debugLog('Hotkey listeners attached');
  }

  function detachListeners() {
    if (!listenersAttached) return; listenersAttached = false;
    window.removeEventListener('keydown', keyHandler, true);
    document.removeEventListener('keydown', keyHandler, true);
    try { (document.documentElement || document).removeEventListener('keydown', keyHandler, true); } catch(e){}
    debugLog('Hotkey listeners detached');
  }

  function ensureListenersPeriodically() {
    if (ensureIntervalId) return;
    ensureIntervalId = setInterval(() => { if (!listenersAttached) { debugLog('Re-attaching hotkey listeners'); attachListeners(); } }, HOTKEY_CHECK_INTERVAL_MS);
  }

  if (window.top !== window) {
    console.warn('ELDAutoCheck: running in iframe. If hotkeys fail, set "all_frames": true in manifest and include matches for the iframe URL.');
  }

  try { attachListeners(); ensureListenersPeriodically(); } catch (err) { console.error('Failed to attach hotkey listeners:', err); }
  window.__activateButtonForKey = activateButtonForKey; window.__hotkeyMap = KEY_TO_TITLE; window.__simulateUserClick = simulateUserClick; window.__toggleDarkTheme = toggleDarkTheme; window.__isDarkThemeEnabled = isDarkThemeEnabled;

  // ---------- ELDAutoCheck UI & AUTOMATION (optimized) ----------
  function findClearSelectionButton() {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => (b.textContent || '').trim().toLowerCase().includes('clear selection')) || null;
  }

  function findSelectAllButton() {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => (b.textContent || '').trim().toLowerCase().includes('select all')) || null;
  }

  function createButton() {
    const clearSelectionButton = findClearSelectionButton();
    if (!clearSelectionButton) {
      removeButton();
      return;
    }

    let button = document.getElementById('myButton');
    if (!button) {
      button = document.createElement('button');
      button.id = 'myButton';
      button.type = 'button';
      button.innerText = 'Auto-Check HOS';
      button.className = 'btn btn-success btn-sm';
      Object.assign(button.style, {
        padding: '4px 10px',
        backgroundColor: '#28a745',
        color: '#ffffff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        marginLeft: '4px'
      });

      button.addEventListener('click', () => {
        const checkboxesToCheck = [
          'Generate Automatic Meta Data',
          'Recreate Intermediate Events',
          'Calculate Coordinates Based on Moving Events',
          'Fix Certify Events',
          'Fix Assigned and Fleet Edited Events',
          'Auto-Check HOS'
        ];
        const selectAllButton = findSelectAllButton();
        if (selectAllButton) {
          const txt = (selectAllButton.textContent || '').trim().toLowerCase();
          if (txt.includes('select all')) selectAllButton.click();
        }

        // schedule heavy work in idle time and batch it to avoid blocking
        runWhenIdle(() => {
          const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
          const tasks = [];
          checkboxes.forEach((checkbox) => {
            if (checkbox.disabled) return;
            let labelText = '';
            const label = checkbox.closest('div')?.querySelector('label') || document.querySelector(`label[for="${checkbox.id}"]`);
            if (label) labelText = label.textContent.trim(); else labelText = checkbox.nextSibling ? checkbox.nextSibling.textContent.trim() : '';
            const shouldCheck = checkboxesToCheck.some(text => labelText.includes(text));
            if (shouldCheck && !checkbox.checked) tasks.push({ checkbox, labelText });
          });

          // process in small batches
          const BATCH = 20;
          let i = 0;
          function processBatch() {
            const end = Math.min(i + BATCH, tasks.length);
            for (; i < end; i++) {
              const { checkbox } = tasks[i];
              if (checkbox.disabled) continue;
              checkbox.focus();
              const ev = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
              checkbox.dispatchEvent(ev);
            }
            if (i < tasks.length) setTimeout(processBatch, 50); // yield to main thread
          }
          processBatch();
        });
      });
    }

    // strictly place right next to Clear selection button
    if (clearSelectionButton.nextElementSibling !== button) {
      clearSelectionButton.insertAdjacentElement('afterend', button);
    }
  }

  function removeButton() {
    const b = document.getElementById('myButton');
    if (b) b.remove();
  }

  const NORMALIZE_LABELS = [
    'Generate Automatic Meta Data',
    'Recreate Intermediate Events',
    'Calculate Coordinates Based on Moving Events',
    'Fix Certify Events',
    'Fix Assigned and Fleet Edited Events'
  ];

  function isNormalizeToolVisible() {
    if (findClearSelectionButton()) return true;
    const boxes = document.querySelectorAll('input[type="checkbox"]');
    for (const checkbox of boxes) {
      const label = checkbox.closest('div')?.querySelector('label') || document.querySelector(`label[for="${checkbox.id}"]`);
      const text = label ? (label.textContent || '').trim() : (checkbox.nextSibling ? (checkbox.nextSibling.textContent || '').trim() : '');
      if (NORMALIZE_LABELS.some(s => text.includes(s))) return true;
    }
    return false;
  }

  // Debounced observer using requestIdleCallback fallback
  function monitorNormalizeTool() {
    let scheduled = null;
    const check = () => {
      scheduled = null;
      if (isNormalizeToolVisible()) {
        createButton();
      } else {
        removeButton();
      }
    };

    const onMutations = () => {
      if (scheduled) return; // debounce
      if (window.requestIdleCallback) {
        scheduled = requestIdleCallback(check, { timeout: 300 });
      } else {
        scheduled = setTimeout(check, 150);
      }
    };

    const observer = new MutationObserver(onMutations);
    observer.observe(document.body, { childList: true, subtree: true });
    // initial check
    check();
  }

  let normalizeMonitored = false;
  function startNormalizeMonitoring() {
    if (normalizeMonitored) return;
    if (!document.body) return;
    normalizeMonitored = true;
    monitorNormalizeTool();
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    startNormalizeMonitoring();
  } else {
    document.addEventListener('DOMContentLoaded', startNormalizeMonitoring, { once: true });
    window.addEventListener('load', startNormalizeMonitoring, { once: true });
  }

  // ---------- Open Transaction listener (as before, now DOES NOT auto-run processing) ----------
  function setupOpenTransactionListener() {
    const observer = new MutationObserver(() => {
      const openTransactionBtn = Array.from(document.querySelectorAll('button.btn-success, button.btn')).find(btn => (btn.textContent || '').includes('Open Transaction'));
      if (openTransactionBtn && !openTransactionBtn.dataset.listenerAdded) {
        openTransactionBtn.dataset.listenerAdded = 'true';
        openTransactionBtn.addEventListener('click', () => {
          console.log("Open Transaction clicked, checking for Fix violations -> Save modal...");
          waitAndClickContains('Fix violations', 'button.btn-tag, button.btn-sm', 100, 5000, () => {
            waitAndClickContains('Save', 'button.btn-primary', 100, 5000, () => {
              console.log('Save clicked in violations modal.');
            });
          });
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // helper: click button when its text contains a substring
  function waitAndClickContains(text, selector, interval = 100, timeout = 10000, callback = null) {
    const start = Date.now();
    const id = setInterval(() => {
      const buttons = document.querySelectorAll(selector);
      const target = Array.from(buttons).find(btn => (btn.textContent || '').trim().includes(text));
      if (target) {
        try { target.click(); } catch (e) { const ev = new MouseEvent('click', { bubbles: true, cancelable: true, view: window }); target.dispatchEvent(ev); }
        clearInterval(id);
        if (callback) callback();
        return;
      }
      if (Date.now() - start > timeout) { clearInterval(id); console.warn('waitAndClickContains timeout for', text, selector); }
    }, interval);
  }

  // existing waitAndClick kept for exact matches
  function waitAndClick(text, selector, interval = 100, callback = null) {
    const intervalId = setInterval(() => {
      const buttons = document.querySelectorAll(selector);
      const target = Array.from(buttons).find(btn => btn.textContent.trim() === text);
      if (target) { target.click(); clearInterval(intervalId); if (callback) callback(); }
    }, interval);
  }

  // New: processTransaction - clicks Processed then Skip (only when invoked manually by hotkey Z/Я)
  function processTransaction() {
    console.log('processTransaction: attempting to click Processed -> Skip');
    // first click Processed (partial match to allow trailing spaces)
    waitAndClickContains('Processed', 'button.btn.btn-success.ml-1.ng-star-inserted', 100, 5000, () => {
      // Wait for Skip to appear after clicking Processed: poll for Skip up to timeout
      const SKIP_DELAY_MS = 800; // increased delay before polling for Skip (ms)
      setTimeout(() => {
        const start = Date.now();
        const pollInterval = 500; // how often to check for Skip
        const timeout = 15000; // maximum wait for Skip
        const poll = setInterval(() => {
          const buttons = document.querySelectorAll('button.btn.btn-primary.btn-sm.mr-2');
          const target = Array.from(buttons).find(btn => (btn.textContent || '').trim().includes('Skip'));
          if (target) {
            // ensure button is visible and enabled
            const style = window.getComputedStyle(target);
            const visible = target.offsetParent !== null && style && style.display !== 'none' && style.visibility !== 'hidden' && !target.disabled;
            if (visible) {
              try { target.click(); } catch (e) { const ev = new MouseEvent('click', { bubbles: true, cancelable: true, view: window }); target.dispatchEvent(ev); }
              clearInterval(poll);
              console.log('processTransaction: clicked Processed and then Skip');
              return;
            }
          }
          if (Date.now() - start > timeout) { clearInterval(poll); console.warn('processTransaction: timeout waiting for Skip'); }
        }, pollInterval);
      }, SKIP_DELAY_MS);
    });
  }

  // expose processTransaction for console/testing
  try { window.processTransaction = processTransaction; } catch(e){}

  let openTransactionSetup = false;
  function startOpenTransactionListener() {
    if (openTransactionSetup) return;
    if (!document.body) return;
    openTransactionSetup = true;
    setupOpenTransactionListener();
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    startOpenTransactionListener();
  } else {
    document.addEventListener('DOMContentLoaded', startOpenTransactionListener, { once: true });
    window.addEventListener('load', startOpenTransactionListener, { once: true });
  }

  // cleanup
  window.addEventListener('unload', () => { detachListeners(); if (ensureIntervalId) { clearInterval(ensureIntervalId); ensureIntervalId = null; } });

})();
