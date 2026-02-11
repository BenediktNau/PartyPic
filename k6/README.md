# PartyPic Load Testing mit k6 + TypeScript

Diese TypeScript-basierten k6-Skripte dienen zur Demonstration des Autoscalings (HPA + Cluster Autoscaler) für das PartyPic-Projekt.

## 🎯 Ziel

- **Normal Traffic**: Realistisches Nutzerverhalten simulieren (~250 User)
- **Peak Traffic**: Extreme Last für Autoscaling-Tests (~5000 User)

---

## ⚙️ Voraussetzungen

### 1. k6 installieren

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
docker run --rm -i grafana/k6 run - <script.js
```

### 2. Node.js Dependencies installieren

```bash
cd k6
npm install
```

### 3. TypeScript Skripte kompilieren

```bash
npm run build
```

---

## 🚀 Verwendung

### Ingress-URL aus AWS holen

```bash
# Methode 1: URL als Environment Variable
export APP_URL=$(kubectl get ingress party-pic-ingress -n default -o jsonpath='{.spec.rules[0].host}' | xargs -I {} echo "http://{}")
echo $APP_URL

# Methode 2: Direkt in kubectl (falls im Cluster)
kubectl get ingress party-pic-ingress -n default -o jsonpath='{.spec.rules[0].host}'
```

### Skripte ausführen

#### Normal Traffic (von überall im Repo)

```bash
cd k6/
APP_URL=http://app.54.144.199.220.nip.io npm run normal
```

**ODER mit automatischer URL:**

```bash
cd k6/
APP_URL=$(kubectl get ingress party-pic-ingress -n default -o jsonpath='{.spec.rules[0].host}' | xargs -I {} echo "http://{}") npm run normal
```

#### Peak Traffic (Extreme Last)

```bash
cd k6/
APP_URL=http://app.54.144.199.220.nip.io npm run peak
```

**ODER mit automatischer URL:**

```bash
cd k6/
APP_URL=$(kubectl get ingress party-pic-ingress -n default -o jsonpath='{.spec.rules[0].host}' | xargs -I {} echo "http://{}") npm run peak
```

---

## 📊 Skript-Details

### 1. `normal-traffic.ts` - Realistischer Event-Verkehr

**Szenario:**
- 3 Sessions (Events/Partys)
- 50-70 User pro Session (insgesamt ~200 User)
- Menschliche Reaktionszeiten (1-3s zwischen Aktionen)
- Realistische Tippgeschwindigkeiten (50-150ms pro Zeichen)
- 1-3 Bilder pro User (a 50KB)

**Ablauf pro User:**
1. Registrierung (mit Tipp-Simulation)
2. Login
3. Sessions anschauen
4. Galerie laden
5. 2-5 Bilder hochladen (mit Pausen)
6. Galerie nochmal anschauen

**Verhalten:**
| Phase | Dauer | VUs | Beschreibung |
|-------|-------|-----|--------------|
| Ramp-up | 1m | 0→50 | Erste User kommen an |
| Anstieg | 3m | 50→100 | Event füllt sich |
| Peak | 4m | 100→200 | Haupt-Event-Zeit |
| Ende | 2m | 200→0 | Event endet |

**Testdauer: 10 Minuten**

**Erwartetes Scaling:** 
- Pods bleiben stabil bei 2-3
- Keine Node-Skalierung nötig
- CPU: ~40-60%

---

### 2. `peak-traffic.ts` - Extreme Last (HPA + Cluster Autoscaler)

**Szenario:**
- 10 Sessions (Massive Events)
- 100 User pro Session (insgesamt ~1000 User)
- Minimale Delays (aggressive Requests)
- 2-5 Bilder pro User (100-300KB)
- Mehrfache Galerie-Requests

**Ablauf pro User:**
1. Schnelle Registrierung (0.1s Pause)
2. Schneller Login
3. Sessions abrufen
4. Galerie laden
5. 5-10 Bilder hochladen (größere Dateien!)
6. Mehrfache Galerie-Requests (Last erzeugen)

**Verhalten:**
| Phase | Dauer | VUs | Beschreibung |
|-------|-------|-----|--------------|
| Ramp-up | 30s | 0→100 | Schneller Start |
| Anstieg | 2m | 100→1000 | Aggressive Steigerung |
| Peak | 5m | 1000 | **EXTREME LAST** |
| Ende | 2m30s | 1000→0 | Ramp-down |

**Testdauer: 10 Minuten**

**Erwartetes Scaling:**
- **HPA**: Server Pods 2 → 5-10 (bis max 25)
- **Cluster Autoscaler**: Worker Nodes 2 → 3-4
- **CPU**: 70-85% (triggert HPA)
- **Memory**: 60-75% (triggert HPA)

---

## 🔍 Monitoring während des Tests

### HPA Status live beobachten

```bash
kubectl get hpa -n default -w
```

### Pod-Skalierung beobachten

```bash
kubectl get pods -n default -w
```

### Node-Skalierung (Cluster Autoscaler)

```bash
kubectl get nodes -w
```

### Resource-Auslastung

```bash
# Node-Ressourcen
kubectl top nodes

# Pod-Ressourcen
kubectl top pods -n default
```

### Prometheus Metriken

```bash
# Aktuelle Metriken abrufen
kubectl get svc -n monitoring
# Dann curl zur Prometheus-URL oder Port-Forward:
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090
# Öffne: http://localhost:9090
```

### Grafana Dashboards

```bash
# Grafana-URL holen
kubectl get ingress -n monitoring grafana-ingress -o jsonpath='{.spec.rules[0].host}'

# Oder Port-Forward
kubectl port-forward -n monitoring svc/grafana 3000:80
# Öffne: http://localhost:3000
```

**Wichtige Panels:**
1. **Server Pods (HPA)** - Aktuelle Anzahl Server Pods
2. **Pod Scaling Timeline** - Graph über Zeit
3. **CPU/Memory Utilization** - Resource-Auslastung
4. **Request Rate** - Requests pro Sekunde

---

## 🏗️ Architektur & Lastverteilung

### Warum Scaling funktioniert ohne Session-Probleme:

1. **JWT-Tokens sind stateless** - Jeder Pod kann Tokens validieren
2. **Session-Daten in PostgreSQL** - Zentral, nicht im Pod-Memory
3. **Fotos in S3** - Zentral, nicht auf einem Pod
4. **Kubernetes Service** - Verteilt Requests automatisch (Round-Robin)

**Fazit:** Ein User merkt nichts, egal auf welchem Pod er landet!

---

## ⚙️ HPA Konfiguration

| Component | Min Pods | Max Pods | CPU Target | Memory Target |
|-----------|----------|----------|------------|---------------|
| **Server** | 2 | 25 | 70% | 80% |
| **Client** | 1 | 3 | 70% | 80% |

**Hinweis:** Der Client skaliert selten, da Nginx nur statische Files ausliefert (<5% CPU).

---

## 🔧 Entwicklung

### TypeScript Skripte bearbeiten

Alle Skripte liegen in [`src/`](src/):
- [`helpers.ts`](src/helpers.ts) - Gemeinsame Funktionen
- [`normal-traffic.ts`](src/normal-traffic.ts) - Normal Load
- [`peak-traffic.ts`](src/peak-traffic.ts) - Extreme Load

Nach Änderungen:

```bash
npm run build
```

### Manuell ausführen

```bash
# Mit eigenen Optionen
k6 run --vus 50 --duration 2m dist/normal-traffic.js

# Mit anderer URL
APP_URL=http://localhost:3000 k6 run dist/normal-traffic.js
```

---

## 🐛 Troubleshooting

### "No sessions available"
Die Setup-Phase erstellt Sessions. Wenn sie fehlschlägt:
- Prüfe APP_URL (erreichbar?)
- Prüfe Ingress: `kubectl get ingress`
- Logs: `kubectl logs -n default -l app=party-pic-server`

### HPA skaliert nicht
- CPU unter 70%? Test generiert nicht genug Last → Peak-Test verwenden
- HPA Events prüfen: `kubectl describe hpa party-pic-server-hpa -n default`
- Metrics-Server läuft? `kubectl top nodes`

### Fehler bei Registrierung
- Email-Uniqueness? Jeder VU generiert unique Emails mit Timestamp
- DB Connection Pool erschöpft? Mehr Server Pods skalieren
- DB erreichbar? `kubectl logs -n default -l app=party-pic-server | grep -i postgres`

### Upload-Fehler
- S3 erreichbar? Prüfe MinIO/S3 Credentials in Secrets
- Upload-Größenlimit? Backend erlaubt max 10MB
- Signed URLs expired? Init-Upload und Upload müssen schnell nacheinander erfolgen

---

## 📈 Erwartete Resultate

### Normal Traffic
- **Pods:** Stabil bei 2-3 Server Pods
- **CPU:** 40-60% durchschnittlich
- **Requests:** ~100-200 req/s
- **Dauer:** 24 Minuten
- **VUs Peak:** 200

### Peak Traffic
- **Pods:** 2 → 10+ → 25 (maximal)
- **Nodes:** 2 → 4+ (Cluster Autoscaler)
- **CPU:** 80-95% (triggert HPA)
- **Requests:** ~1000-3000 req/s
- **Dauer:** 22 Minuten
- **VUs Peak:** 5000

---

## 📝 Notizen

- **Warm-up:** Die erste Skalierung dauert ~2-3 Minuten (Pod-Start + Readiness)
- **S3 Upload:** Nutzt Presigned URLs, daher geht Upload direkt zu S3 (nicht über Server)
- **JWT Token:** 1 Stunde gültig, reicht für alle Tests
- **Session IDs:** UUIDs, generiert von PostgreSQL (`gen_random_uuid()`)

---

## 📚 Weitere Ressourcen

- [k6 Dokumentation](https://k6.io/docs/)
- [k6 TypeScript Setup](https://k6.io/docs/using-k6/test-authoring/writing-tests-in-typescript/)
- [Kubernetes HPA](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Cluster Autoscaler](https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler)
