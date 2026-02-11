# =============================================================================
# LOKI STACK - Log Aggregation
#
# Log-Aggregation fuer Kubernetes:
# - Loki: Log-Datenbank (wie Prometheus, aber fuer Logs)
# - Promtail: DaemonSet das Logs von allen Containern sammelt
#
# Logs koennen in Grafana mit LogQL abgefragt werden.
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
    # Loki Server - Log-Datenbank
    loki:
      enabled: true
      config:
        auth_enabled: false  # Keine Authentifizierung (intern)
        server:
          http_listen_port: 3100
        # Schema-Konfiguration fuer Index-Speicherung
        schema_config:
          configs:
            - from: 2020-10-24
              store: boltdb-shipper
              object_store: filesystem
              schema: v11
              index:
                prefix: index_
                period: 24h

    # Promtail - Log Collector (DaemonSet auf jedem Node)
    promtail:
      enabled: true
      config:
        lokiAddress: http://loki-stack.${monitoring_namespace}.svc.cluster.local:3100/loki/api/v1/push
