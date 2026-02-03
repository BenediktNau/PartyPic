# PartyPic Load Testing mit k6

Diese Skripte dienen zur Demonstration des Autoscalings (HPA) für das PartyPic Projekt.

## Voraussetzungen

### k6 installieren

```bash
# macOS
brew install k6

# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Docker
docker run --rm -i grafana/k6 run - <loadtest.js
```

## Skripte

### 1. loadtest.js - Ramp-Up Test

Simuliert realistischen Traffic mit graduellem Anstieg:

```bash
k6 run loadtest.js
```

**Phasen:**
- Warm-up: 30s (0 → 10 VUs)
- Ramp-up: 1m (10 → 50 VUs)
- Peak Load: 2m (50 → 100 VUs)
- Sustained: 2m (100 VUs)
- Scale-down: 1m (100 → 50 VUs)
- Cool-down: 30s (50 → 0 VUs)

### 2. stress-test.js - Quick HPA Trigger

Erzeugt schnell hohe Last um HPA-Skalierung zu triggern:

```bash
k6 run stress-test.js
```

**Phasen:**
- Quick ramp: 10s (0 → 50 VUs)
- Spike: 20s (50 → 200 VUs)
- Hold: 2m (200 VUs)
- Push: 1m (200 → 300 VUs)
- Sustained: 2m (300 VUs)
- Drop: 30s (300 → 0 VUs)

## Konfiguration

Über Umgebungsvariablen:

```bash
# Andere URLs verwenden
k6 run --env BASE_URL=http://localhost:5173 --env API_URL=http://localhost:3000 loadtest.js

# Mehr oder weniger VUs
k6 run --vus 50 --duration 2m loadtest.js
```

## Monitoring während des Tests

In separaten Terminals:

```bash
# HPA-Status beobachten
kubectl get hpa -w

# Pod-Skalierung beobachten
kubectl get pods -w

# Detaillierte HPA-Infos
kubectl describe hpa party-pic-server-application

# Top Pods (CPU/Memory)
kubectl top pods
```

## Grafana Dashboard

Während des Lasttests folgende Metriken in Grafana beobachten:

1. **Pod Replicas**: `kube_deployment_status_replicas{deployment=~"party-pic.*"}`
2. **CPU Usage**: `rate(container_cpu_usage_seconds_total{pod=~"party-pic.*"}[1m])`
3. **Memory Usage**: `container_memory_working_set_bytes{pod=~"party-pic.*"}`
4. **Request Rate**: `rate(partypic_http_requests_total[1m])`
5. **HPA Target**: `kube_horizontalpodautoscaler_status_current_replicas`

## Erwartetes Verhalten

1. **Ohne Last**: 
   - Server: 1 Pod (minReplicas)
   - Client: 2 Pods (minReplicas)

2. **Unter Last (CPU > 70%)**:
   - HPA erhöht `desiredReplicas`
   - Neue Pods werden erstellt
   - Bei Node-Ressourcenengpass: Cluster Autoscaler skaliert Worker-Nodes

3. **Nach Last**:
   - 5-Minuten Stabilisierungszeit
   - Graduelle Reduzierung auf minReplicas
   - Cluster Autoscaler kann überschüssige Nodes entfernen

## Troubleshooting

### HPA skaliert nicht

```bash
# Prüfen ob HPA Metriken bekommt
kubectl get hpa
# "TARGETS" sollte Werte zeigen, nicht "<unknown>"

# Prüfen ob metrics-server läuft
kubectl get pods -n kube-system | grep metrics-server

# HPA Events prüfen
kubectl describe hpa party-pic-server-application
```

### Pods erreichen nicht "Running"

```bash
# Pod-Status prüfen
kubectl get pods
kubectl describe pod <pod-name>

# Ressourcen-Limits prüfen
kubectl top nodes
```
