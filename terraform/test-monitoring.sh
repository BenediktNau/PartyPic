#!/bin/bash
# =============================================================================
# MONITORING STACK TEST SCRIPT (EXTENDED)
# =============================================================================
# Tests:
# - Basis-Infrastruktur (SSH, K8s, Taint)
# - Prometheus Stack (Prometheus, Node-Exporter, Kube-State-Metrics)
# - Alertmanager (Pod, HTTP, Alert Rules)
# - Grafana (Pod, HTTP, Datasources, Dashboards)
# - Loki Stack (Loki, Promtail)
# - Persistent Storage (PVCs)
# - Service Type Detection (NodePort vs LoadBalancer)
# =============================================================================

# Farben
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Server IP aus Terraform Output holen
SERVER_IP=$(terraform output -raw server_public_ip 2>/dev/null)

if [ -z "$SERVER_IP" ]; then
    echo "❌ Fehler: Konnte Server IP nicht ermitteln. Läuft terraform apply?"
    exit 1
fi

# SSH-Befehl Wrapper (früh definieren für Service Type Detection)
SSH_CMD="ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ubuntu@$SERVER_IP"
KUBECTL_PREFIX="export PATH=/var/lib/rancher/rke2/bin:\$PATH && export KUBECONFIG=/home/ubuntu/.kube/config && kubectl"

# Service Type DIREKT aus dem Cluster lesen (zuverlässiger als lokale Dateien)
ACTUAL_SVC_TYPE=$($SSH_CMD "$KUBECTL_PREFIX get svc prometheus-stack-kube-prom-prometheus -n monitoring -o jsonpath='{.spec.type}'" 2>/dev/null)
if [ "$ACTUAL_SVC_TYPE" == "LoadBalancer" ]; then
    SERVICE_TYPE="LoadBalancer"
elif [ "$ACTUAL_SVC_TYPE" == "NodePort" ]; then
    SERVICE_TYPE="NodePort"
else
    # Fallback zu lokaler Config
    SERVICE_TYPE=$(grep -E "^service_type\s*=" terraform.tfvars 2>/dev/null | sed 's/.*"\(.*\)"/\1/')
    if [ -z "$SERVICE_TYPE" ]; then
        SERVICE_TYPE=$(grep -A2 'variable "service_type"' variables.tf | grep 'default' | sed 's/.*"\(.*\)"/\1/')
    fi
    if [ -z "$SERVICE_TYPE" ]; then
        SERVICE_TYPE="NodePort"
    fi
fi

# Grafana Passwort aus terraform.tfvars oder variables.tf holen
GRAFANA_PASS=$(grep -E "^grafana_admin_password\s*=" terraform.tfvars 2>/dev/null | sed 's/.*"\(.*\)"/\1/')
if [ -z "$GRAFANA_PASS" ]; then
    GRAFANA_PASS=$(grep -A5 'grafana_admin_password' variables.tf | grep 'default' | sed 's/.*"\(.*\)"/\1/')
fi
if [ -z "$GRAFANA_PASS" ]; then
    GRAFANA_PASS="admin123"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
echo "║                    🔍 MONITORING STACK TEST REPORT                            ║"
echo "║                    Server: $SERVER_IP                               ║"
echo -e "║                    Service Type: ${CYAN}$SERVICE_TYPE${NC}                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Arrays für Ergebnisse und Fehlerdetails
declare -A RESULTS
declare -A ERROR_DETAILS

# LoadBalancer URLs (werden dynamisch befüllt)
PROMETHEUS_URL=""
GRAFANA_URL=""
ALERTMANAGER_URL=""

# Funktion für Fortschritt
run_test() {
    local name="$1"
    echo -n "Testing $name... "
}

# Funktion: LoadBalancer Endpoint ermitteln
get_lb_endpoint() {
    local service_name="$1"
    local namespace="$2"
    local port="$3"
    
    # Hole External IP/Hostname vom LoadBalancer
    local lb_info=$($SSH_CMD "$KUBECTL_PREFIX get svc $service_name -n $namespace -o jsonpath='{.status.loadBalancer.ingress[0].hostname}{.status.loadBalancer.ingress[0].ip}' 2>/dev/null")
    
    if [ -n "$lb_info" ] && [ "$lb_info" != "" ]; then
        echo "http://$lb_info:$port"
    else
        echo ""
    fi
}

# =============================================================================
# INFRASTRUCTURE TESTS
# =============================================================================

# --- TEST: SSH Verbindung ---
run_test "SSH Connection"
if $SSH_CMD "echo ok" &>/dev/null; then
    RESULTS["SSH"]="OK"
    echo -e "${GREEN}OK${NC}"
else
    RESULTS["SSH"]="FAIL"
    ERROR_DETAILS["SSH"]="SSH-Verbindung zu $SERVER_IP nicht möglich. Prüfe Security Group und Key."
    echo -e "${RED}FAIL${NC}"
    echo "❌ SSH nicht erreichbar - breche ab"
    exit 1
fi

# --- TEST: Kubernetes Cluster ---
run_test "Kubernetes Cluster"
K8S_OUTPUT=$($SSH_CMD "$KUBECTL_PREFIX get nodes --no-headers 2>&1")
K8S_STATUS=$(echo "$K8S_OUTPUT" | grep -c Ready)
if [ "$K8S_STATUS" -ge 1 ] 2>/dev/null; then
    RESULTS["Kubernetes"]="OK"
    echo -e "${GREEN}OK ($K8S_STATUS nodes ready)${NC}"
else
    RESULTS["Kubernetes"]="FAIL"
    ERROR_DETAILS["Kubernetes"]="Nodes nicht Ready:\n$K8S_OUTPUT"
    echo -e "${RED}FAIL${NC}"
fi

# --- TEST: Taint entfernt? ---
run_test "Taint Removal"
TAINT_OUTPUT=$($SSH_CMD "$KUBECTL_PREFIX describe nodes 2>&1 | grep -A5 Taints")
TAINT_CHECK=$(echo "$TAINT_OUTPUT" | grep -c 'node.cloudprovider.kubernetes.io/uninitialized')
if [ "$TAINT_CHECK" == "0" ] 2>/dev/null; then
    RESULTS["Taint-Removal"]="OK"
    echo -e "${GREEN}OK (Taint entfernt)${NC}"
else
    RESULTS["Taint-Removal"]="WARN"
    ERROR_DETAILS["Taint-Removal"]="Taint noch vorhanden (wird automatisch entfernt):\n$TAINT_OUTPUT"
    echo -e "${YELLOW}PENDING${NC}"
fi

# =============================================================================
# SERVICE TYPE DETECTION & ENDPOINT SETUP
# =============================================================================

if [ "$SERVICE_TYPE" == "LoadBalancer" ]; then
    echo ""
    echo -e "${CYAN}▶ LoadBalancer Mode - Ermittle externe Endpoints...${NC}"
    
    # Warte kurz auf LoadBalancer Provisioning
    sleep 2
    
    # Prometheus LoadBalancer
    run_test "Prometheus LoadBalancer"
    PROM_SVC_OUTPUT=$($SSH_CMD "$KUBECTL_PREFIX get svc -n monitoring 2>&1 | grep prometheus-stack-kube-prom-prometheus")
    PROM_LB_HOST=$($SSH_CMD "$KUBECTL_PREFIX get svc prometheus-stack-kube-prom-prometheus -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].hostname}{.status.loadBalancer.ingress[0].ip}' 2>/dev/null")
    PROM_LB_PORT=$($SSH_CMD "$KUBECTL_PREFIX get svc prometheus-stack-kube-prom-prometheus -n monitoring -o jsonpath='{.spec.ports[0].port}' 2>/dev/null")
    
    if [ -n "$PROM_LB_HOST" ] && [ "$PROM_LB_HOST" != "" ]; then
        PROMETHEUS_URL="http://$PROM_LB_HOST:${PROM_LB_PORT:-9090}"
        RESULTS["Prometheus-LB"]="OK"
        echo -e "${GREEN}OK ($PROM_LB_HOST)${NC}"
    else
        PROM_LB_STATUS=$($SSH_CMD "$KUBECTL_PREFIX get svc prometheus-stack-kube-prom-prometheus -n monitoring -o jsonpath='{.status.loadBalancer}' 2>/dev/null")
        if echo "$PROM_SVC_OUTPUT" | grep -q "pending\|<pending>"; then
            RESULTS["Prometheus-LB"]="WARN"
            ERROR_DETAILS["Prometheus-LB"]="LoadBalancer pending. AWS CCM benötigt Zeit.\nService: $PROM_SVC_OUTPUT"
            echo -e "${YELLOW}PENDING${NC}"
        else
            # Fallback zu NodePort
            PROMETHEUS_URL="http://$SERVER_IP:30090"
            RESULTS["Prometheus-LB"]="WARN"
            ERROR_DETAILS["Prometheus-LB"]="Kein LoadBalancer Endpoint. Fallback zu NodePort.\nService: $PROM_SVC_OUTPUT\nStatus: $PROM_LB_STATUS"
            echo -e "${YELLOW}FALLBACK (NodePort)${NC}"
        fi
    fi
    
    # Grafana LoadBalancer
    run_test "Grafana LoadBalancer"
    GRAFANA_SVC_OUTPUT=$($SSH_CMD "$KUBECTL_PREFIX get svc -n monitoring 2>&1 | grep -E '^grafana\s'")
    GRAFANA_LB_HOST=$($SSH_CMD "$KUBECTL_PREFIX get svc grafana -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].hostname}{.status.loadBalancer.ingress[0].ip}' 2>/dev/null")
    GRAFANA_LB_PORT=$($SSH_CMD "$KUBECTL_PREFIX get svc grafana -n monitoring -o jsonpath='{.spec.ports[0].port}' 2>/dev/null")
    
    if [ -n "$GRAFANA_LB_HOST" ] && [ "$GRAFANA_LB_HOST" != "" ]; then
        GRAFANA_URL="http://$GRAFANA_LB_HOST:${GRAFANA_LB_PORT:-80}"
        RESULTS["Grafana-LB"]="OK"
        echo -e "${GREEN}OK ($GRAFANA_LB_HOST)${NC}"
    else
        if echo "$GRAFANA_SVC_OUTPUT" | grep -q "pending\|<pending>"; then
            RESULTS["Grafana-LB"]="WARN"
            ERROR_DETAILS["Grafana-LB"]="LoadBalancer pending.\nService: $GRAFANA_SVC_OUTPUT"
            echo -e "${YELLOW}PENDING${NC}"
        else
            GRAFANA_URL="http://$SERVER_IP:30080"
            RESULTS["Grafana-LB"]="WARN"
            ERROR_DETAILS["Grafana-LB"]="Kein LoadBalancer Endpoint. Fallback zu NodePort.\nService: $GRAFANA_SVC_OUTPUT"
            echo -e "${YELLOW}FALLBACK (NodePort)${NC}"
        fi
    fi
    
    # Alertmanager LoadBalancer
    run_test "Alertmanager LoadBalancer"
    AM_SVC_OUTPUT=$($SSH_CMD "$KUBECTL_PREFIX get svc -n monitoring 2>&1 | grep alertmanager")
    AM_LB_HOST=$($SSH_CMD "$KUBECTL_PREFIX get svc prometheus-stack-kube-prom-alertmanager -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].hostname}{.status.loadBalancer.ingress[0].ip}' 2>/dev/null")
    AM_LB_PORT=$($SSH_CMD "$KUBECTL_PREFIX get svc prometheus-stack-kube-prom-alertmanager -n monitoring -o jsonpath='{.spec.ports[0].port}' 2>/dev/null")
    
    if [ -n "$AM_LB_HOST" ] && [ "$AM_LB_HOST" != "" ]; then
        ALERTMANAGER_URL="http://$AM_LB_HOST:${AM_LB_PORT:-9093}"
        RESULTS["Alertmanager-LB"]="OK"
        echo -e "${GREEN}OK ($AM_LB_HOST)${NC}"
    else
        if echo "$AM_SVC_OUTPUT" | grep -q "pending\|<pending>"; then
            RESULTS["Alertmanager-LB"]="WARN"
            ERROR_DETAILS["Alertmanager-LB"]="LoadBalancer pending.\nService: $AM_SVC_OUTPUT"
            echo -e "${YELLOW}PENDING${NC}"
        else
            ALERTMANAGER_URL="http://$SERVER_IP:30903"
            RESULTS["Alertmanager-LB"]="WARN"
            ERROR_DETAILS["Alertmanager-LB"]="Kein LoadBalancer Endpoint. Fallback zu NodePort.\nService: $AM_SVC_OUTPUT"
            echo -e "${YELLOW}FALLBACK (NodePort)${NC}"
        fi
    fi
    
    echo ""
else
    # NodePort Mode - Standard URLs
    PROMETHEUS_URL="http://$SERVER_IP:30090"
    GRAFANA_URL="http://$SERVER_IP:30080"
    ALERTMANAGER_URL="http://$SERVER_IP:30903"
fi

# =============================================================================
# PROMETHEUS TESTS
# =============================================================================

# --- TEST: Prometheus Pod ---
run_test "Prometheus Pod"
PROM_OUTPUT=$($SSH_CMD "$KUBECTL_PREFIX get pods -n monitoring 2>&1 | grep prometheus-prometheus-stack")
PROM_POD=$(echo "$PROM_OUTPUT" | grep -c Running)
if [ "$PROM_POD" -ge 1 ] 2>/dev/null; then
    RESULTS["Prometheus-Pod"]="OK"
    echo -e "${GREEN}OK${NC}"
else
    RESULTS["Prometheus-Pod"]="FAIL"
    ERROR_DETAILS["Prometheus-Pod"]="Pod Status:\n$PROM_OUTPUT\n\nAlle Pods:\n$($SSH_CMD "$KUBECTL_PREFIX get pods -n monitoring 2>&1")"
    echo -e "${RED}FAIL${NC}"
fi

# --- TEST: Prometheus HTTP ---
run_test "Prometheus HTTP"
PROM_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$PROMETHEUS_URL/-/ready" 2>/dev/null)
if [ "$PROM_HTTP" == "200" ]; then
    RESULTS["Prometheus-HTTP"]="OK"
    echo -e "${GREEN}OK (HTTP $PROM_HTTP)${NC}"
else
    RESULTS["Prometheus-HTTP"]="FAIL"
    ERROR_DETAILS["Prometheus-HTTP"]="HTTP Status: $PROM_HTTP (erwartet: 200)\nURL: $PROMETHEUS_URL/-/ready"
    echo -e "${RED}FAIL${NC}"
fi

# --- TEST: Prometheus Targets ---
run_test "Prometheus Scraping"
PROM_TARGETS_OUTPUT=$(curl -s "$PROMETHEUS_URL/api/v1/targets" 2>/dev/null)
PROM_TARGETS_UP=$(echo "$PROM_TARGETS_OUTPUT" | grep -c '"health":"up"')
PROM_TARGETS_DOWN=$(echo "$PROM_TARGETS_OUTPUT" | grep -c '"health":"down"')
if [ "$PROM_TARGETS_UP" -ge 1 ] 2>/dev/null; then
    RESULTS["Prometheus-Scraping"]="OK"
    echo -e "${GREEN}OK ($PROM_TARGETS_UP up, $PROM_TARGETS_DOWN down)${NC}"
else
    RESULTS["Prometheus-Scraping"]="FAIL"
    ERROR_DETAILS["Prometheus-Scraping"]="Keine Targets erreichbar.\nTargets Up: $PROM_TARGETS_UP\nTargets Down: $PROM_TARGETS_DOWN"
    echo -e "${RED}FAIL${NC}"
fi

# --- TEST: Alert Rules ---
run_test "Prometheus Alert Rules"
ALERT_RULES_OUTPUT=$(curl -s "$PROMETHEUS_URL/api/v1/rules" 2>/dev/null)
ALERT_RULES_COUNT=$(echo "$ALERT_RULES_OUTPUT" | grep -o '"name":"[^"]*"' | wc -l)
CUSTOM_ALERTS=$(echo "$ALERT_RULES_OUTPUT" | grep -c "HighCPUUsage\|HighMemoryUsage\|DiskSpaceLow\|PodCrashLooping\|NodeNotReady\|HighResponseTime\|HighErrorRate")
if [ "$ALERT_RULES_COUNT" -ge 1 ] 2>/dev/null; then
    if [ "$CUSTOM_ALERTS" -ge 1 ] 2>/dev/null; then
        RESULTS["Alert-Rules"]="OK"
        echo -e "${GREEN}OK ($ALERT_RULES_COUNT rules, $CUSTOM_ALERTS custom)${NC}"
    else
        RESULTS["Alert-Rules"]="WARN"
        ERROR_DETAILS["Alert-Rules"]="Alert Rules geladen, aber Custom Alerts fehlen.\nErwartet: HighCPUUsage, HighMemoryUsage, DiskSpaceLow, PodCrashLooping, NodeNotReady, HighResponseTime"
        echo -e "${YELLOW}PARTIAL ($ALERT_RULES_COUNT rules, custom fehlen)${NC}"
    fi
else
    RESULTS["Alert-Rules"]="FAIL"
    ERROR_DETAILS["Alert-Rules"]="Keine Alert Rules gefunden.\nAPI Response: $(echo "$ALERT_RULES_OUTPUT" | head -c 500)"
    echo -e "${RED}FAIL${NC}"
fi

# =============================================================================
# ALERTMANAGER TESTS
# =============================================================================

# --- TEST: Alertmanager Pod ---
run_test "Alertmanager Pod"
AM_OUTPUT=$($SSH_CMD "$KUBECTL_PREFIX get pods -n monitoring 2>&1 | grep alertmanager")
AM_POD=$(echo "$AM_OUTPUT" | grep -c Running)
if [ "$AM_POD" -ge 1 ] 2>/dev/null; then
    RESULTS["Alertmanager-Pod"]="OK"
    echo -e "${GREEN}OK${NC}"
else
    RESULTS["Alertmanager-Pod"]="FAIL"
    ERROR_DETAILS["Alertmanager-Pod"]="Pod Status:\n$AM_OUTPUT\n\nPrüfe ob alertmanager_enabled=true in variables.tf"
    echo -e "${RED}FAIL${NC}"
fi

# --- TEST: Alertmanager HTTP ---
run_test "Alertmanager HTTP"
AM_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$ALERTMANAGER_URL/-/ready" 2>/dev/null)
if [ "$AM_HTTP" == "200" ]; then
    RESULTS["Alertmanager-HTTP"]="OK"
    echo -e "${GREEN}OK (HTTP $AM_HTTP)${NC}"
else
    RESULTS["Alertmanager-HTTP"]="FAIL"
    ERROR_DETAILS["Alertmanager-HTTP"]="HTTP Status: $AM_HTTP (erwartet: 200)\nURL: $ALERTMANAGER_URL/-/ready"
    echo -e "${RED}FAIL${NC}"
fi

# --- TEST: Alertmanager Config (Email) ---
run_test "Alertmanager Email Config"
AM_CONFIG_OUTPUT=$(curl -s "$ALERTMANAGER_URL/api/v2/status" 2>/dev/null)
AM_EMAIL_CONFIG=$(echo "$AM_CONFIG_OUTPUT" | grep -c "smtp\|email")
if [ "$AM_EMAIL_CONFIG" -ge 1 ] 2>/dev/null; then
    RESULTS["Alertmanager-Email"]="OK"
    echo -e "${GREEN}OK (Email konfiguriert)${NC}"
else
    # Prüfe ob überhaupt Config geladen
    if echo "$AM_CONFIG_OUTPUT" | grep -q "receivers"; then
        RESULTS["Alertmanager-Email"]="WARN"
        ERROR_DETAILS["Alertmanager-Email"]="Alertmanager läuft, aber Email-Config nicht erkannt.\nPrüfe SMTP-Variablen in terraform.tfvars"
        echo -e "${YELLOW}WARN (Config vorhanden, Email unklar)${NC}"
    else
        RESULTS["Alertmanager-Email"]="FAIL"
        ERROR_DETAILS["Alertmanager-Email"]="Alertmanager Config nicht abrufbar.\nResponse: $(echo "$AM_CONFIG_OUTPUT" | head -c 300)"
        echo -e "${RED}FAIL${NC}"
    fi
fi

# --- TEST: Alertmanager Test-Alert senden ---
run_test "Alertmanager Test-Alert"
if [ "$AM_HTTP" == "200" ]; then
    # Sende Test-Alert an Alertmanager
    TEST_ALERT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ALERTMANAGER_URL/api/v2/alerts" \
        -H "Content-Type: application/json" \
        -d '[{
            "labels": {
                "alertname": "MonitoringTestAlert",
                "severity": "info",
                "source": "test-monitoring-script",
                "instance": "'"$SERVER_IP"'"
            },
            "annotations": {
                "summary": "🧪 Monitoring Test-Alert",
                "description": "Dies ist ein automatischer Test-Alert vom test-monitoring.sh Skript. Wenn du diese Email erhältst, funktioniert die Alertmanager Email-Konfiguration korrekt!"
            },
            "startsAt": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
            "endsAt": "'"$(date -u -d '+5 minutes' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v+5M +%Y-%m-%dT%H:%M:%SZ)"'",
            "generatorURL": "http://'"$SERVER_IP"'/test-monitoring"
        }]' 2>/dev/null)
    
    TEST_ALERT_HTTP=$(echo "$TEST_ALERT_RESPONSE" | tail -1)
    
    if [ "$TEST_ALERT_HTTP" == "200" ] || [ "$TEST_ALERT_HTTP" == "202" ]; then
        RESULTS["Alertmanager-TestAlert"]="OK"
        echo -e "${GREEN}OK (Alert gesendet - Email sollte in ~30s ankommen)${NC}"
    else
        RESULTS["Alertmanager-TestAlert"]="WARN"
        ERROR_DETAILS["Alertmanager-TestAlert"]="Test-Alert konnte nicht gesendet werden.\nHTTP Status: $TEST_ALERT_HTTP\nResponse: $(echo "$TEST_ALERT_RESPONSE" | head -5)"
        echo -e "${YELLOW}WARN (HTTP $TEST_ALERT_HTTP)${NC}"
    fi
else
    RESULTS["Alertmanager-TestAlert"]="FAIL"
    ERROR_DETAILS["Alertmanager-TestAlert"]="Alertmanager nicht erreichbar, Test-Alert übersprungen."
    echo -e "${RED}SKIP (Alertmanager nicht erreichbar)${NC}"
fi

# =============================================================================
# GRAFANA TESTS
# =============================================================================

# --- TEST: Grafana Pod ---
run_test "Grafana Pod"
GRAFANA_OUTPUT=$($SSH_CMD "$KUBECTL_PREFIX get pods -n monitoring 2>&1 | grep grafana")
GRAFANA_POD=$(echo "$GRAFANA_OUTPUT" | grep -v alertmanager | grep -c Running)
if [ "$GRAFANA_POD" -ge 1 ] 2>/dev/null; then
    RESULTS["Grafana-Pod"]="OK"
    echo -e "${GREEN}OK${NC}"
else
    RESULTS["Grafana-Pod"]="FAIL"
    ERROR_DETAILS["Grafana-Pod"]="Pod Status:\n$GRAFANA_OUTPUT"
    echo -e "${RED}FAIL${NC}"
fi

# --- TEST: Grafana HTTP ---
run_test "Grafana HTTP"
GRAFANA_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$GRAFANA_URL/api/health" 2>/dev/null)
if [ "$GRAFANA_HTTP" == "200" ]; then
    RESULTS["Grafana-HTTP"]="OK"
    echo -e "${GREEN}OK (HTTP $GRAFANA_HTTP)${NC}"
else
    RESULTS["Grafana-HTTP"]="FAIL"
    ERROR_DETAILS["Grafana-HTTP"]="HTTP Status: $GRAFANA_HTTP (erwartet: 200)\nURL: $GRAFANA_URL/api/health"
    echo -e "${RED}FAIL${NC}"
fi

# --- TEST: Grafana Datasources ---
run_test "Grafana Datasources"
DS_RESPONSE=""
for PASS in "$GRAFANA_PASS" "admin123" "admin"; do
    DS_RESPONSE=$(curl -s -u "admin:$PASS" "$GRAFANA_URL/api/datasources" 2>/dev/null)
    if echo "$DS_RESPONSE" | grep -q "Prometheus"; then
        GRAFANA_PASS="$PASS"
        break
    fi
done
DS_PROMETHEUS=$(echo "$DS_RESPONSE" | grep -c '"type":"prometheus"')
DS_LOKI=$(echo "$DS_RESPONSE" | grep -c '"type":"loki"')
if [ "$DS_PROMETHEUS" -ge 1 ] && [ "$DS_LOKI" -ge 1 ] 2>/dev/null; then
    RESULTS["Grafana-Datasources"]="OK"
    echo -e "${GREEN}OK (Prometheus + Loki)${NC}"
elif [ "$DS_PROMETHEUS" -ge 1 ] 2>/dev/null; then
    RESULTS["Grafana-Datasources"]="WARN"
    ERROR_DETAILS["Grafana-Datasources"]="Nur Prometheus Datasource gefunden. Loki fehlt."
    echo -e "${YELLOW}PARTIAL (nur Prometheus)${NC}"
else
    RESULTS["Grafana-Datasources"]="FAIL"
    ERROR_DETAILS["Grafana-Datasources"]="Keine Datasources gefunden.\nResponse: $(echo "$DS_RESPONSE" | head -c 300)"
    echo -e "${RED}FAIL${NC}"
fi

# --- TEST: Grafana Dashboards ---
run_test "Grafana Dashboards"
DASHBOARDS_RESPONSE=$(curl -s -u "admin:$GRAFANA_PASS" "$GRAFANA_URL/api/search?type=dash-db" 2>/dev/null)
DASHBOARD_COUNT=$(echo "$DASHBOARDS_RESPONSE" | grep -o '"uid":' | wc -l)
CLUSTER_OVERVIEW=$(echo "$DASHBOARDS_RESPONSE" | grep -c "cluster-overview\|Cluster Overview")
NODE_DETAILS=$(echo "$DASHBOARDS_RESPONSE" | grep -c "node-details\|Node Details")
K8S_OVERVIEW=$(echo "$DASHBOARDS_RESPONSE" | grep -c "kubernetes-overview\|Kubernetes Overview")
PARTYPIC=$(echo "$DASHBOARDS_RESPONSE" | grep -c "partypic\|PartyPic")

if [ "$DASHBOARD_COUNT" -ge 4 ] 2>/dev/null; then
    RESULTS["Grafana-Dashboards"]="OK"
    echo -e "${GREEN}OK ($DASHBOARD_COUNT dashboards)${NC}"
elif [ "$DASHBOARD_COUNT" -ge 1 ] 2>/dev/null; then
    RESULTS["Grafana-Dashboards"]="WARN"
    ERROR_DETAILS["Grafana-Dashboards"]="Nur $DASHBOARD_COUNT Dashboards gefunden (erwartet: 4).\nVorhanden: Cluster=$CLUSTER_OVERVIEW, Node=$NODE_DETAILS, K8s=$K8S_OVERVIEW, PartyPic=$PARTYPIC"
    echo -e "${YELLOW}PARTIAL ($DASHBOARD_COUNT dashboards)${NC}"
else
    RESULTS["Grafana-Dashboards"]="FAIL"
    ERROR_DETAILS["Grafana-Dashboards"]="Keine Dashboards gefunden.\nResponse: $(echo "$DASHBOARDS_RESPONSE" | head -c 300)"
    echo -e "${RED}FAIL${NC}"
fi

# =============================================================================
# LOKI TESTS
# =============================================================================

# --- TEST: Loki Pod ---
run_test "Loki Pod"
LOKI_OUTPUT=$($SSH_CMD "$KUBECTL_PREFIX get pods -n monitoring 2>&1 | grep loki")
LOKI_POD=$(echo "$LOKI_OUTPUT" | grep "loki-stack-0\|loki-0" | grep -c Running)
if [ "$LOKI_POD" -ge 1 ] 2>/dev/null; then
    RESULTS["Loki-Pod"]="OK"
    echo -e "${GREEN}OK${NC}"
else
    RESULTS["Loki-Pod"]="FAIL"
    ERROR_DETAILS["Loki-Pod"]="Pod Status:\n$LOKI_OUTPUT"
    echo -e "${RED}FAIL${NC}"
fi

# --- TEST: Promtail Pod ---
run_test "Promtail Pods"
PROMTAIL_OUTPUT=$($SSH_CMD "$KUBECTL_PREFIX get pods -n monitoring 2>&1 | grep promtail")
PROMTAIL_POD=$(echo "$PROMTAIL_OUTPUT" | grep -c Running)
EXPECTED_NODES=$($SSH_CMD "$KUBECTL_PREFIX get nodes --no-headers 2>&1 | wc -l")
if [ "$PROMTAIL_POD" -ge "$EXPECTED_NODES" ] 2>/dev/null; then
    RESULTS["Promtail-Pod"]="OK"
    echo -e "${GREEN}OK ($PROMTAIL_POD/$EXPECTED_NODES nodes)${NC}"
elif [ "$PROMTAIL_POD" -ge 1 ] 2>/dev/null; then
    RESULTS["Promtail-Pod"]="WARN"
    ERROR_DETAILS["Promtail-Pod"]="Nur $PROMTAIL_POD von $EXPECTED_NODES Promtail Pods laufen.\n$PROMTAIL_OUTPUT"
    echo -e "${YELLOW}PARTIAL ($PROMTAIL_POD/$EXPECTED_NODES)${NC}"
else
    RESULTS["Promtail-Pod"]="FAIL"
    ERROR_DETAILS["Promtail-Pod"]="Keine Promtail Pods gefunden:\n$PROMTAIL_OUTPUT"
    echo -e "${RED}FAIL${NC}"
fi

# =============================================================================
# NODE METRICS TESTS
# =============================================================================

# --- TEST: Node-Exporter ---
run_test "Node-Exporter Pods"
NODE_EXP_OUTPUT=$($SSH_CMD "$KUBECTL_PREFIX get pods -n monitoring 2>&1 | grep node-exporter")
NODE_EXP=$(echo "$NODE_EXP_OUTPUT" | grep -c Running)
if [ "$NODE_EXP" -ge "$EXPECTED_NODES" ] 2>/dev/null; then
    RESULTS["Node-Exporter"]="OK"
    echo -e "${GREEN}OK ($NODE_EXP/$EXPECTED_NODES nodes)${NC}"
elif [ "$NODE_EXP" -ge 1 ] 2>/dev/null; then
    RESULTS["Node-Exporter"]="WARN"
    ERROR_DETAILS["Node-Exporter"]="Nur $NODE_EXP von $EXPECTED_NODES Node-Exporter Pods.\n$NODE_EXP_OUTPUT"
    echo -e "${YELLOW}PARTIAL ($NODE_EXP/$EXPECTED_NODES)${NC}"
else
    RESULTS["Node-Exporter"]="FAIL"
    ERROR_DETAILS["Node-Exporter"]="Keine Node-Exporter Pods:\n$NODE_EXP_OUTPUT"
    echo -e "${RED}FAIL${NC}"
fi

# --- TEST: Kube-State-Metrics ---
run_test "Kube-State-Metrics Pod"
KSM_OUTPUT=$($SSH_CMD "$KUBECTL_PREFIX get pods -n monitoring 2>&1 | grep kube-state-metrics")
KSM=$(echo "$KSM_OUTPUT" | grep -c Running)
if [ "$KSM" -ge 1 ] 2>/dev/null; then
    RESULTS["Kube-State-Metrics"]="OK"
    echo -e "${GREEN}OK${NC}"
else
    RESULTS["Kube-State-Metrics"]="FAIL"
    ERROR_DETAILS["Kube-State-Metrics"]="Pod Status:\n$KSM_OUTPUT"
    echo -e "${RED}FAIL${NC}"
fi

# =============================================================================
# STORAGE TESTS
# =============================================================================

# --- TEST: PVCs ---
run_test "Persistent Volumes"
PVC_OUTPUT=$($SSH_CMD "$KUBECTL_PREFIX get pvc -n monitoring 2>&1")
PVCS_BOUND=$(echo "$PVC_OUTPUT" | grep -c Bound)
PVCS_PENDING=$(echo "$PVC_OUTPUT" | grep -c Pending)
if [ "$PVCS_BOUND" -ge 3 ] 2>/dev/null; then
    RESULTS["Persistent-Storage"]="OK"
    echo -e "${GREEN}OK ($PVCS_BOUND PVCs bound)${NC}"
elif [ "$PVCS_BOUND" -ge 1 ] 2>/dev/null; then
    RESULTS["Persistent-Storage"]="WARN"
    ERROR_DETAILS["Persistent-Storage"]="Nur $PVCS_BOUND PVCs bound, $PVCS_PENDING pending.\n$PVC_OUTPUT"
    echo -e "${YELLOW}PARTIAL ($PVCS_BOUND bound, $PVCS_PENDING pending)${NC}"
else
    RESULTS["Persistent-Storage"]="FAIL"
    ERROR_DETAILS["Persistent-Storage"]="Keine PVCs bound:\n$PVC_OUTPUT\n\nStorageClass:\n$($SSH_CMD "$KUBECTL_PREFIX get storageclass 2>&1")"
    echo -e "${RED}FAIL${NC}"
fi

# --- TEST: StorageClass ---
run_test "StorageClass (local-path)"
SC_OUTPUT=$($SSH_CMD "$KUBECTL_PREFIX get storageclass 2>&1")
SC_LOCAL=$(echo "$SC_OUTPUT" | grep -c "local-path")
if [ "$SC_LOCAL" -ge 1 ] 2>/dev/null; then
    RESULTS["StorageClass"]="OK"
    echo -e "${GREEN}OK${NC}"
else
    RESULTS["StorageClass"]="FAIL"
    ERROR_DETAILS["StorageClass"]="local-path StorageClass nicht gefunden:\n$SC_OUTPUT"
    echo -e "${RED}FAIL${NC}"
fi

# =============================================================================
# ERGEBNIS-TABELLE
# =============================================================================

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
echo "║                           📊 ERGEBNIS-TABELLE                                 ║"
echo "╠═══════════════════════════════════════════════════════════════════════════════╣"
echo "║ KOMPONENTE                          │ STATUS       ║"
echo "╠═══════════════════════════════════════════════════════════════════════════════╣"

# Reihenfolge der Tests - dynamisch basierend auf Service Type
if [ "$SERVICE_TYPE" == "LoadBalancer" ]; then
    TEST_ORDER=(
        "SSH"
        "Kubernetes"
        "Taint-Removal"
        "---LOADBALANCER---"
        "Prometheus-LB"
        "Grafana-LB"
        "Alertmanager-LB"
        "---PROMETHEUS---"
        "Prometheus-Pod"
        "Prometheus-HTTP"
        "Prometheus-Scraping"
        "Alert-Rules"
        "---ALERTMANAGER---"
        "Alertmanager-Pod"
        "Alertmanager-HTTP"
        "Alertmanager-Email"
        "Alertmanager-TestAlert"
        "---GRAFANA---"
        "Grafana-Pod"
        "Grafana-HTTP"
        "Grafana-Datasources"
        "Grafana-Dashboards"
        "---LOKI---"
        "Loki-Pod"
        "Promtail-Pod"
        "---NODE-METRICS---"
        "Node-Exporter"
        "Kube-State-Metrics"
        "---STORAGE---"
        "Persistent-Storage"
        "StorageClass"
    )
else
    TEST_ORDER=(
        "SSH"
        "Kubernetes"
        "Taint-Removal"
        "---PROMETHEUS---"
        "Prometheus-Pod"
        "Prometheus-HTTP"
        "Prometheus-Scraping"
        "Alert-Rules"
        "---ALERTMANAGER---"
        "Alertmanager-Pod"
        "Alertmanager-HTTP"
        "Alertmanager-Email"
        "Alertmanager-TestAlert"
        "---GRAFANA---"
        "Grafana-Pod"
        "Grafana-HTTP"
        "Grafana-Datasources"
        "Grafana-Dashboards"
        "---LOKI---"
        "Loki-Pod"
        "Promtail-Pod"
        "---NODE-METRICS---"
        "Node-Exporter"
        "Kube-State-Metrics"
        "---STORAGE---"
        "Persistent-Storage"
        "StorageClass"
    )
fi

# Zähler
OK_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

for key in "${TEST_ORDER[@]}"; do
    # Section Headers
    if [[ "$key" == ---*--- ]]; then
        SECTION=$(echo "$key" | tr -d '-')
        echo -e "║ ${BLUE}▼ ${SECTION}${NC}                              │              ║"
        continue
    fi
    
    case "${RESULTS[$key]}" in
        "OK")
            STATUS="${GREEN}✅ OK${NC}"
            ((OK_COUNT++))
            ;;
        "WARN")
            STATUS="${YELLOW}⚠️  WARN${NC}"
            ((WARN_COUNT++))
            ;;
        *)
            STATUS="${RED}❌ FAIL${NC}"
            ((FAIL_COUNT++))
            ;;
    esac
    # Formatiere mit fester Breite ohne Escape-Codes in printf
    printf "║   %-33s │ " "$key"
    echo -e "$STATUS        ║"
done

echo "╠═══════════════════════════════════════════════════════════════════════════════╣"

# Gesamtergebnis
TOTAL=$((OK_COUNT + WARN_COUNT + FAIL_COUNT))
if [ "$FAIL_COUNT" -eq 0 ] && [ "$WARN_COUNT" -eq 0 ]; then
    echo -e "║           ${GREEN}🎉 ALLE TESTS BESTANDEN ($OK_COUNT/$TOTAL)${NC}                            ║"
elif [ "$FAIL_COUNT" -eq 0 ]; then
    echo -e "║           ${YELLOW}⚠️  $OK_COUNT OK, $WARN_COUNT WARNINGS${NC}                                    ║"
else
    echo -e "║           ${RED}❌ $FAIL_COUNT FEHLER, $WARN_COUNT WARNINGS, $OK_COUNT OK${NC}                          ║"
fi

echo "╠═══════════════════════════════════════════════════════════════════════════════╣"
echo "║                              🌐 ZUGRIFFS-URLs                                 ║"
echo "╠═══════════════════════════════════════════════════════════════════════════════╣"

if [ "$SERVICE_TYPE" == "LoadBalancer" ]; then
    echo -e "║ ${CYAN}Service Type: LoadBalancer${NC}                                                  ║"
    echo "╠═══════════════════════════════════════════════════════════════════════════════╣"
    
    # Grafana URL
    if [ -n "$GRAFANA_URL" ] && [[ "$GRAFANA_URL" != *"$SERVER_IP"* ]]; then
        echo "║ Grafana:      $GRAFANA_URL"
    else
        echo "║ Grafana:      (LoadBalancer pending - Fallback: http://$SERVER_IP:30080)"
    fi
    
    # Prometheus URL
    if [ -n "$PROMETHEUS_URL" ] && [[ "$PROMETHEUS_URL" != *"$SERVER_IP"* ]]; then
        echo "║ Prometheus:   $PROMETHEUS_URL"
    else
        echo "║ Prometheus:   (LoadBalancer pending - Fallback: http://$SERVER_IP:30090)"
    fi
    
    # Alertmanager URL
    if [ -n "$ALERTMANAGER_URL" ] && [[ "$ALERTMANAGER_URL" != *"$SERVER_IP"* ]]; then
        echo "║ Alertmanager: $ALERTMANAGER_URL"
    else
        echo "║ Alertmanager: (LoadBalancer pending - Fallback: http://$SERVER_IP:30903)"
    fi
    
    echo "╠═══════════════════════════════════════════════════════════════════════════════╣"
    echo "║ Credentials:  admin / $GRAFANA_PASS"
    echo "╠═══════════════════════════════════════════════════════════════════════════════╣"
    echo -e "║ ${YELLOW}⚠️  LoadBalancer URLs können bis zu 3 Min brauchen bis verfügbar${NC}            ║"
else
    echo -e "║ ${CYAN}Service Type: NodePort${NC}                                                      ║"
    echo "╠═══════════════════════════════════════════════════════════════════════════════╣"
    echo "║ Grafana:      http://$SERVER_IP:30080  (admin / $GRAFANA_PASS)"
    echo "║ Prometheus:   http://$SERVER_IP:30090"
    echo "║ Alertmanager: http://$SERVER_IP:30903"
fi

echo "╚═══════════════════════════════════════════════════════════════════════════════╝"

# =============================================================================
# FEHLERDETAILS
# =============================================================================

if [ "$FAIL_COUNT" -gt 0 ] || [ "$WARN_COUNT" -gt 0 ]; then
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                           🔧 FEHLERDETAILS                                    ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
    echo ""
    
    for key in "${TEST_ORDER[@]}"; do
        [[ "$key" == ---*--- ]] && continue
        
        if [ -n "${ERROR_DETAILS[$key]}" ]; then
            if [ "${RESULTS[$key]}" == "FAIL" ]; then
                echo -e "${RED}━━━ ❌ $key ━━━${NC}"
            else
                echo -e "${YELLOW}━━━ ⚠️  $key ━━━${NC}"
            fi
            echo -e "${ERROR_DETAILS[$key]}"
            echo ""
        fi
    done
    
    echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                           💡 TROUBLESHOOTING TIPPS                            ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "1. Pods prüfen:     ssh ubuntu@$SERVER_IP 'kubectl get pods -n monitoring'"
    echo "2. Logs prüfen:     ssh ubuntu@$SERVER_IP 'kubectl logs <pod-name> -n monitoring'"
    echo "3. Events prüfen:   ssh ubuntu@$SERVER_IP 'kubectl get events -n monitoring --sort-by=.lastTimestamp'"
    echo "4. Describe Pod:    ssh ubuntu@$SERVER_IP 'kubectl describe pod <pod-name> -n monitoring'"
    echo "5. HelmChart:       ssh ubuntu@$SERVER_IP 'kubectl get helmcharts -n kube-system'"
    echo ""
fi

# Exit Code basierend auf Ergebnis
if [ "$FAIL_COUNT" -gt 0 ]; then
    exit 1
else
    exit 0
fi
