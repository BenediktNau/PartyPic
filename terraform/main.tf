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
  # The provider automatically uses ~/.aws/credentials to CREATE resources
}

# --- REMOVED IAM ROLES & POLICIES HERE ---

resource "aws_security_group" "rke2_sg" {
  name        = "${var.cluster_name}-sg"
  description = "Allow RKE2, SSH, and NodePort traffic"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 6443
    to_port     = 6443
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
  # Internal Cluster Traffic
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

  tags = {
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
  }
}

# --- SSH Key ---

resource "aws_key_pair" "local_key" {
  key_name   = "${var.cluster_name}-key"
  public_key = var.public_key
}

# --- 1. RKE2 SERVER ---

resource "aws_instance" "rke2_server" {
  ami           = "ami-0ecb62995f68bb549"
  instance_type = var.instance_type
  key_name      = aws_key_pair.local_key.key_name
  
  # REMOVED: iam_instance_profile

  vpc_security_group_ids = [aws_security_group.rke2_sg.id]

  user_data = <<-EOF
    #!/bin/bash
    apt-get update -y
    apt-get install -y curl
    
    # Install RKE2 Server with the pre-defined token
    curl -sfL https://get.rke2.io | \
      RKE2_TOKEN="${var.rke2_token}" \
      sh -s - server --cloud-provider-name=external
    
    systemctl enable rke2-server
    systemctl start rke2-server

    # Wait for Kubeconfig
    while [ ! -f /etc/rancher/rke2/rke2.yaml ]; do sleep 2; done

    # Setup environment
    echo 'export PATH=$PATH:/var/lib/rancher/rke2/bin' >> /home/ubuntu/.bashrc
    echo 'export KUBECONFIG=/etc/rancher/rke2/rke2.yaml' >> /home/ubuntu/.bashrc
    chmod 644 /etc/rancher/rke2/rke2.yaml
  EOF

  tags = {
    Name = "${var.cluster_name}-server"
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
  }
}

# --- 2. RKE2 WORKERS ---

resource "aws_instance" "rke2_worker" {
  count         = var.worker_count
  ami           = "ami-0ecb62995f68bb549"
  instance_type = var.instance_type
  key_name      = aws_key_pair.local_key.key_name
  
  # REMOVED: iam_instance_profile

  vpc_security_group_ids = [aws_security_group.rke2_sg.id]
  
  user_data = <<-EOF
    #!/bin/bash
    apt-get update -y
    apt-get install -y curl
    
    curl -sfL https://get.rke2.io | \
      INSTALL_RKE2_TYPE="agent" \
      RKE2_URL="https://${aws_instance.rke2_server.private_ip}:9345" \
      RKE2_TOKEN="${var.rke2_token}" \
      sh -s - agent --cloud-provider-name=external

    systemctl enable rke2-agent
    systemctl start rke2-agent
  EOF

  tags = {
    Name = "${var.cluster_name}-worker-${count.index + 1}"
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
  }
  
  depends_on = [aws_instance.rke2_server]
}

# --- 3. MANIFEST SYNC (Injects Credentials) ---

resource "null_resource" "sync_manifests" {
  depends_on = [aws_instance.rke2_server]

  # We use the templatefile function to inject YOUR keys into the manifests
  triggers = {
    # This assumes you have a manifest/ folder locally
    ccm_content = templatefile("${path.module}/manifest/aws-cloud-controller-manager.yaml.tpl", {
      cluster_name   = var.cluster_name
      aws_access_key = var.aws_access_key # <--- Injection happens here
      aws_secret_key = var.aws_secret_key # <--- Injection happens here
    })
  }

  connection {
    type        = "ssh"
    user        = "ubuntu"
    host        = aws_instance.rke2_server.public_ip
  }

  # 1. Upload the specific AWS Cloud Controller with KEYS injected
  provisioner "file" {
    content     = self.triggers.ccm_content
    destination = "/tmp/aws-cloud-controller-manager.yaml"
  }

  # 2. Upload any OTHER static files in the folder
  # (Requires a separate loop if you have other files, simplified here for the Controller)

  # 3. Move file to RKE2 auto-deploy folder
  provisioner "remote-exec" {
    inline = [
      "sudo mkdir -p /var/lib/rancher/rke2/server/manifests",
      "sudo mv /tmp/aws-cloud-controller-manager.yaml /var/lib/rancher/rke2/server/manifests/aws-cloud-controller-manager.yaml",
      "sudo chmod 600 /var/lib/rancher/rke2/server/manifests/aws-cloud-controller-manager.yaml"
    ]
  }
}