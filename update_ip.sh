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
RAW_INGRESS=$($SSH_CMD -o StrictHostKeyChecking=no -o LogLevel=QUIET "bash -l -c 'kubectl get ingress -n party-pic party-pic-server-ingress --no-headers'")
LB_HOSTNAME=$(echo "$RAW_INGRESS" | awk '{print $4}')

if [ -z "$LB_HOSTNAME" ]; then
    exit 1
fi

# 3. IP auflösen
LB_IP=$(dig +short $LB_HOSTNAME | head -n 1)

if [ -z "$LB_IP" ]; then
    exit 1
fi

# 4. Dateien patchen
sed -i "s/host: .*/host: app.$LB_IP.nip.io/" party-pic_client/chart/values.yaml
sed -i "s/host: .*/host: api.$LB_IP.nip.io/" party-pic_server/chart/values.yaml

# 5. Git Push (nur bei Änderungen)
if ! git diff --quiet; then
    git add party-pic_client/chart/values.yaml party-pic_server/chart/values.yaml
    git commit -m "chore: auto-update ingress IP to $LB_IP via remote-kubectl"
    git push origin elias
fi