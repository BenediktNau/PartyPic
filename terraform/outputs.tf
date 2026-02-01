# =============================================================================
# OUTPUTS - Server Access & Monitoring URLs
# =============================================================================

output "ssh_command_server" {
  description = "SSH command to the server"
  value       = "ssh ubuntu@${aws_instance.rke2_server.public_ip}"
}

output "server_public_ip" {
  description = "Public IP of the RKE2 Server"
  value       = aws_instance.rke2_server.public_ip
}

output "loadbalancer_IP" {
  description = "Loadbalancer IP"
  value       = aws_eip.ingress_ip.public_ip
}

output "grafana_ingress_command" {
  description = "Output Grafana Ingress Hostname (run on the server)"
  value       = "kubectl get ingress -n monitoring grafana-ingress -o jsonpath='{.spec.rules[0].host}'"  
}

# =============================================================================
# S3 STORAGE OUTPUTS
# =============================================================================

output "s3_bucket_name" {
  description = "Name of S3 Bucket for PartyPic"
  value       = aws_s3_bucket.partypic_storage.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 Bucket"
  value       = aws_s3_bucket.partypic_storage.arn
}

output "s3_bucket_region" {
  description = "Region of the S3 Bucket"
  value       = aws_s3_bucket.partypic_storage.region
}

output "s3_upload_example" {
  description = "Example command to upload a file"
  value       = "aws s3 cp <file> s3://${aws_s3_bucket.partypic_storage.id}/"
}

output "s3_download_example" {
  description = "Example command to download a file"
  value       = "aws s3 cp s3://${aws_s3_bucket.partypic_storage.id}/<file> ."
}
