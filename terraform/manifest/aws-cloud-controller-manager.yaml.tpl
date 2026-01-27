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
  bootstrap: true
  valuesContent: |-
    # Network Configuration
    hostNetwork: true
    
    # Controller Arguments
    args:
      - --cluster-name=${cluster_name}
      - --v=5
      - --cloud-provider=aws
      - --configure-cloud-routes=false
      - --use-service-account-credentials=false
    
    # Credentials (injected from Terraform variables)
    env:
      - name: AWS_ACCESS_KEY_ID
        value: "${aws_access_key}"
      - name: AWS_SECRET_ACCESS_KEY
        value: "${aws_secret_key}"
      - name: AWS_SESSION_TOKEN
        value: "${aws_session_token}"
      # Optional: Add region if auto-discovery fails
      # - name: AWS_REGION
      #   value: "us-east-1" 

    # Node Placement
    nodeSelector:
      node-role.kubernetes.io/control-plane: "true"
    
    # Tolerations (The dashes MUST align vertically like this)
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