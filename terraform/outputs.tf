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
  value       = "https://app.${aws_eip.ingress_ip.public_ip}.nip.io"
}

output "grafana_url" {
  description = "Grafana Dashboard URL"
  value       = "http://grafana.${aws_eip.ingress_ip.public_ip}.nip.io"
}

output "argocd_url" {
  description = "ArgoCD Dashboard URL"
  value       = "http://argo.${aws_eip.ingress_ip.public_ip}.nip.io"
}

# -----------------------------------------------------------------------------
# Nuetzliche Befehle
# -----------------------------------------------------------------------------
output "k6_normal_test_command" {
  description = "Befehl um k6 Normal-Traffic Test zu starten"
  value       = "cd k6/ && APP_URL=http://app.${aws_eip.ingress_ip.public_ip}.nip.io npm run normal"
}

output "k6_peak_test_command" {
  description = "Befehl um k6 Peak-Traffic Test zu starten"
  value       = "cd k6/ && APP_URL=http://app.${aws_eip.ingress_ip.public_ip}.nip.io npm run peak"
}

