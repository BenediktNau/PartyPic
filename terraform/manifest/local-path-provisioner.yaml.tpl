# Local Path Provisioner - StorageClass for RKE2
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
