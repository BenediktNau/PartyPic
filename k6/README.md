# PartyPic Load Testing mit k6

Diese Skripte dienen zur Demonstration des Autoscalings (HPA + Cluster Autoscaler) für das PartyPic Projekt.

## Voraussetzungen

### k6 installieren

```bash
# macOS
brew install k6

# Ubuntu/Debian (ARM64)
curl -L https://github.com/grafana/k6/releases/download/v0.49.0/k6-v0.49.0-linux-arm64.tar.gz | tar xz
sudo mv k6-v0.49.0-linux-arm64/k6 /usr/local/bin/

# Docker
docker run --rm -i grafana/k6 run - <script.js
```

### Node.js Dependencies

```bash
cd k6
npm install
```

## Verfügbare Skripte

### 1. `normal-traffic.ts` - Normaler Event-Verkehr

Simuliert einen typischen Tag bei einer Hochzeit/Event:
- Ein Organisator erstellt eine Session
- Gäste kommen langsam an, registrieren sich, machen Fotos
- Realistisches Nutzerverhalten mit Pausen

```bash
npm run normal
```

**Verhalten:**
| Phase | Dauer | VUs | Beschreibung |
|-------|-------|-----|--------------|
| Organisator | Start | 1 | Erstellt Session |
| Erste Gäste | 1m | 0→5 | Langsame Ankunft |
| Mehr Gäste | 2m | 5→15 | Event füllt sich |
| Peak | 3m | 15→20 | Event in vollem Gange |
| Gäste gehen | 2m | 20→10 | Langsamer Rückgang |
| Event endet | 2m | 10→0 | Abreise |

**Erwartetes Scaling:** Keine Skalierung, Server bei 2 Pods stabil.

---

### 2. `peak-traffic.ts` - Extreme Last (HPA + Autoscaler Trigger)

Simuliert einen viralen Moment / Großevent:
- Hunderte gleichzeitige Nutzer
- Massive Foto-Uploads
- CPU-intensive Registrierungen

```bash
npm run peak
```

**Verhalten:**
| Phase | Dauer | VUs | Beschreibung |
|-------|-------|-----|--------------|
| Ramp-up | 30s | 0→50 | Schneller Start |
| Anstieg | 1m | 50→150 | Starker Anstieg |
| Peak | 2m | 150→300 | HPA triggern |
| Extrem | 3m | 300→400 | Cluster Autoscaler triggern |
| Rückgang | 2m | 400→200 | Langsamer Rückgang |
| Normal | 1m | 200→50 | Normalisierung |
| Ende | 30s | 50→0 | Abschluss |

**Erwartetes Scaling:**
- HPA: Server Pods 2 → 10 → 25
- Cluster Autoscaler: Neue Worker Nodes bei Bedarf

---

## HPA Konfiguration

| Component | Min Pods | Max Pods | CPU Target | Memory Target |
|-----------|----------|----------|------------|---------------|
| **Server** | 2 | 25 | 70% | 80% |
| **Client** | 1 | 3 | 70% | 80% |

Der Client skaliert selten, da Nginx nur statische Files ausliefert (<5% CPU).

---

## Monitoring während des Tests

### Terminal-Befehle

```bash
# HPA-Status live beobachten
ssh ubuntu@<SERVER_IP> "sudo /var/lib/rancher/rke2/bin/kubectl --kubeconfig /etc/rancher/rke2/rke2.yaml get hpa -n party-pic -w"

# Pod-Skalierung beobachten
ssh ubuntu@<SERVER_IP> "sudo /var/lib/rancher/rke2/bin/kubectl --kubeconfig /etc/rancher/rke2/rke2.yaml get pods -n party-pic -w"

# Node-Skalierung (Cluster Autoscaler)
ssh ubuntu@<SERVER_IP> "sudo /var/lib/rancher/rke2/bin/kubectl --kubeconfig /etc/rancher/rke2/rke2.yaml get nodes -w"
```

### Prometheus Metriken

```bash
# Aktuelle Metriken abrufen
curl http://api.52.7.172.243.nip.io/metrics | grep partypic_
```

### Grafana Dashboards

URL: `http://grafana.52.7.172.243.nip.io`

Wichtige Panels:
1. **Server Pods (HPA)** - Aktuelle Anzahl Server Pods
2. **Client Pods (HPA)** - Aktuelle Anzahl Client Pods  
3. **Pod Scaling Timeline** - Graph über Zeit
4. **Active Sessions** - Anzahl aktiver Sessions
5. **Photos Uploaded** - Hochgeladene Fotos

---

## Architektur & Lastverteilung

### Warum Scaling funktioniert ohne Session-Probleme:

1. **JWT-Tokens sind stateless** - Jeder Pod kann Tokens validieren
2. **Session-Daten in PostgreSQL** - Zentral, nicht im Pod-Memory
3. **Fotos in S3** - Zentral, nicht auf einem Pod
4. **Kubernetes Service** - Verteilt Requests automatisch

**Fazit:** Ein User merkt nichts, egal auf welchem Pod er landet!

---

## Entwicklung

### Skripte bauen

```bash
npm run build
```

### Manuell ausführen

```bash
# Mit eigenen Optionen
k6 run --vus 50 --duration 2m dist/normal-traffic.js

# Andere API URL
k6 run --env BASE_URL=http://localhost:3000 dist/normal-traffic.js
```

---

## Troubleshooting

### "No sessions available"
Der Peak-Test braucht Sessions zum Beitreten. Die `setup()` Funktion erstellt initial 5 Sessions.

### HPA skaliert nicht
- CPU unter 70%? Test generiert nicht genug Last
- Prüfen: `kubectl describe hpa` für Events

### Fehler bei Registrierung
- Email-Uniqueness? Jeder VU generiert unique Emails
- DB Connection Pool erschöpft? Mehr Server Pods nötig
