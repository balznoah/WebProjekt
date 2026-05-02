# Smart Ticketing System

DHBW Karlsruhe · Fortgeschrittene Informatik · WDS25B

---

## Voraussetzungen

Folgende Tools müssen installiert sein:

| Tool | Download | Zweck |
|---|---|---|
| Node.js (LTS) | https://nodejs.org/en/ | Services bauen |
| Docker Desktop | https://www.docker.com/products/docker-desktop/ | Container & Kubernetes |

**Nach der Installation von Docker Desktop:**
Settings (Zahnrad) → Kubernetes → **"Enable Kubernetes"** aktivieren → Apply & Restart

Warten bis unten links in Docker Desktop **zwei grüne Punkte** erscheinen (~3 Minuten).

---

## Projekt herunterladen

```bash
git clone https://github.com/balznoah/<repo-name>.git
cd <repo-name>
```

Oder auf GitHub: grüner **"Code"** Button → **"Download ZIP"** → entpacken.

---

## Option A – Einfach starten (Docker Compose)

Für lokales Testen ohne Kubernetes:

```bash
npm run setup
```

Danach den Ordner `frontend/` öffnen und die Datei **`index.html`** im Browser öffnen (Doppelklick auf die Datei).

---

## Option B – Kubernetes Deployment

Für das vollständige Deployment auf Kubernetes:

```bash
# Schritt 1: Abhängigkeiten installieren und bauen
npm run setup

# Schritt 2: Auf Kubernetes deployen
bash k8s/deploy.sh
```

Warten bis im Terminal steht:
```
✓  Deployment abgeschlossen!
```

Danach im Browser öffnen:

| URL | Beschreibung |
|---|---|
| http://localhost:30080 | Frontend |
| http://localhost:30000/api/health | API Gateway Health-Check |

---

## Demo-Accounts

| Rolle | E-Mail | Passwort |
|---|---|---|
| Admin | admin@dhbw.de | admin123 |
| Staff | staff@dhbw.de | staff123 |
| Visitor | visitor@dhbw.de | visitor123 |

---

## Nützliche Befehle

```bash
# Status aller Pods anzeigen
kubectl get pods -n smart-ticketing

# Logs eines Services ansehen
kubectl logs -n smart-ticketing -l app=api-gateway -f

# Alles stoppen und löschen
kubectl delete namespace smart-ticketing

# Neu deployen
bash k8s/deploy.sh
```

---

## Troubleshooting

**Docker startet nicht:**
→ Docker Desktop als Administrator starten (Rechtsklick → "Als Administrator ausführen")

**Kubernetes nicht erreichbar:**
→ Docker Desktop → Settings → Kubernetes → "Enable Kubernetes" → Apply & Restart

**Pod bleibt in "Pending":**
```bash
kubectl describe pod -n smart-ticketing <pod-name>
```

**Komplett neu starten:**
```bash
kubectl delete namespace smart-ticketing
bash k8s/deploy.sh
```
