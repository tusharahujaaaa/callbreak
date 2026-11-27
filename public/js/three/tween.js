// Minimal tween engine driven by the render loop.
const active = new Set();

export const ease = {
  linear: (k) => k,
  inOutCubic: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  outCubic: (k) => 1 - Math.pow(1 - k, 3),
  outQuart: (k) => 1 - Math.pow(1 - k, 4),
  inCubic: (k) => k * k * k,
  outBack: (k) => { const c = 1.4; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
};

/**
 * tween({ duration, delay, ease, update(k), done() })
 * A negative delay starts the tween part-way through (used to catch up with the server clock).
 */
export function tween({ duration, delay = 0, ease: e = ease.inOutCubic, update, done }) {
  const t = { start: performance.now() + delay, duration: Math.max(1, duration), ease: e, update, done };
  active.add(t);
  return t;
}

export function cancel(t) {
  if (t) active.delete(t);
}

export function updateTweens(now) {
  for (const t of active) {
    if (now < t.start) continue;
    const k = Math.min(1, (now - t.start) / t.duration);
    // One broken animation must never stop the others (or the render loop).
    try {
      t.update(t.ease(k));
      if (k >= 1) {
        active.delete(t);
        if (t.done) t.done();
      }
    } catch (e) {
      active.delete(t);
      console.error('animation error', e);
    }
  }
}
