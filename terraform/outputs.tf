# =============================================================================
# OUTPUTS - Server Access & Monitoring URLs
# =============================================================================

output "ssh_command_server" {
  description = "SSH-Befehl zum Server"
  value       = "ssh ubuntu@${aws_instance.rke2_server.public_ip}"
}

output "server_public_ip" {
  description = "Öffentliche IP des RKE2 Servers"
  value       = aws_instance.rke2_server.public_ip
}

output "loadbalancer_IP" {
  description = "Loadbalancer IP"
  value       = aws_eip.ingress_ip.public_ip
}

output "grafana_ingress_command" {
  description = "Grafana Ingress Hostname ausgeben (auf dem Server ausführen)"
  value       = "kubectl get ingress -n monitoring grafana-ingress -o jsonpath='{.spec.rules[0].host}'"  
}

output "grafana_ingress_command" {
  description = "Grafana Ingress Hostname ausgeben (auf dem Server ausführen)"
  value       = "kubectl get ingress -n monitoring grafana-ingress -o jsonpath='{.spec.rules[0].host}'"  
}