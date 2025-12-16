terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# --- Networking & Security ---

resource "aws_security_group" "rke2_sg" {
  name        = "${var.cluster_name}-sg"
  description = "Allow RKE2 and SSH traffic"

  # Standard Access (SSH, HTTP, HTTPS)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  # Kubernetes API
  ingress {
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Internal Cluster Communication (Allow all traffic within the group)
  # This is crucial for Server <-> Worker communication
  ingress {
    from_port = 0
    to_port   = 0
    protocol  = "-1"
    self      = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# --- SSH Key ---

resource "aws_key_pair" "local_key" {
  key_name   = "${var.cluster_name}-key"
  public_key = var.public_key
}

# --- AMI ---

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
}

# --- 1. RKE2 SERVER (Control Plane) ---

resource "aws_instance" "rke2_server" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.local_key.key_name
  vpc_security_group_ids = [aws_security_group.rke2_sg.id]

  user_data = <<-EOF
    #!/bin/bash
    yum update -y
    
    # Install RKE2 Server with the pre-defined token
    curl -sfL https://get.rke2.io | RKE2_TOKEN="${var.rke2_token}" sh -
    
    systemctl enable rke2-server
    systemctl start rke2-server

    # Wait for Kubeconfig
    while [ ! -f /etc/rancher/rke2/rke2.yaml ]; do sleep 2; done

    # Setup environment
    echo 'export PATH=$PATH:/var/lib/rancher/rke2/bin' >> /home/ec2-user/.bashrc
    echo 'export KUBECONFIG=/etc/rancher/rke2/rke2.yaml' >> /home/ec2-user/.bashrc
    chmod 644 /etc/rancher/rke2/rke2.yaml
  EOF

  tags = {
    Name = "${var.cluster_name}-server"
  }
}

# RKE AGENTS Keine Ahnung 

resource "aws_instance" "rke2_worker" {
  count                  = var.worker_count
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.local_key.key_name
  vpc_security_group_ids = [aws_security_group.rke2_sg.id]

  user_data = <<-EOF
    #!/bin/bash
    yum update -y
    
    # Install RKE2 Agent
    curl -sfL https://get.rke2.io | \
      INSTALL_RKE2_TYPE="agent" \
      RKE2_URL="https://${aws_instance.rke2_server.private_ip}:9345" \
      RKE2_TOKEN="${var.rke2_token}" \
      sh -

    systemctl enable rke2-agent
    systemctl start rke2-agent
  EOF

  tags = {
    Name = "${var.cluster_name}-worker-${count.index + 1}"
  }
  
  depends_on = [aws_instance.rke2_server]
}