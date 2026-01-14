data "external" "env" {
  program = ["${path.module}/env.sh"]
}

locals {
  aws_access_key    = data.external.env.result["aws_access_key"]
  aws_secret_key    = data.external.env.result["aws_secret_key"]
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
  user_data = <<-EOF
    #!/bin/bash
    set -e # Exit immediately if a command exits with a non-zero status

    # 1. Install Dependencies
    apt-get update -y
    apt-get install -y curl

    # 2. Fetch AWS Metadata (IMDSv2) - CRITICAL STEP
    # We strip newlines to prevent YAML errors
    TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
    AZ=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" -s http://169.254.169.254/latest/meta-data/placement/availability-zone | tr -d '\n')
    IID=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" -s http://169.254.169.254/latest/meta-data/instance-id | tr -d '\n')

    # 3. Create RKE2 Config Directory
    mkdir -p /etc/rancher/rke2

    # 4. Generate config.yaml
    cat <<EOC > /etc/rancher/rke2/config.yaml
    token: "${var.rke2_token}"
    disable-cloud-controller: true
    
    # 1. Kubelet needs it + the ID
    kubelet-arg:
      - "cloud-provider=external"
      - "provider-id=aws:///$${AZ}/$${IID}"
    
    # 2. Controller Manager needs it
    kube-controller-manager-arg:
      - "cloud-provider=external"
    
    # 3. API SERVER: REMOVE THIS SECTION!
    # passing 'cloud-provider' here crashes Kubernetes 1.29+
    # kube-apiserver-arg:
    #   - "cloud-provider=external"
    EOC

    # 5. Install RKE2
    # We DO NOT pass flags here. It reads /etc/rancher/rke2/config.yaml automatically.
    curl -sfL https://get.rke2.io | sh -s - server

    # 6. Start Service
    systemctl enable rke2-server
    systemctl start rke2-server

    # 7. Post-Install: Setup Kubectl for 'ubuntu' user
    # Wait for the file to be created
    for i in {1..30}; do
      if [ -f /etc/rancher/rke2/rke2.yaml ]; then break; fi
      sleep 2
    done

    mkdir -p /home/ubuntu/.kube
    cp /etc/rancher/rke2/rke2.yaml /home/ubuntu/.kube/config
    chown -R ubuntu:ubuntu /home/ubuntu/.kube
    chmod 600 /home/ubuntu/.kube/config
    
    # Add RKE2 bin to path
    echo 'export PATH=/var/lib/rancher/rke2/bin:$PATH' >> /home/ubuntu/.bashrc

    # 8. Install Helm
    curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-4
    chmod +x get_helm.sh
    ./get_helm.sh
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
      aws_session_token = local.aws_session_token
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
