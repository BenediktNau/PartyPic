# PartyPic – AWS Setup Guide

## Was wird deployed?

- **RKE2 Kubernetes Cluster** (1 Control Plane + N Worker Nodes via Auto Scaling Group)
- **RDS PostgreSQL** (managed Datenbank)
- **S3 Bucket** (Bildspeicher, Zugriff via Presigned URLs)
- **Monitoring Stack** (Prometheus, Grafana, Loki)
- **ArgoCD** (GitOps Deployment der App)

---

## Erreichbare Dienste nach dem Deploy

Nach `terraform apply` stehen folgende URLs zur Verfügung. Die `<IP>` ist die Elastic IP, die Terraform als Output `loadbalancer_ip` ausgibt.

### PartyPic App – `https://app.<IP>.nip.io`

Die Haupt-Webanwendung. Über diese URL interagieren Host und Gäste.

**Routen im Frontend:**

| Pfad | Beschreibung |
|------|-------------|
| `/` | Startseite – Login/Registrierung für den Host, Session erstellen |
| `/session/<sessionId>` | Session-Ansicht für Gäste – Kamera, Galerie, Missionen |
| `/admin` | Admin-Bereich für den Host – Missionen verwalten |

**API-Endpunkte** (alle unter `https://app.<IP>.nip.io`):

| Endpunkt | Methode | Beschreibung |
|----------|---------|-------------|
| `/auth/register` | POST | Host-Account registrieren |
| `/auth/login` | POST | Host einloggen, JWT Token erhalten |
| `/sessions/create` | POST | Neue Party-Session anlegen (JWT required) |
| `/sessions/get?sessionId=...` | GET | Session-Details abrufen |
| `/sessions/setmissions` | POST | Foto-Missionen für Session setzen (JWT required) |
| `/sessions/registerSessionUser` | POST | Gast tritt Session bei (nur Username nötig) |
| `/sessions/loginSessionUser` | POST | Gast-Login in bestehende Session |
| `/sessions/heartbeat` | POST | Online-Status des Gastes aktualisieren (alle 30s) |
| `/pictures/init-upload` | POST | Presigned S3-Upload-URL anfordern |
| `/pictures/finalize-upload` | POST | Upload in DB bestätigen |
| `/pictures/session?sessionId=...` | GET | Alle Bilder einer Session abrufen |
| `/metrics` | GET | Prometheus-Metriken (z.B. Anzahl Sessions, Fotos) |

---

### Grafana – `http://grafana.<IP>.nip.io`

Monitoring-Dashboard für den Cluster und die Applikation.

- **Login:** `admin` / (das in `terraform.tfvars` gesetzte `grafana_admin_password`)
- **Datenquellen:** Prometheus (Metriken) + Loki (Logs)
- **Verfügbare Metriken:** Anzahl erstellter Sessions, hochgeladene Bilder, HTTP-Requests, Node-CPU/RAM, Pod-Status

---

### ArgoCD – `http://argo.<IP>.nip.io`

GitOps-Dashboard – zeigt den Sync-Status beider Kubernetes-Deployments.

- **Login:** `admin` / (Passwort per SSH abrufen: `kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d`)
- **Apps:** `party-pic-client-application` und `party-pic-server-application`
- Jeder Git-Push auf den konfigurierten Branch triggert automatisch ein Re-Deployment

---

## Was kann die Applikation?

### Aus Sicht des Hosts (registrierter User)

1. **Account erstellen** über die Startseite (Register)
2. **Session starten** – erzeugt eine eindeutige Session-ID
3. **Missionen definieren** im Admin-Bereich:
   - Einzeln per Textfeld eingeben
   - Als `.txt`-Datei mit einer Mission pro Zeile hochladen
   - Missionen jederzeit entfernen
4. **Session-Link teilen** – Gäste rufen `https://app.<IP>.nip.io/session/<sessionId>` auf
5. **Galerie live verfolgen** – alle hochgeladenen Bilder erscheinen in der Galerie (Auto-Refresh alle 30s)

### Aus Sicht der Gäste (ohne Account)

1. **Session beitreten** über den Link des Hosts – nur ein Username wird benötigt
2. **Zufällige Mission** angezeigt bekommen (z.B. „Mach ein Foto vom DJ")
3. **Foto aufnehmen** direkt über die Webcam/Handykamera im Browser
4. **Foto hochladen** – direkter Upload via Presigned URL in S3 (kein Umweg über den Server)
5. **Galerie ansehen** – alle Fotos der Session in einer Grid-Ansicht mit Lightbox

---

## Voraussetzungen (lokal)

```bash
# Folgendes muss installiert sein:
terraform   # >= 1.0
aws CLI
ssh-keygen  # für SSH Key
```

---

## Schritt 1 – AWS Credentials setzen

Im AWS Academy Portal die temporären Credentials kopieren (Format: `[default] aws_access_key_id=...`), dann:

```bash
# Option A: Skript nutzen (empfohlen)
cat credentials.txt | ./terraform/set_aws_cred.sh

# Option B: Manuell in ~/.aws/credentials einfügen
```

> Die Credentials sind temporär (~4h). Vor jedem `terraform apply` neu setzen!

---

## Schritt 2 – `terraform.tfvars` anlegen

```bash
cd terraform/
cp terraform.tfvars.example terraform.tfvars
```

Dann `terraform.tfvars` befüllen:

```hcl
# RKE2 Cluster Join Secret (beliebiger langer String)
rke2_token = "mein-sehr-geheimes-token-123"

# Datenbank
partypic_db_password    = "sicheres_passwort"
partypic_db_name        = "partypicdb"
partypic_db_user        = "partypicuser"

# S3 (wird automatisch von AWS bereitgestellt)
partypic_s3_endpoint    = "https://s3.us-east-1.amazonaws.com"
partypic_s3_bucket_name = "mein-partypic-bucket"  # muss global unique sein!
partypic_s3_region      = "us-east-1"

# JWT Secret für die App (beliebiger langer String)
partypic_jwt_secret     = "mein-jwt-secret-xyz"

# Grafana
grafana_admin_password  = "grafana_passwort"

# Alertmanager (optional, für E-Mail Alerts)
alertmanager_smtp_username = ""
alertmanager_smtp_password = ""
```

---

## Schritt 3 – SSH Key setzen

Den eigenen Public Key in `terraform/variables.tf` bei `public_key` eintragen (Zeile 20), **oder** in `terraform.tfvars` überschreiben:

```hcl
public_key = "ssh-ed25519 AAAA... dein@rechner"
```

Den Key generieren falls noch keiner vorhanden:

```bash
ssh-keygen -t ed25519 -C "dein@email"
cat ~/.ssh/id_ed25519.pub
```

---

## Schritt 4 – Terraform ausführen

```bash
cd terraform/

terraform init

terraform plan   # Prüfen was deployed wird

terraform apply  # Deployment starten (~10-15 Min aufgrund RDS
                 # und S3 Bucket)
```

Am Ende gibt Terraform die URLs aus:

```
app_url            = "https://app.<IP>.nip.io"
grafana_url        = "http://grafana.<IP>.nip.io"
argocd_url         = "http://argo.<IP>.nip.io"
ssh_command_server = "ssh ubuntu@<IP>"
```

---

## Schritt 5 – Deployment verifizieren

```bash
# SSH auf den Control Plane
ssh ubuntu@<IP>

# Cluster Status prüfen
kubectl get nodes
kubectl get pods -A

# ArgoCD Apps prüfen
kubectl get applications -n argocd
```

---

## Schritt 6 – IP-Update (nach Neustart)
Das sollte eigentlich nicht mehr nötig sein. Hoffe ich zumindest 
Falls sich die Ingress-IP geändert hat (z.B. nach erneutem `terraform apply`):

```bash
./update_ip.sh
```

Das Skript holt die aktuelle IP, patcht die Helm `values.yaml` beider Apps und triggert einen ArgoCD Sync.

---

## Wichtige Hinweise für AWS Learning Account

| Thema | Hinweis |
|-------|---------|
| **Credentials** | Laufen nach ~4h ab – vor `terraform apply` neu setzen |
| **S3 Bucket Name** | Muss **global unique** sein (z.B. `partypic-vorname-2024`) |
| **Kosten** | `terraform destroy` nach dem Testen! RDS + EC2 + EIP kosten kontinuierlich |
| **Region** | Default ist `us-east-1` – im Learning Account nicht ändern |
| **AMI** | Das verwendete AMI (`ami-0ecb62995f68bb549`) ist Ubuntu in `us-east-1` |

---

## Infrastruktur aufräumen

```bash
cd terraform/
terraform destroy
```

> **Achtung:** `terraform destroy` entfernt **nicht** automatisch alle Ressourcen vollständig. Folgende Ressourcen müssen manuell in der AWS Console gelöscht werden:
>
> - **Elastic IP** – unter *EC2 → Elastic IPs* die zugehörige IP freigeben ("Release")
> - **Load Balancer** – unter *EC2 → Load Balancers* den vom Ingress-Controller erstellten NLB/ELB löschen
>
> Solange diese Ressourcen existieren, entstehen weiterhin Kosten.
