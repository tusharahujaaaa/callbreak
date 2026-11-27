'use strict';
// Serves the browser client from /public.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { PUBLIC_DIR } = require('../config');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// Three.js is served straight from node_modules (only its build/ and examples/jsm/ folders).
const THREE_DIR = path.join(__dirname, '..', '..', 'node_modules', 'three');
const THREE_ALLOWED = [path.join(THREE_DIR, 'build') + path.sep, path.join(THREE_DIR, 'examples', 'jsm') + path.sep];

function resolveFile(p) {
  if (p.startsWith('/vendor/three/')) {
    const file = path.join(THREE_DIR, path.normalize(p.slice('/vendor/three/'.length)));
    return THREE_ALLOWED.some((dir) => file.startsWith(dir)) ? file : null;
  }
  const file = path.join(PUBLIC_DIR, path.normalize(p));
  return file.startsWith(PUBLIC_DIR + path.sep) ? file : null;
}

function createStaticServer() {
  return http.createServer((req, res) => {
    let p;
    try { p = decodeURIComponent(req.url.split('?')[0]); } catch { p = '/'; }
    if (p === '/') p = '/index.html';
    const file = resolveFile(p);
    if (!file) { res.writeHead(403); return res.end('Forbidden'); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      res.end(data);
    });
  });
}

module.exports = { createStaticServer };
