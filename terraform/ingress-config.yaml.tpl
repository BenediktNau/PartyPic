apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: rke2-ingress-nginx
  namespace: kube-system
spec:
  # HIER WAR DER FEHLER: Nutze das RKE2-spezifische Repo
  repo: https://rke2-charts.rancher.io
  chart: rke2-ingress-nginx
  targetNamespace: kube-system
  bootstrap: true
  valuesContent: |-
    controller:
      hostNetwork: false
      dnsPolicy: ClusterFirst
      service:
        enabled: true
        type: LoadBalancer
        annotations:
          service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
          # Deine Variable:
          service.beta.kubernetes.io/aws-load-balancer-eip-allocations: "${eip_allocation_id}"
          service.beta.kubernetes.io/aws-load-balancer-subnets: "${subnet_id}"
      kind: Deployment
      replicaCount: 2	
100.50.15.103