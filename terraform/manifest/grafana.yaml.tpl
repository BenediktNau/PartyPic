# =============================================================================
# GRAFANA - Minimales HelmChart für Visualization
# =============================================================================
#
# ERKLÄRUNG:
# ----------
# Grafana ist das Visualisierungs-Frontend für Prometheus und Loki.
# Es verbindet sich als "Datasource" mit beiden und ermöglicht:
#   - Dashboards für Metriken (Prometheus)
#   - Log-Exploration (Loki)
#   - Alerting (optional)
#
# DASHBOARDS:
# -----------
# Diese Konfiguration enthält 2 vorkonfigurierte Dashboards:
#
# 1. App-Health Dashboard:
#    - CPU/Memory Usage der PartyPic-Pods
#    - HTTP Request Rate und Latenz
#    - Pod-Status (Running/Failed)
#
# 2. Cluster-Resources Dashboard:
#    - Node CPU/Memory/Disk (aus Node-Exporter)
#    - Pod-Verteilung pro Namespace (aus Kube-State-Metrics)
#    - Network I/O
#
# DATASOURCE-KONFIGURATION:
# -------------------------
# Grafana muss wissen, wo Prometheus und Loki erreichbar sind.
# Da alle im gleichen Namespace (monitoring) laufen, nutzen wir
# Kubernetes-interne DNS-Namen:
#   - prometheus-stack-prometheus.monitoring:9090
#   - loki.monitoring:3100
#
# =============================================================================

apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: grafana
  namespace: kube-system
spec:
  repo: https://grafana.github.io/helm-charts
  chart: grafana
  version: "7.0.0"
  targetNamespace: monitoring
  createNamespace: true
  
  valuesContent: |-
    #
    # ADMIN CREDENTIALS
    # In Produktion: Nutze Kubernetes Secrets statt Plaintext!
    #
    adminUser: admin
    adminPassword: "${grafana_admin_password}"
    
    #
    # PERSISTENCE
    # Dashboards und Settings bleiben nach Restart erhalten
    #
    persistence:
      enabled: true
      size: 2Gi
      storageClassName: local-path
    
    service:
      type: NodePort
      port: 80
      nodePort: 30080
    
    livenessProbe:
      httpGet:
        path: /api/health
        port: 3000
      initialDelaySeconds: 60
      periodSeconds: 10
      failureThreshold: 3
    
    #
    # READINESS PROBE
    # Kürzere initialDelay weil wir früher wissen wollen
    # ob Grafana Requests annehmen kann
    #
    readinessProbe:
      httpGet:
        path: /api/health
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 10
      failureThreshold: 3
    
    #
    # DATASOURCES
    # Automatisch konfiguriert beim Start
    # apiVersion: 1 ist das Grafana Provisioning Format
    #
    datasources:
      datasources.yaml:
        apiVersion: 1
        datasources:
          #
          # PROMETHEUS DATASOURCE
          # isDefault: true = Standard für neue Panels
          #
          - name: Prometheus
            type: prometheus
            url: http://prometheus-stack-prometheus.monitoring:9090
            access: proxy
            isDefault: true
          
          #
          # LOKI DATASOURCE
          # Für Log-Queries in Grafana Explore
          #
          - name: Loki
            type: loki
            url: http://loki.monitoring:3100
            access: proxy
    
    #
    # DASHBOARD PROVIDER
    # Sagt Grafana, wo es Dashboard-JSONs findet
    #
    dashboardProviders:
      dashboardproviders.yaml:
        apiVersion: 1
        providers:
          - name: 'default'
            folder: 'PartyPic'
            type: file
            disableDeletion: true
            options:
              path: /var/lib/grafana/dashboards/default
    
    #
    # DASHBOARDS
    # Inline JSON-Definitionen für die 2 Dashboards
    #
    dashboards:
      default:
        #
        # DASHBOARD 1: App Health
        # Zeigt Metriken der PartyPic-Applikation
        #
        app-health:
          json: |
            {
              "title": "PartyPic - App Health",
              "uid": "app-health",
              "panels": [
                {
                  "title": "Pod CPU Usage",
                  "type": "gauge",
                  "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
                  "targets": [{
                    "expr": "sum(rate(container_cpu_usage_seconds_total{namespace=\"default\"}[5m])) * 100",
                    "refId": "A"
                  }],
                  "fieldConfig": {
                    "defaults": {
                      "unit": "percent",
                      "max": 100
                    }
                  }
                },
                {
                  "title": "Pod Memory Usage",
                  "type": "gauge",
                  "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
                  "targets": [{
                    "expr": "sum(container_memory_usage_bytes{namespace=\"default\"}) / 1024 / 1024",
                    "refId": "A"
                  }],
                  "fieldConfig": {
                    "defaults": {
                      "unit": "decmbytes"
                    }
                  }
                },
                {
                  "title": "HTTP Requests",
                  "type": "timeseries",
                  "gridPos": {"h": 8, "w": 24, "x": 0, "y": 8},
                  "targets": [{
                    "expr": "sum(rate(http_requests_total[5m])) by (status)",
                    "legendFormat": "Status {{status}}",
                    "refId": "A"
                  }]
                }
              ],
              "refresh": "30s",
              "time": {"from": "now-1h", "to": "now"}
            }
        
        #
        # DASHBOARD 2: Cluster Resources
        # Zeigt Node- und Kubernetes-Metriken
        #
        cluster-resources:
          json: |
            {
              "title": "PartyPic - Cluster Resources",
              "uid": "cluster-resources",
              "panels": [
                {
                  "title": "Node CPU (von Node-Exporter)",
                  "description": "Diese Metrik kommt vom Node-Exporter DaemonSet",
                  "type": "gauge",
                  "gridPos": {"h": 8, "w": 8, "x": 0, "y": 0},
                  "targets": [{
                    "expr": "100 - (avg(irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
                    "refId": "A"
                  }],
                  "fieldConfig": {
                    "defaults": {"unit": "percent", "max": 100}
                  }
                },
                {
                  "title": "Node Memory (von Node-Exporter)",
                  "description": "RAM-Auslastung aller Nodes",
                  "type": "gauge",
                  "gridPos": {"h": 8, "w": 8, "x": 8, "y": 0},
                  "targets": [{
                    "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100",
                    "refId": "A"
                  }],
                  "fieldConfig": {
                    "defaults": {"unit": "percent", "max": 100}
                  }
                },
                {
                  "title": "Node Disk (von Node-Exporter)",
                  "description": "Festplattenauslastung",
                  "type": "gauge",
                  "gridPos": {"h": 8, "w": 8, "x": 16, "y": 0},
                  "targets": [{
                    "expr": "(1 - (node_filesystem_avail_bytes{mountpoint=\"/\"} / node_filesystem_size_bytes{mountpoint=\"/\"})) * 100",
                    "refId": "A"
                  }],
                  "fieldConfig": {
                    "defaults": {"unit": "percent", "max": 100}
                  }
                },
                {
                  "title": "Running Pods (von Kube-State-Metrics)",
                  "description": "Diese Metrik kommt von Kube-State-Metrics - fragt die K8s API ab",
                  "type": "stat",
                  "gridPos": {"h": 4, "w": 12, "x": 0, "y": 8},
                  "targets": [{
                    "expr": "sum(kube_pod_status_phase{phase=\"Running\"})",
                    "refId": "A"
                  }]
                },
                {
                  "title": "Deployments Ready (von Kube-State-Metrics)",
                  "description": "Anzahl Deployments mit allen Replicas bereit",
                  "type": "stat",
                  "gridPos": {"h": 4, "w": 12, "x": 12, "y": 8},
                  "targets": [{
                    "expr": "sum(kube_deployment_status_replicas_available)",
                    "refId": "A"
                  }]
                }
              ],
              "refresh": "30s",
              "time": {"from": "now-1h", "to": "now"}
            }
