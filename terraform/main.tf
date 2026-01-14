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
  # Kubernetes NodePort Range (für Grafana:30080, Prometheus:30090)
  ingress {
    from_port   = 30000
    to_port     = 32767
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

# Export KUBECONFIG lokal nach terraform apply
resource "null_resource" "export_kubeconfig" {
  depends_on = [aws_instance.rke2_server]

  provisioner "local-exec" {
    command = <<-EOF
      mkdir -p ~/.kube
      ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no \
        ubuntu@${aws_instance.rke2_server.public_ip} \
        "cat ~/.kube/config" | \
        sed 's/127.0.0.1/${aws_instance.rke2_server.public_ip}/g' > ~/.kube/rke2-config
      chmod 600 ~/.kube/rke2-config
      echo "✓ KUBECONFIG exported to ~/.kube/rke2-config"
      echo "  Use: export KUBECONFIG=~/.kube/rke2-config"
    EOF
    on_failure = continue
  }
}

resource "aws_instance" "rke2_server" {
  ami           = "ami-0ecb62995f68bb549"
  instance_type = var.instance_type
  key_name      = aws_key_pair.local_key.key_name

  vpc_security_group_ids = [aws_security_group.rke2_sg.id]

  root_block_device {
    volume_size = 30
  }

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
    chmod 700 get_helm.sh
    ./get_helm.sh

    # 9. Auto-Remove Cloud Provider Taint (Background Job)
    # Der AWS CCM funktioniert ohne IAM Role nicht - daher entfernen wir den Taint manuell
    # Das Script läuft im Hintergrund und wartet bis kubectl funktioniert
    cat <<'TAINT_SCRIPT' > /usr/local/bin/remove-cloud-taint.sh
    #!/bin/bash
    export PATH=/var/lib/rancher/rke2/bin:$PATH
    export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
    
    # Warte bis kubectl funktioniert (max 5 Minuten)
    for i in {1..60}; do
      if kubectl get nodes &>/dev/null; then
        break
      fi
      sleep 5
    done
    
    # Warte noch 30 Sekunden damit der Node registriert ist
    sleep 30
    
    # Entferne den Cloud-Provider Taint von allen Nodes
    kubectl taint nodes --all node.cloudprovider.kubernetes.io/uninitialized- 2>/dev/null || true
    
    echo "$(date): Cloud provider taint removed" >> /var/log/taint-removal.log
    TAINT_SCRIPT
    
    chmod +x /usr/local/bin/remove-cloud-taint.sh
    nohup /usr/local/bin/remove-cloud-taint.sh &>/var/log/taint-removal.log &
  EOF

  tags = {
    Name = "${var.cluster_name}-server"
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
  }
}

# RKE2 Workers
resource "aws_instance" "rke2_worker" {
  count         = var.worker_count
  ami           = "ami-0ecb62995f68bb549"
  instance_type = var.instance_type
  key_name      = aws_key_pair.local_key.key_name

  vpc_security_group_ids = [aws_security_group.rke2_sg.id]

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

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

# Sync manifests to RKE2 server
resource "null_resource" "sync_manifests" {
  depends_on = [aws_instance.rke2_server]
  
  triggers = {
    # AWS Cloud Controller Manager
    ccm_content = templatefile("${path.module}/manifest/aws-cloud-controller-manager.yaml.tpl", {
      cluster_name      = var.cluster_name
      aws_access_key    = local.aws_access_key
      aws_secret_key    = local.aws_secret_key
      aws_session_token = local.aws_session_token
    })
    
    # Prometheus Stack (inkl. Local-Path-Provisioner, Node-Exporter, Kube-State-Metrics)
    prometheus_content = templatefile("${path.module}/manifest/prometheus-stack.yaml.tpl", {
      monitoring_namespace       = var.monitoring_namespace
      prometheus_version         = var.prometheus_version
      prometheus_retention       = var.prometheus_retention
      prometheus_scrape_interval = var.prometheus_scrape_interval
      prometheus_storage_size    = var.prometheus_storage_size
      alertmanager_enabled       = var.alertmanager_enabled
      alertmanager_smtp_host     = var.alertmanager_smtp_host
      alertmanager_smtp_from     = var.alertmanager_smtp_from
      alertmanager_smtp_to       = var.alertmanager_smtp_to
      alertmanager_smtp_username = var.alertmanager_smtp_username
      alertmanager_smtp_password = var.alertmanager_smtp_password
    })
    
    # Loki Stack (Loki + Promtail)
    loki_content = templatefile("${path.module}/manifest/loki-stack.yaml.tpl", {
      monitoring_namespace = var.monitoring_namespace
      loki_version         = var.loki_version
      loki_storage_size    = var.loki_storage_size
    })
    
    # Grafana (Visualization)
    grafana_content = templatefile("${path.module}/manifest/grafana.yaml.tpl", {
      monitoring_namespace   = var.monitoring_namespace
      grafana_version        = var.grafana_version
      grafana_admin_password = var.grafana_admin_password
      grafana_storage_size   = var.grafana_storage_size
    })
  }

  connection {
    type        = "ssh"
    user        = "ubuntu"
    host        = aws_instance.rke2_server.public_ip
    private_key = var.private_key_path != "" ? file(pathexpand(var.private_key_path)) : null
    agent       = var.private_key_path == ""
  }

  provisioner "file" {
    content     = self.triggers.ccm_content
    destination = "/tmp/aws-cloud-controller-manager.yaml"
  }

  provisioner "file" {
    content     = self.triggers.prometheus_content
    destination = "/tmp/prometheus-stack.yaml"
  }

  provisioner "file" {
    content     = self.triggers.loki_content
    destination = "/tmp/loki-stack.yaml"
  }

  provisioner "file" {
    content     = self.triggers.grafana_content
    destination = "/tmp/grafana.yaml"
  }

  provisioner "remote-exec" {
    inline = [
      "sudo mkdir -p /var/lib/rancher/rke2/server/manifests",
      "sudo mv /tmp/aws-cloud-controller-manager.yaml /var/lib/rancher/rke2/server/manifests/",
      "sudo mv /tmp/prometheus-stack.yaml /var/lib/rancher/rke2/server/manifests/",
      "sudo mv /tmp/loki-stack.yaml /var/lib/rancher/rke2/server/manifests/",
      "sudo mv /tmp/grafana.yaml /var/lib/rancher/rke2/server/manifests/",
      "sudo chmod 600 /var/lib/rancher/rke2/server/manifests/*.yaml"
    ]
  }
}
