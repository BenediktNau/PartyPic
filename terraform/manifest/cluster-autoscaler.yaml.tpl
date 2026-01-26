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
    autoDiscovery:
      clusterName: ${cluster_name}
    

    # CRITICAL: Inject credentials here so the pod can scale the ASG
    extraEnv:
      AWS_ACCESS_KEY_ID: "${aws_access_key}"
      AWS_SECRET_ACCESS_KEY: "${aws_secret_key}"
      AWS_SESSION_TOKEN: "${aws_session_token}"

    nodeSelector:
      node-role.kubernetes.io/control-plane: "true"
    
    tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/control-plane
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/master
        operator: Exists