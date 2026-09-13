(function () {
  document.documentElement.classList.add('js');

  /* コピーボタン */
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function flash(btn) {
    if (btn.dataset.busy) return;
    btn.dataset.busy = '1';
    var label = btn.textContent;
    btn.textContent = 'コピーしました';
    btn.classList.add('done');
    setTimeout(function () {
      btn.textContent = label;
      btn.classList.remove('done');
      delete btn.dataset.busy;
    }, 2000);
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-copy-btn]') : null;
    if (!btn) return;
    var box = btn.closest('[data-copy]');
    var pre = box && box.querySelector('[data-copy-src]');
    if (!pre) return;
    var text = pre.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { flash(btn); },
        function () { if (fallbackCopy(text)) flash(btn); }
      );
    } else if (fallbackCopy(text)) {
      flash(btn);
    }
  });

  /* ツール切替タブ（ページ内の全タブ群が連動・選択はlocalStorage） */
  var groups = [].slice.call(document.querySelectorAll('[data-tabs]'));
  if (!groups.length) return;

  function apply(tool) {
    groups.forEach(function (g) {
      var tabs = [].slice.call(g.querySelectorAll('.tab'));
      var panels = [].slice.call(g.querySelectorAll('.panel'));
      var has = tabs.some(function (t) { return t.dataset.tool === tool; });
      var pick = has ? tool : tabs[0] && tabs[0].dataset.tool;
      tabs.forEach(function (t) {
        var on = t.dataset.tool === pick;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (p) {
        p.hidden = p.dataset.tool !== pick;
      });
    });
  }

  var saved = null;
  try { saved = localStorage.getItem('ai-tool'); } catch (e) {}
  apply(saved || 'chatgpt');

  groups.forEach(function (g) {
    g.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('.tab') : null;
      if (!t) return;
      apply(t.dataset.tool);
      try { localStorage.setItem('ai-tool', t.dataset.tool); } catch (err) {}
    });
    g.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var tabs = [].slice.call(g.querySelectorAll('.tab'));
      var i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      next.click();
      e.preventDefault();
    });
  });
})();
