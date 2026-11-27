// Vercel build step: copy three.js next to the static files (the Node server normally serves it from node_modules).
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', 'node_modules', 'three');
const dst = path.join(__dirname, '..', 'public', 'vendor', 'three');
fs.rmSync(dst, { recursive: true, force: true });
for (const d of ['build', 'examples/jsm']) fs.cpSync(path.join(src, d), path.join(dst, d), { recursive: true });
console.log('three copied to public/vendor/three');
