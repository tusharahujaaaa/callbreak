// The deal timeline (mirrors server/game/deal.js): batches of 5, 4, 4 to each player in turn.
// Returns one entry per card: who gets it, which of their cards it is, and when it leaves / lands
// (ms after deal.startedAt).
export function dealTimeline(deal) {
  const items = [];
  const got = [0, 0, 0, 0];
  let i = 0;
  deal.batches.forEach((batch, b) => {
    for (const seat of deal.order) {
      for (let k = 0; k < batch; k++) {
        const start = i * deal.interval + b * deal.pause;
        items.push({ seat, index: got[seat]++, start, arrive: start + deal.flight, n: i });
        i++;
      }
    }
  });
  return items;
}

// How many cards `seat` has received `elapsed` ms into the deal.
export function arrivedCount(timeline, seat, elapsed) {
  let n = 0;
  for (const it of timeline) if (it.seat === seat && it.arrive <= elapsed) n++;
  return n;
}
