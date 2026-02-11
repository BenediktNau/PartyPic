# =============================================================================
# NGINX INGRESS CONTROLLER
#
# Stellt einen AWS Network Load Balancer bereit.
# Die Elastic IP wird von Terraform erstellt und hier zugewiesen,
# damit die IP bei Neustart gleich bleibt.
# =============================================================================
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: rke2-ingress-nginx
  namespace: kube-system
spec:
  repo: https://rke2-charts.rancher.io
  chart: rke2-ingress-nginx
  targetNamespace: kube-system
  bootstrap: true
  valuesContent: |-
    controller:
      hostNetwork: false
      dnsPolicy: ClusterFirst
      publishService:
        enabled: true
      service:
        enabled: true
        type: LoadBalancer
        annotations:
          # AWS NLB mit fester Elastic IP
          service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
          service.beta.kubernetes.io/aws-load-balancer-eip-allocations: "${eip_allocation_id}"
          service.beta.kubernetes.io/aws-load-balancer-subnets: "${subnet_id}"
      kind: Deployment
      replicaCount: 2  # Fuer High Availability