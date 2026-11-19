// Steering clearance demo (MIE243 teaching vehicle page).
// Top view of the front-left corner. The wheel pivots at the end of the front beam,
// 25 mm outside the side rail. Its inner face sits 10 mm outboard of the pivot; radius 50 mm.
// Gap to the rail = 25 - (50 sin(a) - 10 cos(a)), in mm.
(function () {
  var range = document.getElementById('sc-angle');
  if (!range) return;
  var $ = function (id) { return document.getElementById(id); };
  var fig = $('sc-fig'), wheel = $('sc-wheel'), out = $('sc-read'), st = $('sc-status');
  var gapLine = $('sc-gapline'), gapT = $('sc-gapt');
  var PX = 320, PY = 200, K = 4;            // pivot in px, px per mm
  var RAIL_Y = 300;                         // rail outer face in px

  function update() {
    var a = +range.value, r = a * Math.PI / 180;
    var gap = 25 - (50 * Math.sin(r) - 10 * Math.cos(r));
    wheel.setAttribute('transform', 'rotate(' + a + ' ' + PX + ' ' + PY + ')');
    // closest wheel corner: front-inner corner (+50 mm along, 10 mm outboard of pivot)
    var cx = PX + K * (50 * Math.cos(r) + 10 * Math.sin(r));
    var cy = PY + K * (50 * Math.sin(r) - 10 * Math.cos(r));
    gapLine.setAttribute('x1', cx); gapLine.setAttribute('x2', cx);
    gapLine.setAttribute('y1', cy); gapLine.setAttribute('y2', RAIL_Y);
    gapT.setAttribute('x', cx + 8); gapT.setAttribute('y', (cy + RAIL_Y) / 2 + 4);
    var hit = gap <= 0;
    fig.classList.toggle('sc-hit', hit);
    gapT.textContent = Math.max(0, gap).toFixed(0) + ' mm';
    out.textContent = a + '° · gap ' + (hit ? '0' : gap.toFixed(0)) + ' mm';
    st.textContent = hit
      ? 'The wheel hits the side rail. This is the limit: about 40° of steering.'
      : a < 5 ? 'Driving straight: lots of room.'
      : 'The front of the wheel swings in toward the rail as you steer.';
  }
  range.addEventListener('input', update);
  update();
})();
