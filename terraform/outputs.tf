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
  description = "Öffentliche IPs der Worker-Nodes"
  value       = aws_instance.rke2_worker[*].public_ip
}

output "grafana_url_command" {
  description = "Befehl um Grafana LoadBalancer URL abzurufen"
  value       = "ssh ubuntu@${aws_instance.rke2_server.public_ip} 'kubectl get svc grafana -n ${var.monitoring_namespace} -o jsonpath=\"http://{.status.loadBalancer.ingress[0].hostname}\"'"
}

output "prometheus_url_command" {
  description = "Befehl um Prometheus LoadBalancer URL abzurufen"
  value       = "ssh ubuntu@${aws_instance.rke2_server.public_ip} 'kubectl get svc prometheus-stack-kube-prom-prometheus -n ${var.monitoring_namespace} -o jsonpath=\"http://{.status.loadBalancer.ingress[0].hostname}:9090\"'"
}

output "alertmanager_url_command" {
  description = "Befehl um Alertmanager LoadBalancer URL abzurufen"
  value       = "ssh ubuntu@${aws_instance.rke2_server.public_ip} 'kubectl get svc prometheus-stack-kube-prom-alertmanager -n ${var.monitoring_namespace} -o jsonpath=\"http://{.status.loadBalancer.ingress[0].hostname}:9093\"'"
}

output "all_services_command" {
  description = "Befehl um alle Monitoring Services anzuzeigen"
  value       = "ssh ubuntu@${aws_instance.rke2_server.public_ip} 'kubectl get svc -n ${var.monitoring_namespace}'"
}

output "grafana_nodeport_fallback" {
  description = "Grafana NodePort URL (Fallback falls LB nicht verfügbar)"
  value       = "http://${aws_instance.rke2_server.public_ip}:${var.grafana_nodeport}"
}

output "prometheus_nodeport_fallback" {
  description = "Prometheus NodePort URL (Fallback falls LB nicht verfügbar)"
  value       = "http://${aws_instance.rke2_server.public_ip}:${var.prometheus_nodeport}"
}
