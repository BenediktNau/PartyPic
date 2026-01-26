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

output "worker_public_ips" {
  description = "Public IPs of the currently running worker nodes"
  value       = data.aws_instances.worker_nodes.public_ips
}

# Grafana hat LoadBalancer
output "grafana_url_command" {
  description = "Befehl um Grafana LoadBalancer URL abzurufen"
  value       = "ssh ubuntu@${aws_instance.rke2_server.public_ip} \"kubectl get svc grafana -n ${var.monitoring_namespace} -o jsonpath='http://{.status.loadBalancer.ingress[0].hostname}'\""
}

# Prometheus hat NodePort (direkte URL)
output "prometheus_url" {
  description = "Prometheus URL (NodePort 30090)"
  value       = "http://${aws_instance.rke2_server.public_ip}:30090"
}

