output "ssh_command_server" {
  description = "Command to SSH into the Server"
  value       = "ssh ubuntu@${aws_instance.rke2_server.public_ip}"
}

output "server_public_ip" {
  value = aws_instance.rke2_server.public_ip
}

output "loadbalancer_IP" {
  description = "Loadbalancer IP"
  value       = aws_eip.ingress_ip.public_ip
}