# =============================================================================
# INFRASTRUCTURE VARIABLES
# =============================================================================

variable "aws_region" {
  description = "AWS Region für Deployment"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 Instance-Typ"
  type        = string
  default     = "t3.medium"
}

variable "public_key" {
  description = "Public SSH Key für Cluster-Zugang"
  type        = string
  default     = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIzG4JHCPuBQASJfAmyof6noYDSMVmkawzWzeQASwX7F simon@Simomsius"
}

variable "private_key_path" {
  description = "Pfad zum Private SSH Key. Leer = SSH Agent"
  type        = string
  default     = ""
}

variable "cluster_name" {
  description = "Name des RKE2 Clusters"
  type        = string
  default     = "rke2-cluster"
}

variable "worker_count" {
  description = "Anzahl Worker-Nodes (skaliert automatisch Monitoring)"
  type        = number
  default     = 1
}

variable "rke2_token" {
  description = "Shared Secret für Cluster-Join"
  type        = string
  sensitive   = true
  default     = "my-super-secret-rpc-password"
}

# =============================================================================
# MONITORING VARIABLES
# =============================================================================

variable "monitoring_namespace" {
  description = "Kubernetes Namespace für Monitoring-Stack"
  type        = string
  default     = "monitoring"
}

variable "environment" {
  description = "Environment Label (dev/staging/production)"
  type        = string
  default     = "production"
}

# --- PROMETHEUS ---
variable "prometheus_version" {
  description = "Version des kube-prometheus-stack Helm Charts"
  type        = string
  default     = "80.12.0"
}

variable "prometheus_nodeport" {
  description = "NodePort für Prometheus UI"
  type        = number
  default     = 30090
}

variable "prometheus_retention" {
  description = "Wie lange Metriken gespeichert werden"
  type        = string
  default     = "15d"
}

variable "prometheus_scrape_interval" {
  description = "Interval für Metrics-Scraping"
  type        = string
  default     = "30s"
}

variable "prometheus_storage_enabled" {
  description = "Persistent Storage für Prometheus aktivieren"
  type        = bool
  default     = true
}

variable "prometheus_storage_size" {
  description = "Storage-Größe für Prometheus"
  type        = string
  default     = "10Gi"
}

variable "alertmanager_enabled" {
  description = "Alertmanager aktivieren"
  type        = bool
  default     = true
}

variable "alertmanager_smtp_host" {
  description = "SMTP Server für Alertmanager E-Mail Benachrichtigungen"
  type        = string
  default     = "smtp-relay.brevo.com:587"
}

variable "alertmanager_smtp_from" {
  description = "Absender-Adresse für Alertmanager E-Mails"
  type        = string
  default     = "elias.nieweltwot+alertmanager@gmail.com"
}

variable "alertmanager_smtp_to" {
  description = "Empfänger-Adresse für Alertmanager E-Mails"
  type        = string
  default     = "elias.nieweltwot+alertmanager@gmail.com"
}

variable "alertmanager_smtp_username" {
  description = "SMTP Benutzername für Alertmanager"
  type        = string
  sensitive   = true
  default     = ""
}
variable "alertmanager_smtp_password" {
  description = "SMTP Passwort für Alertmanager"
  type        = string
  sensitive   = true
  default     = ""
}

variable "service_type" {
  description = "Service-Typ für Monitoring-Komponenten (NodePort oder LoadBalancer)"
  type        = string
  default     = "LoadBalancer"
}

# --- GRAFANA ---
variable "grafana_version" {
  description = "Version des Grafana Helm Charts (NICHT die App-Version!)"
  type        = string
  default     = "10.5.8"
}

variable "grafana_admin_password" {
  description = "Grafana Admin-Passwort"
  type        = string
  sensitive   = true
  default     = "my-super-secret-grafana-password"
}

variable "grafana_nodeport" {
  description = "NodePort für Grafana UI"
  type        = number
  default     = 30080
}

variable "grafana_storage_enabled" {
  description = "Persistent Storage für Grafana aktivieren"
  type        = bool
  default     = true
}

variable "grafana_storage_size" {
  description = "Storage-Größe für Grafana"
  type        = string
  default     = "2Gi"
}

# --- LOKI ---
variable "loki_version" {
  description = "Version des Loki-Stack Helm Charts"
  type        = string
  default     = "2.10.3"
}

variable "loki_storage_enabled" {
  description = "Persistent Storage für Loki aktivieren"
  type        = bool
  default     = true
}

variable "loki_storage_size" {
  description = "Storage-Größe für Loki"
  type        = string
  default     = "10Gi"
}
