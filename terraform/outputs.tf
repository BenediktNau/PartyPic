output "ssh_command_server" {
  description = "Command to SSH into the Server"
  value       = "ssh ec2-user@${aws_instance.rke2_server.public_ip}"
}

output "server_public_ip" {
  value = aws_instance.rke2_server.public_ip
}

output "worker_public_ips" {
  description = "Public IPs of the worker nodes"
  value       = aws_instance.rke2_worker[*].public_ip
}