# =============================================================================
# LOKI STACK - Log Aggregation
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
    # Loki Server
    loki:
      enabled: true
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

    # Promtail - Log Collector (DaemonSet auf jedem Node)
    promtail:
      enabled: true
      config:
        lokiAddress: http://loki-stack.${monitoring_namespace}.svc.cluster.local:3100/loki/api/v1/push
