# =============================================================================
# CLUSTER AUTOSCALER
#
# Skaliert die AWS Auto Scaling Group basierend auf Pending Pods.
# Wenn Pods nicht gescheduled werden koennen, werden neue Nodes gestartet.
# Wenn Nodes leer sind, werden sie entfernt.
#
# Findet die ASG automatisch ueber die k8s.io/cluster-autoscaler Tags.
# =============================================================================
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  chart: cluster-autoscaler
  repo: https://kubernetes.github.io/autoscaler
  version: 9.29.0
  targetNamespace: kube-system
  bootstrap: false
  valuesContent: |-
    # Findet ASG automatisch ueber Tags
    autoDiscovery:
      clusterName: ${cluster_name}
    
    # AWS Credentials (von Terraform)
    extraEnv:
      AWS_ACCESS_KEY_ID: "${aws_access_key}"
      AWS_SECRET_ACCESS_KEY: "${aws_secret_key}"
      AWS_SESSION_TOKEN: "${aws_session_token}"

    # Nur auf Control Plane laufen
    nodeSelector:
      node-role.kubernetes.io/control-plane: "true"
    
    tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/control-plane
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/master
        operator: Exists