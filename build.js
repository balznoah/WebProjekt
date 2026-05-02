// build.js - Installiert und baut alle Services
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SERVICES = [
  'auth-service', 'event-service', 'order-service',
  'checkin-service', 'notification-service', 'api-gateway'
];

const mode = process.argv[2] || 'build';

for (const svc of SERVICES) {
  const dir = path.join(__dirname, svc);
  if (mode === 'install') {
    process.stdout.write(`  npm install ${svc}...`);
    execSync('npm install --silent', { cwd: dir, stdio: 'pipe' });
    console.log(' OK');
  } else {
    process.stdout.write(`  build ${svc}...`);
    execSync('npm run build', { cwd: dir, stdio: 'pipe' });
    console.log(' OK');
  }
}
console.log('Fertig!');
