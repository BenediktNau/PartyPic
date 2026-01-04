# =============================================================================
# PROMETHEUS STACK - Minimales HelmChart für RKE2
# =============================================================================
#
# ERKLÄRUNG:
# ----------
# Diese Datei ist ein RKE2 HelmChart-Manifest. RKE2 erkennt automatisch alle
# YAML-Dateien im Ordner /var/lib/rancher/rke2/server/manifests/ und wendet
# sie auf den Cluster an.
#
# Das HelmChart "kube-prometheus-stack" ist ein Meta-Chart, das folgende
# Komponenten bündelt:
#   - Prometheus (Metrics-Server)
#   - Node-Exporter (Hardware/OS-Metriken von jedem Node)
#   - Kube-State-Metrics (Kubernetes-Objektzustände)
#   - Alertmanager (Alert-Routing)
#
# NODE-EXPORTER vs. KUBE-STATE-METRICS:
# -------------------------------------
# Node-Exporter:
#   - Läuft als DaemonSet (1 Pod pro Node)
#   - Liest aus /proc und /sys des Host-Systems
#   - Liefert: CPU%, RAM%, Disk I/O, Network Traffic
#   - Beispiel-Metrik: node_cpu_seconds_total
#
# Kube-State-Metrics:
#   - Läuft als einzelnes Deployment (1 Pod im Cluster)
#   - Fragt die Kubernetes API ab
#   - Liefert: Pod-Status, Deployment-Replicas, PVC-Zustände
#   - Beispiel-Metrik: kube_pod_status_phase
#
# SCRAPING-LOGIK:
# ---------------
# Prometheus nutzt "Service Discovery" um Targets zu finden:
# 1. ServiceMonitor-Ressourcen definieren, welche Services gescraped werden
# 2. Prometheus findet diese automatisch über Labels
# 3. Alle 30 Sekunden werden Metriken von den Targets abgerufen
#
# =============================================================================

apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  # Name des HelmCharts - erscheint in kubectl get helmcharts -n kube-system
  name: prometheus-stack
  # MUSS kube-system sein, damit RKE2 das HelmChart erkennt
  namespace: kube-system
spec:
  # Helm Repository URL - hier liegt das offizielle Chart
  repo: https://prometheus-community.github.io/helm-charts
  chart: kube-prometheus-stack
  version: "55.5.0"
  targetNamespace: monitoring
  createNamespace: true
  
  valuesContent: |-
    commonLabels:
      cluster: ${cluster_name}
      environment: ${environment}

    prometheus:
      prometheusSpec:
        retention: 15d
        scrapeInterval: 30s
        storageSpec:
          volumeClaimTemplate:
            spec:
              storageClassName: local-path
              accessModes: ["ReadWriteOnce"]
              resources:
                requests:
                  storage: 10Gi
      service:
        type: NodePort
        nodePort: 30090

    nodeExporter:
      enabled: true

    kubeStateMetrics:
      enabled: true

    alertmanager:
      enabled: true

    grafana:
      enabled: false
