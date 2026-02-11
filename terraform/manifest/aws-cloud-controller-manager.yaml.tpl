# =============================================================================
# AWS CLOUD CONTROLLER MANAGER
#
# Ermoeglicht Kubernetes die Nutzung von AWS-Ressourcen:
# - LoadBalancer Services (NLB/ALB)
# - EBS Volumes
# - Node-Lifecycle (EC2 Instanzen)
#
# Credentials werden von Terraform injiziert.
# =============================================================================
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: aws-cloud-controller-manager
  namespace: kube-system
spec:
  chart: aws-cloud-controller-manager
  repo: https://kubernetes.github.io/cloud-provider-aws
  version: 0.0.8
  targetNamespace: kube-system
  bootstrap: true  # Vor anderen Komponenten starten
  valuesContent: |-
    # Netzwerk-Konfiguration
    hostNetwork: true
    
    # Controller Argumente
    args:
      - --cluster-name=${cluster_name}
      - --v=5
      - --cloud-provider=aws
      - --configure-cloud-routes=false
      - --use-service-account-credentials=false
    
    # Hier fügen wir die Credentials aus dem Terraform ein, da wir keine IAM-Rollen erstellen können Im Produktivsystem sollte das jedoch geschehen
    env:
      - name: AWS_ACCESS_KEY_ID
        value: "${aws_access_key}"
      - name: AWS_SECRET_ACCESS_KEY
        value: "${aws_secret_key}"
      - name: AWS_SESSION_TOKEN
        value: "${aws_session_token}"

    # Nur auf Control Plane laufen
    nodeSelector:
      node-role.kubernetes.io/control-plane: "true"
    
    # Tolerations fuer Control Plane Nodes
    tolerations:
      - key: "node.cloudprovider.kubernetes.io/uninitialized"
        value: "true"
        effect: "NoSchedule"
      - key: "node-role.kubernetes.io/control-plane"
        operator: "Exists"
        effect: "NoSchedule"
      - key: "node-role.kubernetes.io/master"
        operator: "Exists"
        effect: "NoSchedule"