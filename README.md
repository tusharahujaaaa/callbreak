# Lakdi (Callbreak)

A 4-player trick-taking card game you play in the browser. Play with friends, against bots, or both. Spades are trump by default; the host can let the highest bidder choose trump instead.

## Run it

```bash
cd lakdi
npm install
npm start
```

Then open **http://localhost:3000**. The server also prints a `http://192.168.x.x:3000` address. Friends on the same Wi-Fi open that address to join.

To play with friends over the internet, either:
- deploy this folder to a Node host (Render, Railway, Fly.io…). It reads the `PORT` environment variable; or
- run it locally and expose it with a tunnel, e.g. `npx localtunnel --port 3000` or `ngrok http 3000`.

## How to play together

1. One person clicks **Create a room** and becomes the **host**.
2. Others enter the 4-letter code, or open the invite link, and click **Join room**.
3. The host fills any empty seats with **bots** (Beginner / Intermediate / Pro), can set each bot's level, can kick players, and can change the seating order.
4. The host sets the **table rules**, then clicks **Start game**.

**Play vs bots** starts a solo game against 3 bots straight away.

If someone disconnects mid-game, a bot plays their seat until they come back. They rejoin automatically when they reopen the page. If someone leaves, a bot takes their seat for the rest of the game.

## Rules the host can change

| Setting | Default |
|---|---|
| Number of rounds | 5 |
| Direction of play | Anticlockwise (traditional) |
| Lowest / highest bid | 1 / 13 |
| Points per extra trick | 0.1 |
| Trump suit: always Spades, or highest bidder chooses (tie: first to bid it) | Always Spades |
| Bid 8+ bonus (bid counts double) | off |
| Redeal: a player has no Spades | on |
| Redeal: a player has no face cards (J/Q/K/A) | on |
| Redeal: total bids below N | on, N = 8 |
| Final round: play on even if bids are low | off |
| Must follow suit | on |
| Must play higher (forced over-carding) | on |
| Must trump when out of the led suit | on |
| Must over-trump | on |
| Free discard if you can't over-trump | off |
| Trump must be broken before leading | off |
| Dealing animation (5, then 4, then 4 cards each) | on |
| Turn timer (bot moves when it runs out) | off |
| Bot speed / auto-start next round | normal / off |

Scoring: make your bid exactly = **+bid**; each extra trick = **+0.1**; fewer than your bid = **−bid**.

When the host picks **Highest bidder chooses**, play pauses after bidding while the top bidder picks a suit (on a tie, whoever made that bid first). The trump suit is shown in the top bar, on a glowing medallion in the centre of the table, and trump cards get a gold frame.

## The 3D table

The game is played in first person at a table in a dim bar (the flat 2D table is used if the browser can't do 3D).

- **Your cards** are held in your hands: hover to lift a card, click to play it. Cards you can't play go dark on your turn.
- **The other players** are realistic 3D people (bots are mannequins whose joints glow in their level colour: green Beginner, blue Intermediate, purple Pro). They watch whoever is playing, slam cards down, cheer tricks, slump when they miss a bid, and take a sip of their drink now and then.
- **Look:** cards are drawn like a real deck (classic pip layouts, double-ended court cards, fine-line red back). Other players hold real-size cards in their hand, the men have hair, and glasses are clear with bright edges.
- **Drinks:** everyone has a beer mug or a whiskey that slowly empties. Press **Drink** (or **D**) to take a sip: you see the glass lifted to you, everyone else sees you drink, and the level goes down. Use the menu in the bottom-right corner to switch drinks or **Call waiter** for a refill; the waiter walks over from the bar and pours it. Everyone sees the same glasses and waiter. The drink stays level when a glass is tipped and sloshes when it's moved.
- **Bidding:** a compact strip of number keys above your cards; press **1–9** (0 = 10) to call, **Hint** (or **H**) to see a suggested call.
- **Top bar:** 🔊 sound on/off, **GFX** switches High/Low graphics (Low runs better on older computers), **Log** shows the game log and standings.

The character models in `public/models/` come from the three.js examples: Michelle and X Bot are Adobe Mixamo characters (free to use in games), the male avatar is a Ready Player Me avatar — check Ready Player Me's terms before publishing the game.

Developer option: add `?sips` to the address to make players sip every few seconds (for checking the animation).

## Bots

- **Beginner**: bids roughly and plays a random legal card.
- **Intermediate**: bids from its hand strength, cashes Aces, wins tricks cheaply and throws away low cards.
- **Pro**: counts cards, tracks which players are out of a suit, plays winners that can't be beaten, draws out trumps, creates voids for trumping, and avoids leading suits an opponent can trump.

Bots only use information a human player would have.

## Project layout

```
lakdi/
├── package.json
├── server/                     Node.js game server
│   ├── index.js                entry point: starts HTTP + WebSocket server
│   ├── config.js               port, timings, bot names
│   ├── http/
│   │   └── staticServer.js     serves the public/ folder
│   ├── game/                   pure game logic (no networking)
│   │   ├── cards.js            deck, shuffle, sorting, card names
│   │   ├── rules.js            trick winner + legal-move rules
│   │   ├── settings.js         default rules + validation of host changes
│   │   ├── redeal.js           no-spade / no-face / low-bid redeal checks
│   │   ├── deal.js             5-4-4 deal order and timing
│   │   ├── scoring.js          round scoring
│   │   └── LakdiGame.js        round flow: deal → bid → 13 tricks → score
│   ├── bots/
│   │   ├── index.js            chooseBid / chooseCard entry point
│   │   ├── bidding.js          hand evaluation and bids
│   │   ├── helpers.js          shared card-choice helpers
│   │   └── levels/             beginner.js, intermediate.js, pro.js
│   ├── rooms/
│   │   ├── registry.js         open rooms + player → room lookup
│   │   ├── Room.js             seats, host, timers, bot turns, reconnects
│   │   ├── bar.js              drinks and the waiter's visits
│   │   └── view.js             what each player is allowed to see
│   └── ws/
│       ├── socket.js           WebSocket setup, disconnects, heartbeat
│       ├── router.js           routes messages, checks host/phase rules
│       ├── context.js          shared helpers (roomOf, leave)
│       ├── send.js
│       └── handlers/           session.js, lobby.js, game.js
├── public/                     browser client (no build step)
│   ├── index.html
│   ├── css/                    base, home, lobby, table, cards, panels, responsive, bar-ui
│   ├── models/                 rigged 3D characters (glTF)
│   └── js/
│       ├── main.js             entry: screen switching + button actions
│       ├── core/               util.js, store.js, net.js, clock.js (server time)
│       ├── config/             settingsSpec.js (the host's rule form)
│       ├── game/               dealTimeline.js
│       ├── ui/                 cards.js, modal.js, toast.js, sfx.js (synthesized sounds)
│       ├── three/              the 3D table: scene, camera, lighting, room and furniture,
│       │                       props (bottles, glasses), characters + poser (seated pose),
│       │                       your 3D hand, drinks + waiter, post-processing
│       └── screens/
│           ├── home.js
│           ├── lobby/          index.js, seatList.js, settingsForm.js
│           └── table/          index.js, seats.js, trick.js, hand.js, status.js,
│                               bidPanel.js, trumpPanel.js, barMenu.js, announcer.js,
│                               sidebar.js, scoreboard.js
└── test/
    ├── simulate.js             rule checks + bot-vs-bot games (npm test)
    ├── bar.test.js             drinks / waiter queue (npm test)
    ├── e2e.js                  WebSocket test (run the server with PORT=3999 first)
    └── trump-e2e.js            highest-bidder trump choice over WebSocket (npm run test:e2e)
```
