# =============================================================================
# GRAFANA - Visualization Dashboard
# =============================================================================
# Automatisch konfiguriert mit:
# - Prometheus Datasource
# - Loki Datasource
# - Basis-Dashboards für Cluster-Monitoring
#
# ZUGRIFF: http://<SERVER_IP>:${grafana_nodeport}
# =============================================================================

apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: grafana
  namespace: kube-system
spec:
  repo: https://grafana.github.io/helm-charts
  chart: grafana
  version: "${grafana_version}"
  targetNamespace: ${monitoring_namespace}
  createNamespace: true
  
  valuesContent: |-
    # Admin-Zugang
    adminUser: admin
    adminPassword: "${grafana_admin_password}"
    
    # Persistence für Dashboard-Speicherung
    persistence:
      enabled: ${grafana_storage_enabled}
      size: ${grafana_storage_size}
      storageClassName: local-path
    
    # NodePort für externen Zugriff
    service:
      type: NodePort
      port: 80
      nodePort: ${grafana_nodeport}
    
    # Health Checks
    livenessProbe:
      httpGet:
        path: /api/health
        port: 3000
      initialDelaySeconds: 60
      periodSeconds: 10
    
    readinessProbe:
      httpGet:
        path: /api/health
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 10
    
    # AUTO-KONFIGURIERTE DATASOURCES
    datasources:
      datasources.yaml:
        apiVersion: 1
        datasources:
          - name: Prometheus
            type: prometheus
            url: http://prometheus-stack-kube-prom-prometheus.${monitoring_namespace}:9090
            access: proxy
            isDefault: true
          - name: Loki
            type: loki
            url: http://loki.${monitoring_namespace}:3100
            access: proxy
    
    # DASHBOARD PROVIDER
    dashboardProviders:
      dashboardproviders.yaml:
        apiVersion: 1
        providers:
          - name: 'default'
            folder: 'Cluster'
            type: file
            disableDeletion: false
            options:
              path: /var/lib/grafana/dashboards/default
    
    # MINIMAL DASHBOARD: Cluster Overview
    dashboards:
      default:
        cluster-overview:
          json: |
            {
              "title": "Cluster Overview",
              "uid": "cluster-overview",
              "panels": [
                {
                  "title": "CPU Usage per Node",
                  "type": "timeseries",
                  "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
                  "targets": [{
                    "expr": "100 - (avg by(instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
                    "legendFormat": "{{instance}}"
                  }]
                },
                {
                  "title": "Memory Usage per Node",
                  "type": "timeseries",
                  "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
                  "targets": [{
                    "expr": "(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100",
                    "legendFormat": "{{instance}}"
                  }]
                },
                {
                  "title": "Pod Count by Namespace",
                  "type": "bargauge",
                  "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8},
                  "targets": [{
                    "expr": "count by(namespace) (kube_pod_info)",
                    "legendFormat": "{{namespace}}"
                  }]
                },
                {
                  "title": "Disk Usage",
                  "type": "gauge",
                  "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8},
                  "targets": [{
                    "expr": "(1 - node_filesystem_avail_bytes{mountpoint=\"/\"} / node_filesystem_size_bytes{mountpoint=\"/\"}) * 100"
                  }],
                  "fieldConfig": {
                    "defaults": {"unit": "percent", "max": 100, "thresholds": {"steps": [{"value": 0, "color": "green"}, {"value": 80, "color": "yellow"}, {"value": 90, "color": "red"}]}}
                  }
                }
              ],
              "refresh": "30s",
              "time": {"from": "now-1h", "to": "now"}
            }
