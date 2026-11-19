// Shaft lock demo (MIE243 page): press and hold the button to drop the pin into a notch.
(function () {
  var svg = document.getElementById('sl-discPath');
  if (!svg) return;
  var CX = 200, CY = 440, R = 60, RN = 46, HALF = 7.5, STEP = 30, TRAVEL = 18;
  var $ = function (id) { return document.getElementById(id); };

  // disc outline with 12 notches (one every 30°)
  var pts = [];
  for (var d = 0; d < 360; d++) {
    var m = d % STEP, r = Math.min(m, STEP - m) < HALF ? RN : R, t = d * Math.PI / 180;
    pts.push((CX + r * Math.sin(t)).toFixed(1) + ',' + (CY - r * Math.cos(t)).toFixed(1));
  }
  svg.setAttribute('d', 'M' + pts.join('L') + 'Z');

  function spring(x0, x1, yTop, yBot, n) {
    var p = [((x0 + x1) / 2) + ',' + yTop], h = (yBot - yTop) / n;
    for (var i = 0; i < n; i++) p.push((i % 2 ? x1 : x0) + ',' + (yTop + h * (i + 0.5)));
    p.push(((x0 + x1) / 2) + ',' + yBot);
    return p.join(' ');
  }

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pressed = false, p = 0, a = 15, last = performance.now(), msg = '';
  var st = $('sl-status');

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (pressed) {
      var tgt = Math.round(a / STEP) * STEP, diff = tgt - a;
      a += Math.sign(diff) * Math.min(Math.abs(diff), 90 * dt);
      if (Math.abs(tgt - a) < 0.5) { a = tgt; p = Math.min(1, p + dt * 6); }
    } else {
      p = Math.max(0, p - dt * 6);
      if (p === 0 && !reduce) a = (a + 90 * dt) % 360;
    }
    var y = p * TRAVEL;
    $('sl-sBtn').setAttribute('transform', 'translate(0,' + y + ')');
    $('sl-eBtn').setAttribute('transform', 'translate(0,' + y + ')');
    $('sl-sSpring').setAttribute('points', spring(332, 364, 64 + y, 90, 7));
    $('sl-eSpring').setAttribute('points', spring(184, 216, 318 + y, 340, 7));
    $('sl-eDisc').setAttribute('transform', 'rotate(' + a.toFixed(2) + ' ' + CX + ' ' + CY + ')');
    var next = pressed
      ? (p < 1 ? 'Pressed: the shaft turns a little until a notch lines up with the pin…' : 'Locked: the pin sits in a notch, so the shaft can’t turn. Now you can twist the collet.')
      : (p > 0 ? 'Released: the spring pushes the button back up…' : 'Released: the spring holds the pin out, so the shaft spins freely.');
    if (next !== msg) { msg = next; st.textContent = msg; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  var b = $('sl-hold');
  var down = function (e) { e.preventDefault(); pressed = true; };
  var up = function () { pressed = false; };
  b.addEventListener('pointerdown', down);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, up); });
  b.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); pressed = true; } });
  b.addEventListener('keyup', up);
})();
