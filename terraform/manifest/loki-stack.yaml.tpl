# =============================================================================
# LOKI STACK - Log Aggregation
# =============================================================================
# Komponenten:
# - Loki Server: Speichert und indiziert Logs
# - Promtail: DaemonSet, sammelt Logs von allen Nodes
#
# SKALIERUNG:
# -----------
# Promtail läuft automatisch auf jedem Node (DaemonSet)
# Bei worker_count Erhöhung = automatisch mehr Log-Collector
# =============================================================================

apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: loki-stack
  namespace: kube-system
spec:
  repo: https://grafana.github.io/helm-charts
  chart: loki-stack
  version: "${loki_version}"
  targetNamespace: ${monitoring_namespace}
  createNamespace: true
  
  valuesContent: |-
    # LOKI SERVER
    loki:
      enabled: true
      
      # Persistence
      persistence:
        enabled: ${loki_storage_enabled}
        size: ${loki_storage_size}
        storageClassName: local-path
      
      # Minimal Config
      config:
        auth_enabled: false
        server:
          http_listen_port: 3100
        schema_config:
          configs:
            - from: 2020-10-24
              store: boltdb-shipper
              object_store: filesystem
              schema: v11
              index:
                prefix: index_
                period: 24h
      
      # Health Checks
      livenessProbe:
        httpGet:
          path: /ready
          port: http-metrics
        initialDelaySeconds: 45
        periodSeconds: 10
      
      readinessProbe:
        httpGet:
          path: /ready
          port: http-metrics
        initialDelaySeconds: 45
        periodSeconds: 10

    # PROMTAIL - Log Collector (DaemonSet)
    promtail:
      enabled: true
      config:
        lokiAddress: http://loki:3100/loki/api/v1/push
      
      livenessProbe:
        httpGet:
          path: /ready
          port: http-metrics
        initialDelaySeconds: 10
        periodSeconds: 10
      
      readinessProbe:
        httpGet:
          path: /ready
          port: http-metrics
        initialDelaySeconds: 10
        periodSeconds: 10
