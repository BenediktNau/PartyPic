# =============================================================================
# PROMETHEUS STACK + LOCAL-PATH-PROVISIONER
# =============================================================================
# Kombiniertes Manifest für:
# - Local-Path-Provisioner (StorageClass für Persistent Volumes)
# - Prometheus (Metrics Collection)
# - Node-Exporter (Hardware-Metriken)
# - Kube-State-Metrics (Kubernetes-Metriken)
#
# SKALIERUNG:
# -----------
# - worker_count in variables.tf erhöhen = mehr Nodes = mehr Metriken
# - retention/storage über Variablen anpassbar
# =============================================================================

---
# 1. LOCAL-PATH-PROVISIONER
# Erstellt StorageClass für dynamische PV-Provisioning auf jedem Node
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: local-path-provisioner
  namespace: kube-system
spec:
  repo: https://charts.containeroo.ch
  chart: local-path-provisioner
  version: "0.0.28"
  targetNamespace: local-path-storage
  createNamespace: true
  valuesContent: |-
    storageClass:
      name: local-path
      defaultClass: true
      reclaimPolicy: Delete
    nodePathMap:
      - node: DEFAULT_PATH_FOR_NON_LISTED_NODES
        paths:
          - /var/lib/local-path-provisioner

---
# 2. PROMETHEUS STACK
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
    # Labels für alle Ressourcen
    commonLabels:
      cluster: ${cluster_name}
      environment: ${environment}

    # PROMETHEUS SERVER
    prometheus:
      prometheusSpec:
        retention: ${prometheus_retention}
        scrapeInterval: ${prometheus_scrape_interval}
        # Storage nur wenn aktiviert
        %{ if prometheus_storage_enabled }
        storageSpec:
          volumeClaimTemplate:
            spec:
              storageClassName: local-path
              accessModes: ["ReadWriteOnce"]
              resources:
                requests:
                  storage: ${prometheus_storage_size}
        %{ endif }
      # NodePort für externen Zugriff
      service:
        type: NodePort
        nodePort: ${prometheus_nodeport}

    # NODE-EXPORTER: Hardware-Metriken von jedem Node
    nodeExporter:
      enabled: true

    # KUBE-STATE-METRICS: Kubernetes-Objekt-Status
    kubeStateMetrics:
      enabled: true

    # ALERTMANAGER: Alerts (minimal)
    alertmanager:
      enabled: ${alertmanager_enabled}

    # Grafana separat deployen
    grafana:
      enabled: false
