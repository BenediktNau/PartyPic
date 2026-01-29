apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: prometheus-stack
  namespace: kube-system
spec:
  repo: https://prometheus-community.github.io/helm-charts
  chart: kube-prometheus-stack
  version: "${prometheus_version}"
  targetNamespace: ${monitoring_namespace}
  createNamespace: true
  valuesContent: |-
    # Prometheus Server
    prometheus:
      prometheusSpec:
        retention: ${prometheus_retention}
        scrapeInterval: ${prometheus_scrape_interval}

    # Alertmanager
    alertmanager:
      enabled: ${alertmanager_enabled}
      alertmanagerSpec:
      config:
        global:
          smtp_smarthost: '${alertmanager_smtp_host}'
          smtp_from: '${alertmanager_smtp_from}'
          smtp_auth_username: '${alertmanager_smtp_username}'
          smtp_auth_password: '${alertmanager_smtp_password}'
          smtp_require_tls: true
        route:
          receiver: 'null'
          group_wait: 30s
          group_interval: 5m
          repeat_interval: 4h
          routes:
            - receiver: 'email'
              matchers:
                - severity=~"critical|warning"
        receivers:
          - name: 'null'
          - name: 'email'
            email_configs:
              - to: '${alertmanager_smtp_to}'
                send_resolved: true
      service:
        type: ClusterIP

    # Node Exporter (Metrics von jedem Node)
    nodeExporter:
      enabled: true

    # Kube-State-Metrics (Kubernetes Object Metrics)
    kubeStateMetrics:
      enabled: true

    # Grafana DEAKTIVIERT - wir deployen separat
    grafana:
      enabled: false

    # Default Rules DEAKTIVIERT - wir definieren eigene
    defaultRules:
      create: false

    # Custom Alert Rules
    additionalPrometheusRulesMap:
      partypic-alerts:
        groups:
          - name: infrastructure
            rules:
              - alert: HighCPUUsage
                expr: (1 - avg(irate(node_cpu_seconds_total{mode="idle"}[5m]))) * 100 > 80
                for: 5m
                labels:
                  severity: warning
                annotations:
                  summary: "CPU-Auslastung über 80%"
              - alert: HighMemoryUsage
                expr: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 85
                for: 5m
                labels:
                  severity: warning
                annotations:
                  summary: "Memory-Auslastung über 85%"
              - alert: PodCrashLooping
                expr: rate(kube_pod_container_status_restarts_total[15m]) * 60 * 15 > 3
                for: 5m
                labels:
                  severity: critical
                annotations:
                  summary: "Pod {{ $labels.pod }} startet wiederholt neu"
