# =============================================================================
# INFRASTRUCTURE VARIABLES
# =============================================================================

variable "aws_region" {
  description = "AWS Region fuer Deployment"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 Instance-Typ"
  type        = string
  default     = "t3.medium"
}

variable "public_key" {
  description = "Public SSH Key fuer Cluster-Zugang"
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
  description = "Shared Secret fuer Cluster-Join"
  type        = string
  sensitive   = true
  default     = ""
}

# =============================================================================
# MONITORING VARIABLES
# =============================================================================

variable "monitoring_namespace" {
  description = "Kubernetes Namespace fuer Monitoring-Stack"
  type        = string
  default     = "monitoring"
}

# --- PROMETHEUS ---
variable "prometheus_version" {
  description = "Version des kube-prometheus-stack Helm Charts"
  type        = string
  default     = "80.12.0"
}

variable "prometheus_retention" {
  description = "Wie lange Metriken gespeichert werden"
  type        = string
  default     = "15d"
}

variable "prometheus_scrape_interval" {
  description = "Interval fuer Metrics-Scraping"
  type        = string
  default     = "30s"
}

variable "alertmanager_enabled" {
  description = "Alertmanager aktivieren"
  type        = bool
  default     = true
}

variable "alertmanager_smtp_host" {
  description = "SMTP Server fuer Alertmanager E-Mail Benachrichtigungen"
  type        = string
  default     = "smtp-relay.brevo.com:587"
}

variable "alertmanager_smtp_from" {
  description = "Absender-Adresse fuer Alertmanager E-Mails"
  type        = string
  default     = "elias.nieweltwot+alertmanager@gmail.com"
}

variable "alertmanager_smtp_to" {
  description = "Empfänger-Adresse fuer Alertmanager E-Mails"
  type        = string
  default     = "elias.nieweltwot+alertmanager@gmail.com"
}

variable "alertmanager_smtp_username" {
  description = "SMTP Benutzername fuer Alertmanager"
  type        = string
  sensitive   = true
  default     = ""
}
variable "alertmanager_smtp_password" {
  description = "SMTP Passwort fuer Alertmanager"
  type        = string
  sensitive   = true
  default     = ""
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
  default     = ""
}

# --- LOKI ---
variable "loki_version" {
  description = "Version des Loki-Stack Helm Charts"
  type        = string
  default     = "2.10.3"
}

