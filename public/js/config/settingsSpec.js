// The table rules the host can change, and how each is shown in the lobby.
// `dep` = only active when that other setting is on.
export const SETTINGS_SPEC = [
  { group: 'Game' },
  { key: 'rounds', label: 'Number of rounds', type: 'number', min: 1, max: 20 },
  { key: 'direction', label: 'Direction of play', type: 'select',
    options: [['anticlockwise', 'Anticlockwise (traditional)'], ['clockwise', 'Clockwise (like most apps)']] },
  { key: 'minBid', label: 'Lowest bid allowed', hint: 'Standard is 1. Setting 0 allows a zero bid.', type: 'number', min: 0, max: 13 },
  { key: 'maxBid', label: 'Highest bid allowed', type: 'number', min: 1, max: 13 },
  { key: 'overtrickPoints', label: 'Points per extra trick', hint: 'Standard is 0.1 (bid 4, win 6 = 4.2)', type: 'number', min: 0, max: 1, step: 0.1 },
  { key: 'trumpMode', label: 'Trump suit', hint: 'Highest bidder: after bidding, the top bidder picks trump (on a tie, whoever bid first)', type: 'select',
    options: [['spades', 'Always Spades (standard)'], ['bidder', 'Highest bidder chooses']] },
  { key: 'eightBidBonus', label: 'Bid 8+ bonus', hint: 'Bid 8 or more and make it: the bid counts double', type: 'bool' },

  { group: 'Redeal rules' },
  { key: 'redealNoSpade', label: 'Redeal if a player has no Spades', type: 'bool' },
  { key: 'redealNoFace', label: 'Redeal if a player has no face cards', hint: 'Face cards here means J, Q, K and A', type: 'bool' },
  { key: 'redealLowBid', label: 'Redeal if total bids are too low', type: 'bool' },
  { key: 'lowBidThreshold', label: 'Redeal when total bids are below', type: 'number', min: 1, max: 40, dep: 'redealLowBid' },
  { key: 'lowBidSkipFinal', label: 'Final round: play on even if bids are low', type: 'bool', dep: 'redealLowBid' },

  { group: 'Play rules' },
  { key: 'mustFollowSuit', label: 'Must follow suit', type: 'bool' },
  { key: 'mustOvercard', label: 'Must play higher', hint: 'If you can beat the winning card, you must', type: 'bool' },
  { key: 'mustTrump', label: 'Must trump when out of a suit', hint: 'No cards of the led suit: you must play a trump', type: 'bool' },
  { key: 'mustOvertrump', label: 'Must over-trump', hint: 'If someone has already trumped, play a higher trump if you can', type: 'bool', dep: 'mustTrump' },
  { key: 'discardIfCantOvertrump', label: 'Free discard if you can\'t over-trump', hint: 'House rule: you can play any card instead of a losing trump', type: 'bool', dep: 'mustTrump' },
  { key: 'spadesMustBeBroken', label: 'Trump must be broken before leading', hint: 'You can\'t lead a trump until one has been played', type: 'bool' },

  { group: 'Table' },
  { key: 'dealAnimation', label: 'Show the dealing animation', hint: 'Cards are dealt 5, then 4, then 4', type: 'bool' },
  { key: 'turnTimer', label: 'Turn timer (seconds)', hint: '0 means no timer. When time runs out, a bot moves for you.', type: 'number', min: 0, max: 120 },
  { key: 'botSpeed', label: 'Bot speed', type: 'select', options: [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']] },
  { key: 'autoNextRound', label: 'Start the next round automatically', type: 'bool' },
];
