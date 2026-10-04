// Tinder-tyylinen raahaus kortille pointer-eventeillä.

const THRESHOLD = 0.3;   // osuus kortin leveydestä
const MAX_ROTATE = 15;   // astetta

/**
 * Liittää raahauksen korttiin. onSwipe(dir) kutsutaan, kun kortti on lennätetty
 * ulos ('like' oikealle, 'dislike' vasemmalle).
 * Palauttaa funktion, jolla kortin voi lennättää ohjelmallisesti (napit, näppäimet).
 */
export function attachSwipe(card, onSwipe) {
  let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false, done = false;

  const setStamp = (x) => {
    const ratio = Math.max(-1, Math.min(1, x / (card.offsetWidth * THRESHOLD)));
    card.style.setProperty('--like', Math.max(0, ratio));
    card.style.setProperty('--nope', Math.max(0, -ratio));
  };

  const move = (x, y) => {
    const rot = (x / card.offsetWidth) * MAX_ROTATE;
    card.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
    setStamp(x);
  };

  const fling = (dir) => {
    if (done) return;
    done = true;
    const sign = dir === 'like' ? 1 : -1;
    card.classList.add('animating');
    setStamp(sign * card.offsetWidth);
    move(sign * window.innerWidth * 1.2, dy + 40);
    card.addEventListener('transitionend', () => onSwipe(dir), { once: true });
  };

  card.addEventListener('pointerdown', (e) => {
    if (done || e.button > 0 || e.target.closest('a')) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY; dx = dy = 0;
    card.classList.remove('animating');
    card.setPointerCapture(e.pointerId);
  });

  card.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dx = e.clientX - startX;
    dy = (e.clientY - startY) * 0.3;
    move(dx, dy);
  });

  const end = () => {
    if (!dragging) return;
    dragging = false;
    if (Math.abs(dx) > card.offsetWidth * THRESHOLD) {
      fling(dx > 0 ? 'like' : 'dislike');
    } else {
      card.classList.add('animating');
      move(0, 0);
      dy = 0;
    }
  };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', end);

  return fling;
}
