# =============================================================================
# OUTPUTS
# =============================================================================

# -----------------------------------------------------------------------------
# SSH Zugang
# -----------------------------------------------------------------------------
output "ssh_command_server" {
  description = "SSH command to connect to the RKE2 server"
  value       = "ssh ubuntu@${aws_instance.rke2_server.public_ip}"
}

output "server_public_ip" {
  description = "Public IP of the RKE2 control plane"
  value       = aws_instance.rke2_server.public_ip
}

# -----------------------------------------------------------------------------
# LoadBalancer / Ingress
# -----------------------------------------------------------------------------
output "loadbalancer_ip" {
  description = "Elastic IP used by the Ingress LoadBalancer"
  value       = aws_eip.ingress_ip.public_ip
}

# -----------------------------------------------------------------------------
# Anwendungs-URLs (nip.io basiert)
# -----------------------------------------------------------------------------
output "app_url" {
  description = "PartyPic Frontend URL"
  value       = "http://app.${aws_eip.ingress_ip.public_ip}.nip.io"
}

output "api_url" {
  description = "PartyPic API URL (fuer k6 Tests)"
  value       = "http://api.${aws_eip.ingress_ip.public_ip}.nip.io"
}

output "grafana_url" {
  description = "Grafana Dashboard URL"
  value       = "http://grafana.${aws_eip.ingress_ip.public_ip}.nip.io"
}

output "argocd_url" {
  description = "ArgoCD Dashboard URL"
  value       = "http://argocd.${aws_eip.ingress_ip.public_ip}.nip.io"
}

# -----------------------------------------------------------------------------
# Cluster Info
# -----------------------------------------------------------------------------
output "cluster_name" {
  description = "Name des RKE2 Clusters"
  value       = var.cluster_name
}

output "worker_count" {
  description = "Anzahl der Worker Nodes"
  value       = var.worker_count
}

output "aws_region" {
  description = "AWS Region"
  value       = var.aws_region
}

# -----------------------------------------------------------------------------
# Nuetzliche Befehle
# -----------------------------------------------------------------------------
output "k6_normal_test_command" {
  description = "Befehl um k6 Normal-Traffic Test zu starten"
  value       = "k6 run -e BASE_URL=http://api.${aws_eip.ingress_ip.public_ip}.nip.io dist/normal-traffic.js"
}

output "k6_peak_test_command" {
  description = "Befehl um k6 Peak-Traffic Test zu starten"
  value       = "k6 run -e BASE_URL=http://api.${aws_eip.ingress_ip.public_ip}.nip.io dist/peak-traffic.js"
}

