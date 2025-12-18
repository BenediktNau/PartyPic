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
  default     = 1
}

variable "rke2_token" {
  description = "Shared secret for nodes to join the cluster"
  type        = string
  sensitive   = true
  default     = "my-super-secret-rpc-password" 
}

# --- NEW: Credentials Variables ---
variable "aws_access_key" {
  type      = string
  sensitive = true
  default = "ASIAW4VVHQ7RATSNX2IB"
}

variable "aws_secret_key" {
  type      = string
  sensitive = true
  default = "9KIavLP6jk2iYvKiLNyumnHNb6uTBUWCwT5Nz17pNvHB0rZ"
}

variable "aws_session_token" {
  type      = string
  sensitive = true
  default = "IQoJb3JpZ2luX2VjEM///////////wEaCXVzLXdlc3QtMiJIMEYCIQD6OK5zZ/JDC/7zZavQIqXKU5RA+bI/IaOYfy+lYjW0NQIhAOyDueQj3a7zsxJbvAabf2X9GE7yan89g0uf5Eb4XzrNKsYCCJj//////////wEQABoMNDczOTAwMjIyNDM0IgwS+ebU69NL+gpES+sqmgK5WfgOXDJxn1QXsEKIOu/wgKSEt7wPwju2+m/pN/5Ytctc/4rm04jK0l51uT+fq/pYBa8IqcJoBb4FMzsSsWNmTinaZIXKtaY3UvzdpMS9WdSr4OVEW0cphZl1CVu4/0tIh7PECbvStnt7n4CI0/Dn3ALQQhtf61zKAxuM3lh/dQDSAUASsIGlDPj6sXXCC19PNJLvQBxac7K98t1+9bGCboZBZKTlget/uI59Gr9SuRll0pfu0t4HVahG8b1omFOOQeIT4YM+WEEKC1OCER6LqNfHBxowpytOeRt/W1wCuq4WICfd6u8f9to3TFUv7L5g8+CTzDHC/7HUoVVnua5nfpwwZZf805ke3p9+is82V3IXNxm4BLidczMwkKCQygY6nAF924TOnLCgG7KdzQ60XGbMOov2s2HUp/Dp0HZzK8wHn6Wd/GGhN3tvTPpaU1nvlqQCqZ0hMqE0ReiU0Ssm/5eondRRQyzuVfCTmlg/xFFgQWJjIlw1fpPlR4zF7KzRYXnPtqfhOLcl8IwTB3HI4O/XKGxHNiV3Pwjdj6SGoaTrMTYlby+AYe5gm7n52AfTY/ehDWKiJ9coadRsxbo="
}