#!/bin/bash
# start-local.sh - Smart Ticketing DHBW
# Kompatibel mit Windows (Git Bash/MINGW), Linux, Mac
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

PIDS=()
cleanup() {
  echo ""
  echo "Stoppe Services..."
  for P in "${PIDS[@]}"; do kill "$P" 2>/dev/null || true; done
  echo "Fertig."
}
trap cleanup EXIT INT TERM

echo "============================================"
echo "  Smart Ticketing - DHBW Karlsruhe"
echo "  (Kafka-Fallback via HTTP aktiv)"
echo "============================================"
echo ""

# npm install in jedem Service
echo "Installiere Dependencies..."
for S in notification-service auth-service event-service order-service checkin-service api-gateway; do
  (cd "$S" && npm install --silent 2>/dev/null)
done
echo "OK"
echo ""

# Build alle Services
echo "Baue Services..."
for S in notification-service auth-service event-service order-service checkin-service api-gateway; do
  (cd "$S" && npm run build --silent 2>/dev/null) && echo "  $S OK"
done
echo ""

mkdir -p logs

J=dhbw-secret-2026
N=http://localhost:3005

# Warte auf Service mit node (plattformunabhaengig - kein curl noetig)
wait_for() {
  node healthcheck.js "$1" "$2" "${3:-30}"
}

echo "Starte Services..."

# 1. Notification Service zuerst (andere senden Events dorthin)
PORT=3005 node notification-service/dist/main.js > logs/notification.log 2>&1 &
PIDS+=($!)
wait_for http://localhost:3005/notifications/health notification-service

# 2. Auth Service
PORT=3001 JWT_SECRET=$J \
  node auth-service/dist/main.js > logs/auth.log 2>&1 &
PIDS+=($!)
wait_for http://localhost:3001/auth/health auth-service

# 3. Event Service
PORT=3002 JWT_SECRET=$J \
  node event-service/dist/main.js > logs/event.log 2>&1 &
PIDS+=($!)
wait_for http://localhost:3002/events/health/check event-service

# 4. Order Service
PORT=3003 JWT_SECRET=$J \
  EVENT_SERVICE_URL=http://localhost:3002 \
  NOTIFICATION_SERVICE_URL=$N \
  SERVICE_NAME=order-service \
  node order-service/dist/main.js > logs/order.log 2>&1 &
PIDS+=($!)
wait_for http://localhost:3003/orders/health/check order-service

# 5. Check-in Service
PORT=3004 JWT_SECRET=$J \
  ORDER_SERVICE_URL=http://localhost:3003 \
  NOTIFICATION_SERVICE_URL=$N \
  SERVICE_NAME=checkin-service \
  node checkin-service/dist/main.js > logs/checkin.log 2>&1 &
PIDS+=($!)
wait_for http://localhost:3004/checkin/health checkin-service

# 6. API Gateway (zuletzt)
PORT=3000 JWT_SECRET=$J \
  AUTH_SERVICE_URL=http://localhost:3001 \
  EVENT_SERVICE_URL=http://localhost:3002 \
  ORDER_SERVICE_URL=http://localhost:3003 \
  CHECKIN_SERVICE_URL=http://localhost:3004 \
  NOTIFICATION_SERVICE_URL=$N \
  node api-gateway/dist/main.js > logs/gateway.log 2>&1 &
PIDS+=($!)
wait_for http://localhost:3000/api/health api-gateway

echo ""
echo "============================================"
echo "  Alle Services bereit!"
echo ""
echo "  API Gateway:  http://localhost:3000"
echo "  Frontend:     Oeffne frontend/src/index.html"
echo "                im Browser"
echo ""
echo "  Logs:  ./logs/"
echo "  CTRL+C zum Beenden"
echo "============================================"
wait
