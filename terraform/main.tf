data "external" "env" {
  program = ["${path.module}/env.sh"]
}

# Look up instances that belong to the ASG by filtering for the cluster tag
data "aws_instances" "worker_nodes" {
  instance_tags = {
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
    Name = "${var.cluster_name}-worker" # Must match the tag in your Launch Template
  }

  instance_state_names = ["running"]

  # Ensure we don't try to look them up before the ASG exists
  depends_on = [aws_autoscaling_group.rke2_workers]
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

# --- Get Default VPC and Subnets ---
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

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
  # NodePort Range für LoadBalancer Services
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

# 1. Erstelle die feste IP
resource "aws_eip" "ingress_ip" {
  domain = "vpc"
  tags = {
    Name = "${var.cluster_name}-ingress-ip"
  }
}

# --- 1. RKE2 SERVER ---

resource "aws_instance" "rke2_server" {
  ami           = "ami-0ecb62995f68bb549"
  instance_type = var.instance_type
  key_name      = aws_key_pair.local_key.key_name
  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
  }

  vpc_security_group_ids = [aws_security_group.rke2_sg.id]

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
    disable: 
      - rke2-ingress-nginx
    
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
  EOF

  tags = {
    Name                                        = "${var.cluster_name}-server"
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
  }
}


# --- 2. RKE2 WORKERS ---
# --- 2. RKE2 WORKER LAUNCH TEMPLATE ---
resource "aws_launch_template" "rke2_worker_lt" {
  name_prefix   = "${var.cluster_name}-worker-"
  image_id      = "ami-0ecb62995f68bb549" 
  instance_type = var.instance_type
  key_name      = aws_key_pair.local_key.key_name

  block_device_mappings {
    device_name = "/dev/sda1"

    ebs {
      volume_size           = 12.5
      volume_type           = "gp3"
      delete_on_termination = true
    }
  }

  vpc_security_group_ids = [aws_security_group.rke2_sg.id]

  # We use base64encode for Launch Templates
  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -e
    apt-get update -y
    apt-get install -y curl
    
    # 1. Fetch Metadata for ProviderID
    TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
    AZ=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" -s http://169.254.169.254/latest/meta-data/placement/availability-zone | tr -d '\n')
    IID=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" -s http://169.254.169.254/latest/meta-data/instance-id | tr -d '\n')

    # 2. Create RKE2 Config Directory
    mkdir -p /etc/rancher/rke2

    # 3. Create config.yaml for the agent
    cat <<EOC > /etc/rancher/rke2/config.yaml
    server: https://${aws_instance.rke2_server.private_ip}:9345
    token: "${var.rke2_token}"
    kubelet-arg:
      - "cloud-provider=external"
      - "provider-id=aws:///$${AZ}/$${IID}"
    EOC

    # 4. Install RKE2 Agent
    curl -sfL https://get.rke2.io | INSTALL_RKE2_TYPE="agent" sh -

    # 5. Start Service
    systemctl enable rke2-agent
    systemctl start rke2-agent
  EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name                                        = "${var.cluster_name}-worker"
      "kubernetes.io/cluster/${var.cluster_name}" = "owned"
    }
  }
}

# --- 3. AUTO SCALING GROUP ---
resource "aws_autoscaling_group" "rke2_workers" {
  name             = "${var.cluster_name}-worker-asg"
  desired_capacity = var.worker_count
  max_size         = 10
  min_size         = 1
  
  # --- FIX HERE: Use the subnets found above ---
  vpc_zone_identifier = data.aws_subnets.default.ids 

  launch_template {
    id      = aws_launch_template.rke2_worker_lt.id
    version = "$Latest"
  }

  tag {
    key                 = "k8s.io/cluster-autoscaler/enabled"
    value               = "true"
    propagate_at_launch = true
  }
  tag {
    key                 = "k8s.io/cluster-autoscaler/${var.cluster_name}"
    value               = "owned"
    propagate_at_launch = true
  }
}

# --- 3. MANIFEST SYNC ---
resource "null_resource" "sync_manifests" {
  depends_on = [aws_instance.rke2_server]
  
  triggers = {
    ccm_content = templatefile("${path.module}/aws-cloud-controller-manager.yaml.tpl", {
      cluster_name      = var.cluster_name
      aws_access_key    = local.aws_access_key
      aws_secret_key    = local.aws_secret_key
      aws_session_token = local.aws_session_token
    })
    ingress_config = templatefile("${path.module}/ingress-config.yaml.tpl", {
      eip_allocation_id = aws_eip.ingress_ip.allocation_id
      subnet_id = aws_instance.rke2_server.subnet_id
    })
    agrocd_ingress = templatefile("${path.module}/manifest/argocd-ingress.yaml.tpl", {
      ip = aws_eip.ingress_ip.public_ip
    })

    // Prometheus Stack (inkl. Local-Path-Provisioner, Node-Exporter, Kube-State-Metrics)
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
    
    // Loki Stack (Loki + Promtail)
    loki_content = templatefile("${path.module}/manifest/loki-stack.yaml.tpl", {
      monitoring_namespace = var.monitoring_namespace
      loki_version         = var.loki_version
      loki_storage_size    = var.loki_storage_size
    })
    
    // Grafana (Visualization)
    grafana_content = templatefile("${path.module}/manifest/grafana.yaml.tpl", {
      monitoring_namespace   = var.monitoring_namespace
      grafana_version        = var.grafana_version
      grafana_admin_password = var.grafana_admin_password
      grafana_storage_size   = var.grafana_storage_size
    })
    grafana_ingress_content = templatefile("${path.module}/manifest/grafana-ingress.yaml.tpl", {
      monitoring_namespace = var.monitoring_namespace
      ip                   = aws_eip.ingress_ip.public_ip
    })
  }

  connection {
    type = "ssh"
    user = "ubuntu"
    host = aws_instance.rke2_server.public_ip
  }

  provisioner "file" {
    content     = self.triggers.ingress_config
    destination = "/tmp/ingress-config.yaml"
  }

  provisioner "file" {
    content     = self.triggers.ccm_content
    destination = "/tmp/aws-cloud-controller-manager.yaml"
  }

  provisioner "file" {
    content     = file("${path.module}/manifest/argocd.yaml")
    destination = "/tmp/argocd.yaml"
  }

  provisioner "file" {
    content     = self.triggers.agrocd_ingress
    destination = "/tmp/argocd-ingress.yaml"
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

  provisioner "file" {
    content = self.triggers.grafana_ingress_content
    destination = "/tmp/grafana-ingress.yaml"
  }

  // --- VERSCHIEBEN & ANWENDEN ---
  provisioner "remote-exec" {
    inline = [
      "sudo mkdir -p /var/lib/rancher/rke2/server/manifests",
      
      "sudo mv /tmp/*.yaml /var/lib/rancher/rke2/server/manifests/",
      
      "sudo chmod 600 /var/lib/rancher/rke2/server/manifests/*.yaml",

      "sleep 30"
    ]
  }
}

resource "null_resource" "sync_autoscaler" {
  depends_on = [aws_autoscaling_group.rke2_workers , null_resource.sync_manifests]
  triggers = {
    content = templatefile("${path.module}/manifest/cluster-autoscaler.yaml.tpl", {
      cluster_name      = var.cluster_name
      aws_access_key    = local.aws_access_key
      aws_secret_key    = local.aws_secret_key
      aws_session_token = local.aws_session_token      
    })    
  }
  connection {
    type = "ssh"
    user = "ubuntu"
    host = aws_instance.rke2_server.public_ip
  }
  provisioner "file" {
    content     = self.triggers.content
    destination = "/tmp/cluster-autoscaler.yaml"
  }

  provisioner "remote-exec" {
    inline = [
      "sudo mv /tmp/cluster-autoscaler.yaml /var/lib/rancher/rke2/server/manifests/",
    ]
  }
}

  resource "null_resource" "sync_argocd_apps" {
  depends_on = [null_resource.sync_manifests]

  connection {
    type = "ssh"
    user = "ubuntu"
    host = aws_instance.rke2_server.public_ip
  }

  provisioner "file" {
    content     = file("${path.module}/manifest/client-application.yaml")
    destination = "/tmp/client-application.yaml"
  }

  provisioner "file" {
    content     = file("${path.module}/manifest/server-application.yaml")
    destination = "/tmp/server-application.yaml"
  }

  provisioner "remote-exec" {
    inline = [
      "echo 'Waiting 60 seconds for cluster to stabilize...'",
      "sleep 60",
      "echo 'Deploying ArgoCD applications...'",
      "sudo mv /tmp/client-application.yaml /var/lib/rancher/rke2/server/manifests/",
      "sudo mv /tmp/server-application.yaml /var/lib/rancher/rke2/server/manifests/",
      "echo 'Done.'"
    ]
  }
}