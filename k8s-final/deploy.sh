#!/bin/bash
# deploy.sh – Alles in einem Schritt: Images bauen + auf Kubernetes deployen
#
# Voraussetzungen:
#   - Docker Desktop ODER Rancher Desktop (mit Kubernetes aktiviert)
#   - kubectl im PATH
#
# Aufruf (im Projekt-Root):
#   bash k8s/deploy.sh

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}✓${NC}  $1"; }
fail() { echo -e "  ${RED}✗${NC}  $1"; exit 1; }
info() { echo -e "  ${YELLOW}→${NC}  $1"; }

# Skript-Verzeichnis ermitteln, dann in Projekt-Root wechseln
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo ""
echo "========================================"
echo "  Smart Ticketing – Kubernetes Deploy"
echo "========================================"
echo ""

# ── Schritt 1: Voraussetzungen prüfen ────────────────────────────────────────
info "Prüfe Voraussetzungen..."

if ! command -v docker &>/dev/null; then
  fail "Docker nicht gefunden. Bitte Docker Desktop oder Rancher Desktop installieren."
fi

if ! command -v kubectl &>/dev/null; then
  fail "kubectl nicht gefunden. Bitte Docker Desktop/Rancher Desktop mit Kubernetes aktivieren."
fi

if ! kubectl cluster-info &>/dev/null; then
  fail "Kubernetes nicht erreichbar. Bitte in Docker Desktop/Rancher Desktop unter Settings → Kubernetes aktivieren und neu starten."
fi

ok "Docker und Kubernetes laufen"

# ── Schritt 2: Docker Images bauen ───────────────────────────────────────────
echo ""
info "Baue Docker Images (einmalig ~2-3 Minuten)..."
echo ""

SERVICES=(auth-service event-service order-service checkin-service notification-service api-gateway frontend)

for SVC in "${SERVICES[@]}"; do
  echo -n "     smart-ticketing/${SVC} ... "
  if docker build -t "smart-ticketing/${SVC}:latest" "./${SVC}" -q 2>/dev/null; then
    echo -e "${GREEN}fertig${NC}"
  else
    echo ""
    fail "Build von ${SVC} fehlgeschlagen. Ausgabe: docker build -t smart-ticketing/${SVC}:latest ./${SVC}"
  fi
done

echo ""
ok "Alle Images gebaut"

# ── Schritt 3: Kubernetes Manifeste anwenden ─────────────────────────────────
echo ""
info "Deploye auf Kubernetes..."
kubectl apply -f k8s/
ok "Manifeste angewendet"

# ── Schritt 4: Auf Pods warten ────────────────────────────────────────────────
echo ""
info "Warte auf Zookeeper und Kafka (dauert ~60s)..."
kubectl rollout status deployment/zookeeper -n smart-ticketing --timeout=120s
kubectl rollout status deployment/kafka      -n smart-ticketing --timeout=120s
ok "Kafka läuft"

echo ""
info "Warte auf Microservices..."
for SVC in auth-service event-service notification-service order-service checkin-service api-gateway frontend; do
  echo -n "     ${SVC} ... "
  kubectl rollout status "deployment/${SVC}" -n smart-ticketing --timeout=90s 2>&1 | tail -1
done

# ── Fertig ───────────────────────────────────────────────────────────────────
echo ""
echo "========================================"
ok "Deployment abgeschlossen!"
echo ""
echo "  Frontend:    http://localhost:30080"
echo "  API Gateway: http://localhost:30000/api/health"
echo ""
echo "  Status prüfen:  kubectl get pods -n smart-ticketing"
echo "  Logs ansehen:   kubectl logs -n smart-ticketing -l app=api-gateway -f"
echo "  Alles löschen:  kubectl delete namespace smart-ticketing"
echo "========================================"
echo ""
