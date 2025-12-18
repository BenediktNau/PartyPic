apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: aws-cloud-controller-manager
  namespace: kube-system
spec:
  repo: https://kubernetes.github.io/cloud-provider-aws
  chart: aws-cloud-controller-manager
  version: 0.0.8 # Check for the latest compatible version
  targetNamespace: kube-system
  bootstrap: true
  valuesContent: |-
    # This config tells the controller which cluster it belongs to
    args:
      - --cluster-name=${cluster_name}
      - --v=2
      - --cloud-provider=aws
      - --use-service-account-credentials=true
      - --configure-cloud-routes=false
    
    # We force this to run on the control plane (masters)
    nodeSelector:
      node-role.kubernetes.io/control-plane: "true"
    
    tolerations:
      - key: "node-role.kubernetes.io/control-plane"
        operator: "Exists"
        effect: "NoSchedule"
      - key: "node.cloudprovider.kubernetes.io/uninitialized"
        operator: "Exists"
        effect: "NoSchedule"