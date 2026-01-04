# =============================================================================
# LOKI STACK - Minimales HelmChart für Log-Aggregation
# =============================================================================
#
# ERKLÄRUNG:
# ----------
# Loki ist ein Log-Aggregationssystem von Grafana Labs, optimiert für
# Kubernetes. Es ist das "Prometheus für Logs" - leichtgewichtig und
# effizient durch Label-basierte Indexierung.
#
# KOMPONENTEN:
# ------------
# Loki (Server):
#   - Empfängt Logs von Promtail
#   - Speichert Logs komprimiert auf Disk
#   - Bietet LogQL-Abfragesprache (ähnlich PromQL)
#   - Exponiert API für Grafana
#
# Promtail (Agent):
#   - Läuft als DaemonSet auf jedem Node
#   - Liest Container-Logs aus /var/log/pods
#   - Fügt Labels hinzu (namespace, pod, container)
#   - Sendet Logs an Loki
#
# DATENFLUSS:
# -----------
# Container → stdout/stderr → Docker/containerd → /var/log/pods
#     ↓
# Promtail (liest Logs) → fügt Labels hinzu → Loki (speichert)
#     ↓
# Grafana (Explore) ← LogQL-Query ← Loki
#
# =============================================================================

apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: loki-stack
  namespace: kube-system
spec:
  repo: https://grafana.github.io/helm-charts
  chart: loki-stack
  version: "2.10.0"
  targetNamespace: monitoring
  createNamespace: true
  
  valuesContent: |-
    loki:
      enabled: true
      persistence:
        enabled: true
        size: 10Gi
        storageClassName: local-path
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
      
      #
      # LIVENESS PROBE
      # Prüft: Ist der Loki-Prozess noch am Leben?
      # httpGet /ready: Loki-spezifischer Health-Endpoint
      # initialDelaySeconds: 45s warten bis Container startet
      # failureThreshold: 3 = Nach 3 Fehlschlägen → Restart
      #
      livenessProbe:
        httpGet:
          path: /ready
          port: http-metrics
        initialDelaySeconds: 45
        periodSeconds: 10
        failureThreshold: 3
      
      #
      # READINESS PROBE
      # Prüft: Kann Loki Anfragen verarbeiten?
      # Unterschied zu Liveness: Readiness entfernt Pod aus Service
      # aber startet ihn NICHT neu
      #
      readinessProbe:
        httpGet:
          path: /ready
          port: http-metrics
        initialDelaySeconds: 45
        periodSeconds: 10
        failureThreshold: 3

    #
    # PROMTAIL - Log Collection Agent
    # DaemonSet: Läuft auf JEDEM Node im Cluster
    #
    promtail:
      enabled: true
      
      config:
        # Wohin Logs gesendet werden
        lokiAddress: http://loki:3100/loki/api/v1/push
      
      #
      # PROBES für Promtail
      #
      livenessProbe:
        httpGet:
          path: /ready
          port: http-metrics
        initialDelaySeconds: 10
        periodSeconds: 10
        failureThreshold: 3
      
      readinessProbe:
        httpGet:
          path: /ready
          port: http-metrics
        initialDelaySeconds: 10
        periodSeconds: 10
        failureThreshold: 3
