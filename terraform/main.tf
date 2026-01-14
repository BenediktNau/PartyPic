data "external" "env" {
  program = ["${path.module}/env.sh"]
}

locals {
  aws_access_key = data.external.env.result["aws_access_key"]
  aws_secret_key = data.external.env.result["aws_secret_key"]
  aws_session_token = data.external.env.result["aws_session_token"]
}

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
  # RKE2 Server Registration Port
  ingress {
    from_port   = 9345
    to_port     = 9345
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

  vpc_security_group_ids = [aws_security_group.rke2_sg.id]

  user_data = <<-EOF
    #!/bin/bash
    set -e

    apt-get update -y
    apt-get install -y curl

    # --- RKE2 Token ---
    mkdir -p /var/lib/rancher/rke2/server
    echo "${var.rke2_token}" > /var/lib/rancher/rke2/server/node-token
    chmod 600 /var/lib/rancher/rke2/server/node-token

    # --- Install RKE2 Server ---
    curl -sfL https://get.rke2.io | sh -s - server --cloud-provider-name=external

    systemctl enable rke2-server
    systemctl start rke2-server

    # --- Wait for kubeconfig ---
    while [ ! -f /etc/rancher/rke2/rke2.yaml ]; do
      sleep 2
    done

    # --- Install kubectl + helm ---
    export PATH=$PATH:/var/lib/rancher/rke2/bin

    curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-4
    chmod +x get_helm.sh
    ./get_helm.sh

    # --- Make kubeconfig usable for ubuntu ---
    mkdir -p /home/ubuntu/.kube
    cp /etc/rancher/rke2/rke2.yaml /home/ubuntu/.kube/config
    chown -R ubuntu:ubuntu /home/ubuntu/.kube
    chmod 600 /home/ubuntu/.kube/config

    # --- Make kubeconfig usable for root (sudo kubectl) ---
    mkdir -p /root/.kube
    cp /etc/rancher/rke2/rke2.yaml /root/.kube/config
    chown root:root /root/.kube/config
    chmod 600 /root/.kube/config

    # --- Persist PATH ---
    echo 'export PATH=$PATH:/var/lib/rancher/rke2/bin' >> /etc/profile
  EOF

  tags = {
    Name                                        = "${var.cluster_name}-server"
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
  }
}


# --- 2. RKE2 WORKERS ---

resource "aws_instance" "rke2_worker" {
  count         = var.worker_count
  ami           = "ami-0ecb62995f68bb549"
  instance_type = var.instance_type
  key_name      = aws_key_pair.local_key.key_name

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
    Name                                        = "${var.cluster_name}-worker-${count.index + 1}"
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
  }

  depends_on = [aws_instance.rke2_server]
}

# --- 3. MANIFEST SYNC ---

resource "null_resource" "sync_manifests" {
  depends_on = [aws_instance.rke2_server]
  triggers = {
    # If the template file changes, re-run this
    ccm_content = templatefile("${path.module}/manifest/aws-cloud-controller-manager.yaml.tpl", {
      cluster_name   = var.cluster_name
      aws_access_key = local.aws_access_key
      aws_secret_key = local.aws_secret_key
    })
  }

  connection {
    type = "ssh"
    user = "ubuntu"
    host = aws_instance.rke2_server.public_ip
  }

  provisioner "file" {
    content     = self.triggers.ccm_content
    destination = "/tmp/aws-cloud-controller-manager.yaml"
  }

  provisioner "remote-exec" {
    inline = [
      "sudo mkdir -p /var/lib/rancher/rke2/server/manifests",
      "sudo mv /tmp/aws-cloud-controller-manager.yaml /var/lib/rancher/rke2/server/manifests/aws-cloud-controller-manager.yaml",
      "sudo chmod 600 /var/lib/rancher/rke2/server/manifests/aws-cloud-controller-manager.yaml"
    ]
  }
}


resource "null_resource" "install_argocd" {
  depends_on = [aws_instance.rke2_server]

  connection {
    type = "ssh"
    user = "ubuntu"
    host = aws_instance.rke2_server.public_ip
  }

  provisioner "file" {
    source      = "${path.module}/manifest/argocd/argocd-install.yaml"
    destination = "/tmp/argocd-install.yaml"
  }

  provisioner "remote-exec" {
    inline = [
      "sudo mkdir -p /var/lib/rancher/rke2/server/manifests/argocd",
      "sudo mv /tmp/argocd-install.yaml /var/lib/rancher/rke2/server/manifests/argocd/argocd-install.yaml",
      "sudo chmod 600 /var/lib/rancher/rke2/server/manifests/argocd/argocd-install.yaml"
    ]
  }
}
