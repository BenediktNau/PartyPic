#!/bin/bash
set -e


if [ -d "terraform" ]; then
    SSH_CMD=$(cd terraform && terraform output -raw ssh_command_server)
else
    exit 1
fi

if [ -z "$SSH_CMD" ]; then
    exit 1
fi

LB_HOSTNAME=$($SSH_CMD -o StrictHostKeyChecking=no -o LogLevel=QUIET "kubectl get ingress -n party-pic party-pic-server-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'")

if [ -z "$LB_HOSTNAME" ]; then
    exit 1
fi

LB_IP=$(dig +short $LB_HOSTNAME | head -n 1)

if [ -z "$LB_IP" ]; then
    exit 1
fi

sed -i "s/host: .*/host: app.$LB_IP.nip.io/" party-pic_client/chart/values.yaml
sed -i "s/host: .*/host: api.$LB_IP.nip.io/" party-pic_server/chart/values.yaml

if ! git diff --quiet; then
    git add party-pic_client/chart/values.yaml party-pic_server/chart/values.yaml
    git commit -m "chore: auto-update ingress IP to $LB_IP via remote-kubectl"
    git push origin elias
fi