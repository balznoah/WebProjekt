// healthcheck.js - Plattformunabhaengiger Health Check (Windows/Linux/Mac)
const http = require('http');
const url = process.argv[2];
const label = process.argv[3] || url;
const maxWait = parseInt(process.argv[4] || '30') * 1000;
const start = Date.now();

function check() {
  http.get(url, (res) => {
    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log(`  ${label} bereit (${elapsed}s)`);
    process.exit(0);
  }).on('error', () => {
    if (Date.now() - start < maxWait) {
      setTimeout(check, 1000);
    } else {
      console.error(`  TIMEOUT: ${label} nach ${maxWait/1000}s nicht erreichbar`);
      process.exit(1);
    }
  });
}
check();
