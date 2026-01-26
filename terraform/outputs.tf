output "ssh_command_server" {
  description = "Command to SSH into the Server"
  value       = "ssh ubuntu@${aws_instance.rke2_server.public_ip}"
}

output "server_public_ip" {
  value = aws_instance.rke2_server.public_ip
}

output "worker_public_ips" {
  description = "Public IPs of the currently running worker nodes"
  value       = data.aws_instances.worker_nodes.public_ips
}

output "rke2_server_private_ip" {
  description = "Loadbalancer IP"
  value       = aws_eip.ingress_ip.public_ip
}