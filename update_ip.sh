#!/bin/bash
set -e

# 1. SSH-Verbindung holen
if [ -d "terraform" ]; then
    SSH_CMD=$(cd terraform && terraform output -raw ssh_command_server)
else
    exit 1
fi

if [ -z "$SSH_CMD" ]; then
    exit 1
fi

# 2. Hostname holen 
RAW_INGRESS=$($SSH_CMD -o StrictHostKeyChecking=no -o LogLevel=QUIET "export PATH=\$PATH:/usr/local/bin:/snap/bin:/var/lib/rancher/rke2/bin:/usr/bin:/bin; kubectl get ingress -n party-pic party-pic-server-ingress --no-headers")

# Wir nehmen das 4. Element (die Adresse/Hostname)
LB_HOSTNAME=$(echo "$RAW_INGRESS" | awk '{print $4}')

if [ -z "$LB_HOSTNAME" ]; then
    exit 1
fi

# 3. IP auflösen
if command -v dig &> /dev/null; then
    # Wenn dig da ist, nutzen wir es
    LB_IP=$(dig +short $LB_HOSTNAME | head -n 1)
elif command -v getent &> /dev/null; then
    # Linux Standard-Tool
    LB_IP=$(getent hosts $LB_HOSTNAME | head -n 1 | awk '{print $1}')
elif command -v python3 &> /dev/null; then
    # Python Fallback
    LB_IP=$(python3 -c "import socket; print(socket.gethostbyname('$LB_HOSTNAME'))")
else
    # Letzte Rettung: Ping
    LB_IP=$(ping -c 1 $LB_HOSTNAME | sed -nE 's/.* \((([0-9]{1,3}\.){3}[0-9]{1,3})\).*/\1/p' | head -n 1)
fi

if [ -z "$LB_IP" ]; then
    exit 1
fi

# 4. Dateien patchen
sed -i "s/host: .*/host: app.$LB_IP.nip.io/" party-pic_client/chart/values.yaml
sed -i "s/host: .*/host: api.$LB_IP.nip.io/" party-pic_server/chart/values.yaml

# 5. Git Push
if ! git diff --quiet; then
    git add party-pic_client/chart/values.yaml party-pic_server/chart/values.yaml
    git commit -m "chore: auto-update ingress IP to $LB_IP via remote-kubectl"
    git push
    # 6. ArgoCD Sync Triggern
    sleep 5
    kubectl patch application party-pic-server-application -n argocd --type merge -p='{"operation": {"sync": {"prune": true, "syncStrategy": {"hook": {"force": true}}}}}'
    kubectl patch application party-pic-client-application -n argocd --type merge -p='{"operation": {"sync": {"prune": true, "syncStrategy": {"hook": {"force": true}}}}}'
fi
