// Estimate of the server's clock, so animations (deal, waiter) line up for every player.
// Each update carries the server time it was sent. A message can arrive late but never early,
// so the smallest (client − server) difference seen is the best estimate of the true offset.
// We let it creep upward slowly in case the clocks themselves drift.
let offset = null; // client time − server time

export function syncClock(serverTime) {
  if (typeof serverTime !== 'number') return;
  const sample = Date.now() - serverTime;
  if (offset === null || sample < offset) offset = sample;
  else offset += Math.min(5, sample - offset) * 0.01; // slow drift correction
}

export const serverNow = () => Date.now() - (offset ?? 0);
