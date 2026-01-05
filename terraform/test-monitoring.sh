#!/bin/bash
# =============================================================================
# MONITORING STACK TEST SCRIPT
# =============================================================================

# Farben
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Server IP aus Terraform Output holen
SERVER_IP=$(terraform output -raw server_public_ip 2>/dev/null)

# Grafana Passwort aus variables.tf holen (Default-Wert)
GRAFANA_PASS=$(grep -A5 'grafana_admin_password' variables.tf | grep 'default' | sed 's/.*"\(.*\)"/\1/')
if [ -z "$GRAFANA_PASS" ]; then
    GRAFANA_PASS="admin123"
fi

if [ -z "$SERVER_IP" ]; then
    echo "❌ Fehler: Konnte Server IP nicht ermitteln. Läuft terraform apply?"
    exit 1
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
echo "║                    🔍 MONITORING STACK TEST REPORT                            ║"
echo "║                    Server: $SERVER_IP                               ║"
echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Funktion für Status-Check
check_status() {
    if [ "$1" == "OK" ]; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FAIL${NC}"
    fi
}

# Arrays für Ergebnisse
declare -A RESULTS

# --- TEST 1: SSH Verbindung ---
echo -n "Testing SSH Connection... "
if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 ubuntu@$SERVER_IP "echo ok" &>/dev/null; then
    RESULTS["SSH"]="OK"
    echo -e "${GREEN}OK${NC}"
else
    RESULTS["SSH"]="FAIL"
    echo -e "${RED}FAIL${NC}"
    echo "❌ SSH nicht erreichbar - breche ab"
    exit 1
fi

# --- TEST 2: Kubernetes Cluster ---
echo -n "Testing Kubernetes Cluster... "
K8S_STATUS=$(ssh ubuntu@$SERVER_IP "export PATH=/var/lib/rancher/rke2/bin:\$PATH && export KUBECONFIG=/home/ubuntu/.kube/config && kubectl get nodes --no-headers 2>/dev/null | grep -c Ready")
if [ "$K8S_STATUS" -ge 1 ] 2>/dev/null; then
    RESULTS["Kubernetes"]="OK"
    echo -e "${GREEN}OK ($K8S_STATUS nodes ready)${NC}"
else
    RESULTS["Kubernetes"]="FAIL"
    echo -e "${RED}FAIL${NC}"
fi

# --- TEST 3: Taint entfernt? ---
echo -n "Testing Taint Removal... "
TAINT_CHECK=$(ssh ubuntu@$SERVER_IP "export PATH=/var/lib/rancher/rke2/bin:\$PATH && export KUBECONFIG=/home/ubuntu/.kube/config && kubectl describe nodes 2>/dev/null | grep -c 'node.cloudprovider.kubernetes.io/uninitialized'")
if [ "$TAINT_CHECK" == "0" ] 2>/dev/null; then
    RESULTS["Taint-Removal"]="OK"
    echo -e "${GREEN}OK (Taint entfernt)${NC}"
else
    RESULTS["Taint-Removal"]="FAIL"
    echo -e "${YELLOW}PENDING (Taint noch vorhanden)${NC}"
fi

# --- TEST 4: Grafana Pod ---
echo -n "Testing Grafana Pod... "
GRAFANA_POD=$(ssh ubuntu@$SERVER_IP "export PATH=/var/lib/rancher/rke2/bin:\$PATH && export KUBECONFIG=/home/ubuntu/.kube/config && kubectl get pods -n monitoring 2>/dev/null | grep grafana | grep -c Running")
if [ "$GRAFANA_POD" -ge 1 ] 2>/dev/null; then
    RESULTS["Grafana-Pod"]="OK"
    echo -e "${GREEN}OK${NC}"
else
    RESULTS["Grafana-Pod"]="FAIL"
    echo -e "${RED}FAIL${NC}"
fi

# --- TEST 5: Grafana HTTP ---
echo -n "Testing Grafana HTTP (Port 30080)... "
GRAFANA_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://$SERVER_IP:30080/api/health" 2>/dev/null)
if [ "$GRAFANA_HTTP" == "200" ]; then
    RESULTS["Grafana-HTTP"]="OK"
    echo -e "${GREEN}OK (HTTP $GRAFANA_HTTP)${NC}"
else
    RESULTS["Grafana-HTTP"]="FAIL"
    echo -e "${RED}FAIL (HTTP $GRAFANA_HTTP)${NC}"
fi

# --- TEST 6: Prometheus Pod ---
echo -n "Testing Prometheus Pod... "
PROM_POD=$(ssh ubuntu@$SERVER_IP "export PATH=/var/lib/rancher/rke2/bin:\$PATH && export KUBECONFIG=/home/ubuntu/.kube/config && kubectl get pods -n monitoring 2>/dev/null | grep prometheus-prometheus-stack | grep -c Running")
if [ "$PROM_POD" -ge 1 ] 2>/dev/null; then
    RESULTS["Prometheus-Pod"]="OK"
    echo -e "${GREEN}OK${NC}"
else
    RESULTS["Prometheus-Pod"]="FAIL"
    echo -e "${RED}FAIL${NC}"
fi

# --- TEST 7: Prometheus HTTP ---
echo -n "Testing Prometheus HTTP (Port 30090)... "
PROM_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://$SERVER_IP:30090/-/ready" 2>/dev/null)
if [ "$PROM_HTTP" == "200" ]; then
    RESULTS["Prometheus-HTTP"]="OK"
    echo -e "${GREEN}OK (HTTP $PROM_HTTP)${NC}"
else
    RESULTS["Prometheus-HTTP"]="FAIL"
    echo -e "${RED}FAIL (HTTP $PROM_HTTP)${NC}"
fi

# --- TEST 8: Prometheus Targets ---
echo -n "Testing Prometheus Scraping... "
PROM_TARGETS=$(curl -s "http://$SERVER_IP:30090/api/v1/targets" 2>/dev/null | grep -c '"health":"up"')
if [ "$PROM_TARGETS" -ge 1 ] 2>/dev/null; then
    RESULTS["Prometheus-Scraping"]="OK"
    echo -e "${GREEN}OK ($PROM_TARGETS targets up)${NC}"
else
    RESULTS["Prometheus-Scraping"]="FAIL"
    echo -e "${RED}FAIL${NC}"
fi

# --- TEST 9: Loki Pod ---
echo -n "Testing Loki Pod... "
LOKI_POD=$(ssh ubuntu@$SERVER_IP "export PATH=/var/lib/rancher/rke2/bin:\$PATH && export KUBECONFIG=/home/ubuntu/.kube/config && kubectl get pods -n monitoring 2>/dev/null | grep loki-stack-0 | grep -c Running")
if [ "$LOKI_POD" -ge 1 ] 2>/dev/null; then
    RESULTS["Loki-Pod"]="OK"
    echo -e "${GREEN}OK${NC}"
else
    RESULTS["Loki-Pod"]="FAIL"
    echo -e "${RED}FAIL${NC}"
fi

# --- TEST 10: Promtail Pod ---
echo -n "Testing Promtail Pod... "
PROMTAIL_POD=$(ssh ubuntu@$SERVER_IP "export PATH=/var/lib/rancher/rke2/bin:\$PATH && export KUBECONFIG=/home/ubuntu/.kube/config && kubectl get pods -n monitoring 2>/dev/null | grep promtail | grep -c Running")
if [ "$PROMTAIL_POD" -ge 1 ] 2>/dev/null; then
    RESULTS["Promtail-Pod"]="OK"
    echo -e "${GREEN}OK${NC}"
else
    RESULTS["Promtail-Pod"]="FAIL"
    echo -e "${RED}FAIL${NC}"
fi

# --- TEST 11: Node-Exporter ---
echo -n "Testing Node-Exporter Pod... "
NODE_EXP=$(ssh ubuntu@$SERVER_IP "export PATH=/var/lib/rancher/rke2/bin:\$PATH && export KUBECONFIG=/home/ubuntu/.kube/config && kubectl get pods -n monitoring 2>/dev/null | grep node-exporter | grep -c Running")
if [ "$NODE_EXP" -ge 1 ] 2>/dev/null; then
    RESULTS["Node-Exporter"]="OK"
    echo -e "${GREEN}OK${NC}"
else
    RESULTS["Node-Exporter"]="FAIL"
    echo -e "${RED}FAIL${NC}"
fi

# --- TEST 12: Kube-State-Metrics ---
echo -n "Testing Kube-State-Metrics Pod... "
KSM=$(ssh ubuntu@$SERVER_IP "export PATH=/var/lib/rancher/rke2/bin:\$PATH && export KUBECONFIG=/home/ubuntu/.kube/config && kubectl get pods -n monitoring 2>/dev/null | grep kube-state-metrics | grep -c Running")
if [ "$KSM" -ge 1 ] 2>/dev/null; then
    RESULTS["Kube-State-Metrics"]="OK"
    echo -e "${GREEN}OK${NC}"
else
    RESULTS["Kube-State-Metrics"]="FAIL"
    echo -e "${RED}FAIL${NC}"
fi

# --- TEST 13: Grafana Datasources ---
echo -n "Testing Grafana Datasources... "
# Versuche verschiedene Passwörter
for PASS in "$GRAFANA_PASS" "admin123" "admin"; do
    RESPONSE=$(curl -s -u "admin:$PASS" "http://$SERVER_IP:30080/api/datasources" 2>/dev/null)
    if echo "$RESPONSE" | grep -q "Prometheus"; then
        DATASOURCES=$(echo "$RESPONSE" | grep -o '"id":' | wc -l)
        GRAFANA_PASS="$PASS"
        RESULTS["Grafana-Datasources"]="OK"
        echo -e "${GREEN}OK ($DATASOURCES datasources)${NC}"
        break
    fi
done
if [ "${RESULTS["Grafana-Datasources"]}" != "OK" ]; then
    RESULTS["Grafana-Datasources"]="FAIL"
    echo -e "${RED}FAIL${NC}"
fi

# --- TEST 14: PVCs ---
echo -n "Testing Persistent Volumes... "
PVCS=$(ssh ubuntu@$SERVER_IP "export PATH=/var/lib/rancher/rke2/bin:\$PATH && export KUBECONFIG=/home/ubuntu/.kube/config && kubectl get pvc -n monitoring 2>/dev/null | grep -c Bound")
if [ "$PVCS" -ge 3 ] 2>/dev/null; then
    RESULTS["Persistent-Storage"]="OK"
    echo -e "${GREEN}OK ($PVCS PVCs bound)${NC}"
else
    RESULTS["Persistent-Storage"]="FAIL"
    echo -e "${RED}FAIL ($PVCS PVCs bound)${NC}"
fi

# === ERGEBNIS-TABELLE ===
echo ""
echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
echo "║                           📊 ERGEBNIS-TABELLE                                 ║"
echo "╠═══════════════════════════════════════════════════════════════════════════════╣"
printf "║ %-30s │ %-10s ║\n" "KOMPONENTE" "STATUS"
echo "╠═══════════════════════════════════════════════════════════════════════════════╣"

# Zähler
OK_COUNT=0
FAIL_COUNT=0

for key in "SSH" "Kubernetes" "Taint-Removal" "Grafana-Pod" "Grafana-HTTP" "Grafana-Datasources" "Prometheus-Pod" "Prometheus-HTTP" "Prometheus-Scraping" "Loki-Pod" "Promtail-Pod" "Node-Exporter" "Kube-State-Metrics" "Persistent-Storage"; do
    if [ "${RESULTS[$key]}" == "OK" ]; then
        STATUS="${GREEN}✅ OK${NC}"
        ((OK_COUNT++))
    else
        STATUS="${RED}❌ FAIL${NC}"
        ((FAIL_COUNT++))
    fi
    printf "║ %-30s │ " "$key"
    echo -e "$STATUS            ║"
done

echo "╠═══════════════════════════════════════════════════════════════════════════════╣"

# Gesamtergebnis
TOTAL=$((OK_COUNT + FAIL_COUNT))
if [ "$FAIL_COUNT" -eq 0 ]; then
    echo -e "║                    ${GREEN}🎉 ALLE TESTS BESTANDEN ($OK_COUNT/$TOTAL)${NC}                        ║"
else
    echo -e "║                    ${RED}⚠️  $FAIL_COUNT/$TOTAL TESTS FEHLGESCHLAGEN${NC}                         ║"
fi

echo "╠═══════════════════════════════════════════════════════════════════════════════╣"
echo "║                              🌐 ZUGRIFFS-URLs                                 ║"
echo "╠═══════════════════════════════════════════════════════════════════════════════╣"
echo "║ Grafana:    http://$SERVER_IP:30080  (admin / $GRAFANA_PASS) ║"
echo "║ Prometheus: http://$SERVER_IP:30090                                ║"
echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
echo ""
