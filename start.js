// start.js - Startet alle Services (Windows/Linux/Mac kompatibel)
// Aufruf: node start.js
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const BASE = __dirname;
const J = 'dhbw-secret-2026';
const N = 'http://localhost:3005';

const services = [
  {
    name: 'notification-service',
    dir: 'notification-service',
    env: { PORT: '3005' },
    health: 'http://localhost:3005/notifications/health',
  },
  {
    name: 'auth-service',
    dir: 'auth-service',
    env: { PORT: '3001', JWT_SECRET: J },
    health: 'http://localhost:3001/auth/health',
  },
  {
    name: 'event-service',
    dir: 'event-service',
    env: { PORT: '3002', JWT_SECRET: J },
    health: 'http://localhost:3002/events/health/check',
  },
  {
    name: 'order-service',
    dir: 'order-service',
    env: { PORT: '3003', JWT_SECRET: J, EVENT_SERVICE_URL: 'http://localhost:3002', NOTIFICATION_SERVICE_URL: N, SERVICE_NAME: 'order-service' },
    health: 'http://localhost:3003/orders/health/check',
  },
  {
    name: 'checkin-service',
    dir: 'checkin-service',
    env: { PORT: '3004', JWT_SECRET: J, ORDER_SERVICE_URL: 'http://localhost:3003', NOTIFICATION_SERVICE_URL: N, SERVICE_NAME: 'checkin-service' },
    health: 'http://localhost:3004/checkin/health',
  },
  {
    name: 'api-gateway',
    dir: 'api-gateway',
    env: { PORT: '3000', JWT_SECRET: J, AUTH_SERVICE_URL: 'http://localhost:3001', EVENT_SERVICE_URL: 'http://localhost:3002', ORDER_SERVICE_URL: 'http://localhost:3003', CHECKIN_SERVICE_URL: 'http://localhost:3004', NOTIFICATION_SERVICE_URL: N },
    health: 'http://localhost:3000/api/health',
  },
];

const procs = [];

function waitFor(url, name) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 60000;
    const check = () => {
      http.get(url, (res) => {
        console.log(`  ✅ ${name} bereit`);
        resolve();
      }).on('error', () => {
        if (Date.now() > deadline) {
          reject(new Error(`TIMEOUT: ${name}`));
        } else {
          setTimeout(check, 1000);
        }
      });
    };
    check();
  });
}

function startService(svc) {
  const env = { ...process.env, ...svc.env };
  const p = spawn('node', ['dist/main.js'], {
    cwd: path.join(BASE, svc.dir),
    env,
    stdio: 'ignore',
  });
  p.on('error', (e) => console.error(`[${svc.name}] Fehler: ${e.message}`));
  procs.push(p);
  return p;
}

function cleanup() {
  console.log('\nStoppe Services...');
  procs.forEach(p => { try { p.kill(); } catch(e) {} });
  process.exit(0);
}
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

async function main() {
  console.log('============================================');
  console.log('  Smart Ticketing - DHBW Karlsruhe');
  console.log('  node start.js');
  console.log('============================================\n');

  for (const svc of services) {
    process.stdout.write(`  Starte ${svc.name}...`);
    startService(svc);
    try {
      await waitFor(svc.health, svc.name);
    } catch (e) {
      console.error(`\n\nFEHLER: ${e.message}`);
      console.error('Tipp: npm run build im jeweiligen Service-Ordner ausführen');
      cleanup();
    }
  }

  console.log('\n============================================');
  console.log('  Alle Services bereit!');
  console.log('  API Gateway:  http://localhost:3000');
  console.log('  Frontend:     frontend/index.html im Browser öffnen');
  console.log('                ODER: cd frontend && npm start');
  console.log('  CTRL+C zum Beenden');
  console.log('============================================\n');
}

main();
