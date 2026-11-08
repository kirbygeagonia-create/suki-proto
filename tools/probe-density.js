/* Density baseline, measured over the camera's walk:
     node tools/shot.cjs --probe=@tools/probe-density.js
   Promoted from .scratch at the end of Phase A, because the brief asks twice whether a primary action
   is buried under a long scroll (§8.4 "the placement of important actions so they do not require
   excessive scrolling", §13 "Reduce information overload and long scrolling; surface primary actions
   earlier") and no instrument in this repository measured it. A one-off reading in a scratch file
   cannot tell a reader whether a later layout change helped, so this is a standing measurement now.

   The first version asked only for `.btn` at least 40px tall, and that was wrong in a way that
   inflated the problem: on the admin account screen the actions ARE the section rows, and a row is
   not a `.btn`, so the probe reported the first action 2,050px down a screen whose every tappable
   destination sits far higher. Both readings are printed now — `first-action` counts anything a thumb
   can press, `first-cta` keeps the old button-only figure so the two can be compared.

   It measures, it does not judge: `findings` stays 0 because a long screen is not automatically a
   defect, and `measured` is printed so a silent zero cannot be read as cleanliness. */
(() => {
  const s = document.getElementById('screen');
  if (!s) return 'DENSITY none (no #screen painted)';
  const vp = s.clientHeight;
  const pressable = [].slice.call(s.querySelectorAll('button, a[href], [onclick], .btn'))
    .filter(el => el.offsetHeight >= 40 && (el.textContent || '').trim().length > 1
      && getComputedStyle(el).visibility !== 'hidden');
  const ctas = pressable.filter(el => /(^| )btn( |$)/.test(el.className || ''));
  const first = pressable[0];
  const firstCta = ctas[0];
  const name = (document.querySelector('#screen h1') || {}).textContent || '(untitled)';
  const y = el => {
    if (!el) return 'none';
    let top = el.getBoundingClientRect().top - s.getBoundingClientRect().top;
    return Math.round(top);
  };
  return 'DENSITY ' + name.trim().slice(0, 22)
    + ' | scroll ' + s.scrollHeight + ' in ' + vp
    + ' | screens ' + (Math.round((s.scrollHeight / vp - 1) * 10) / 10)
    + ' | cards ' + s.querySelectorAll('.card').length
    + ' | sections ' + s.querySelectorAll('h2,h3').length
    + ' | first-action-y ' + y(first)
    + ' | first-cta-y ' + y(firstCta)
    + ' | action-visible-at-load ' + (first ? (y(first) < vp - 44) : 'none')
    + ' | measured ' + pressable.length;
})()
