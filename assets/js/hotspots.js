// Hotspot dots: tap a dot on a photo to open a small card. One card open at a time.
// Markup: <figure class="spots"> <div class="stage"><img> <button class="spot" style="--x:52%;--y:30%" aria-controls="id">…</div> <div class="spot-card" id="id" hidden>…</div>
(() => {
  const spots = [...document.querySelectorAll('.spot')];
  const cardOf = b => document.getElementById(b.getAttribute('aria-controls'));
  const closeAll = () => spots.forEach(b => { b.setAttribute('aria-expanded', 'false'); cardOf(b).hidden = true; });
  spots.forEach(b => {
    const card = cardOf(b);
    card.style.setProperty('--x', b.style.getPropertyValue('--x'));
    card.style.setProperty('--y', b.style.getPropertyValue('--y'));
    if (parseFloat(b.style.getPropertyValue('--x')) > 55) card.classList.add('flip');
    b.setAttribute('aria-expanded', 'false');
    b.addEventListener('click', e => {
      e.stopPropagation();
      const wasOpen = b.getAttribute('aria-expanded') === 'true';
      closeAll();
      if (!wasOpen) { b.setAttribute('aria-expanded', 'true'); card.hidden = false; }
    });
  });
  document.addEventListener('click', e => { if (!e.target.closest('.spot-card')) closeAll(); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const open = document.querySelector('.spot[aria-expanded="true"]');
    closeAll(); if (open) open.focus();
  });
  // Dots ping twice the first time each photo scrolls into view, so people notice them.
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('seen'); io.unobserve(en.target); }
  }), { threshold: 0.45 });
  document.querySelectorAll('.spots').forEach(f => io.observe(f));
})();
