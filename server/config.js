'use strict';
const path = require('path');

module.exports = {
  PORT: Number(process.env.PORT) || 3000,
  PUBLIC_DIR: path.join(__dirname, '..', 'public'),

  LEVEL_LABEL: { beginner: 'Beginner', intermediate: 'Intermediate', pro: 'Pro' },
  // Bot names match the 3D character in that seat: seat 1 is a woman, the others are men
  // (see public/js/three/modelCharacter.js SEAT_PEOPLE).
  BOT_NAMES: {
    male: ['Arjun', 'Kabir', 'Rohan', 'Vikram', 'Dev', 'Nikhil', 'Aman', 'Rahul'],
    female: ['Priya', 'Meera', 'Anaya', 'Sana', 'Isha', 'Tara'],
  },
  WOMAN_SEATS: [1],

  // Delay before a bot moves, by bot-speed setting (ms).
  BOT_DELAY: { slow: 1500, normal: 850, fast: 350 },
  BID_EXTRA_DELAY: 300,
  // A disconnected player's turn is auto-played after this delay.
  OFFLINE_AUTOPLAY_MS: 1500,
  // In the lobby, a disconnected player's seat is freed after this long.
  LOBBY_DROP_MS: 30 * 1000,
  // Rooms with nobody connected are removed after this long.
  ROOM_IDLE_MS: 10 * 60 * 1000,
  HEARTBEAT_MS: 30 * 1000,
  MAX_MESSAGE_BYTES: 8192,
};
