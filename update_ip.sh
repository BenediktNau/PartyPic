#!/bin/bash

# 1. Den LoadBalancer Hostnamen aus Kubernetes holen
LB_HOSTNAME=$(kubectl get ingress -n party-pic party-pic-server-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

if [ -z "$LB_HOSTNAME" ]; then
  exit 1
fi

echo "Hostname gefunden: $LB_HOSTNAME"

# 2. Die IP-Adresse dahinter ermitteln (da nip.io eine IP braucht, keinen AWS-Namen)
LB_IP=$(dig +short $LB_HOSTNAME | head -n 1)

if [ -z "$LB_IP" ]; then
  exit 1
fi

# Client
sed -i "s/host: .*/host: app.$LB_IP.nip.io/" party-pic_client/chart/values.yaml
# Server
sed -i "s/host: .*/host: api.$LB_IP.nip.io/" party-pic_server/chart/values.yaml

# 4. Automatisch pushen
git add party-pic_client/chart/values.yaml party-pic_server/chart/values.yaml
git commit -m "chore: auto-update ingress IP to $LB_IP"
git push origin elias

