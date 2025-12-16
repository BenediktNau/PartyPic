variable "aws_region" {
  description = "The AWS region to deploy resources into"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "public_key" {
  description = "public SSH key that you can use to get on cluster"
  type        = string
  default     = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIzG4JHCPuBQASJfAmyof6noYDSMVmkawzWzeQASwX7F simon@Simomsius"
}

variable "cluster_name" {
  description = "Name tag for the RKE2 cluster resources"
  type        = string
  default     = "rke2-cluster"
}

variable "worker_count" {
  description = "Number of worker nodes to create"
  type        = number
  default     = 2
}

variable "rke2_token" {
  description = "Shared secret for nodes to join the cluster"
  type        = string
  sensitive   = true
  default     = "my-super-secret-rpc-password" 
}