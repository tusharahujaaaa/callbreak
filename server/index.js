'use strict';
// Entry point: static web server + WebSocket game server.
const os = require('os');
const { PORT } = require('./config');
const { createStaticServer } = require('./http/staticServer');
const { attachWebSockets } = require('./ws/socket');

const server = createStaticServer();
const wss = attachWebSockets(server);

// A friendly message instead of a crash when the port is taken (usually: Lakdi is already running).
function onListenError(err) {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Port ${PORT} is already in use — Lakdi is probably already running.`);
    console.error(`  Open http://localhost:${PORT} to play, or stop the other copy first.`);
    console.error(`  To run a second copy on another port:  set PORT=3001&& npm start   (PowerShell: $env:PORT=3001; npm start)\n`);
    process.exit(1);
  }
  throw err;
}
server.on('error', onListenError);
wss.on('error', onListenError); // the WebSocket server re-emits the HTTP server's errors

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n  Lakdi is running!\n');
  console.log(`  On this computer:   http://localhost:${PORT}`);
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family === 'IPv4' && !a.internal) console.log(`  On your network:    http://${a.address}:${PORT}`);
    }
  }
  console.log('');
});
