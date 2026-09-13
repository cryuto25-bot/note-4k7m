(function () {
  var stage = document.getElementById('stage');
  var slides = [].slice.call(document.querySelectorAll('.slide'));
  var cur = document.getElementById('cur');
  var total = slides.length;
  if (!total) return;
  if (slides[0]) slides[0].classList.add('first');

  function fit() {
    var w = window.innerWidth;
    var h = window.innerHeight - (document.fullscreenElement ? 0 : 44);
    var s = Math.min(w / 1280, h / 720);
    document.documentElement.style.setProperty('--s', String(Math.max(s, 0.1)));
  }

  function show(n) {
    n = Math.min(Math.max(n, 1), total);
    slides.forEach(function (s, i) {
      s.classList.toggle('on', i === n - 1);
    });
    stage.classList.toggle('on-cue', slides[n - 1].classList.contains('cue'));
    cur.textContent = String(n);
    if (location.hash !== '#' + n) history.replaceState(null, '', '#' + n);
    return n;
  }

  var at = show(parseInt((location.hash || '').slice(1), 10) || 1);

  function go(d) { at = show(at + d); }

  document.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === ' ' || k === 'PageDown' || k === 'Enter') {
      go(1); e.preventDefault();
    } else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') {
      go(-1); e.preventDefault();
    } else if (k === 'Home') {
      at = show(1); e.preventDefault();
    } else if (k === 'End') {
      at = show(total); e.preventDefault();
    } else if (k === 'f' || k === 'F') {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
      e.preventDefault();
    }
  });

  window.addEventListener('hashchange', function () {
    var n = parseInt((location.hash || '').slice(1), 10);
    if (n && n !== at) at = show(n);
  });

  window.addEventListener('resize', fit);
  document.addEventListener('fullscreenchange', fit);
  fit();
})();
