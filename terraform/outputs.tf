# =============================================================================
# OUTPUTS - Wichtige Endpoints
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
  description = "Öffentliche IPs der Worker-Nodes"
  value       = aws_instance.rke2_worker[*].public_ip
}

# --- MONITORING URLS ---
output "grafana_url" {
  description = "Grafana Dashboard URL"
  value       = "http://${aws_instance.rke2_server.public_ip}:${var.grafana_nodeport}"
}

output "prometheus_url" {
  description = "Prometheus UI URL"
  value       = "http://${aws_instance.rke2_server.public_ip}:${var.prometheus_nodeport}"
}

output "monitoring_info" {
  description = "Monitoring Zugangsdaten"
  value       = <<-EOT
    
    ╔══════════════════════════════════════════════════════════════╗
    ║                    MONITORING STACK                          ║
    ╠══════════════════════════════════════════════════════════════╣
    ║ Grafana:    http://${aws_instance.rke2_server.public_ip}:${var.grafana_nodeport}
    ║ Prometheus: http://${aws_instance.rke2_server.public_ip}:${var.prometheus_nodeport}
    ║                                                              ║
    ║ Grafana Login:                                               ║
    ║   User: admin                                                ║
    ║   Pass: (siehe grafana_admin_password Variable)              ║
    ╚══════════════════════════════════════════════════════════════╝
  EOT
}
