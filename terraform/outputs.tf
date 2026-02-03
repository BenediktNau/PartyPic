# =============================================================================
# OUTPUTS - Server Access & Monitoring URLs
# =============================================================================

output "ssh_command_server" {
  description = "SSH-Befehl zum Server"
  value       = "ssh ubuntu@${aws_instance.rke2_server.public_ip}"
}

output "server_public_ip" {
  description = "Public IP des RKE2 Servers"
  value       = aws_instance.rke2_server.public_ip
}

output "loadbalancer_IP" {
  description = "Loadbalancer IP"
  value       = aws_eip.ingress_ip.public_ip
}

