# =============================================================================
# OUTPUTS
# Wichtige Infos nach dem Deployment
# =============================================================================

output "ssh_command_server" {
  description = "SSH command to connect to the RKE2 server"
  value       = "ssh ubuntu@${aws_instance.rke2_server.public_ip}"
}

output "server_public_ip" {
  description = "Public IP of the RKE2 control plane"
  value       = aws_instance.rke2_server.public_ip
}

output "loadbalancer_IP" {
  description = "Elastic IP used by the Ingress LoadBalancer"
  value       = aws_eip.ingress_ip.public_ip
}

