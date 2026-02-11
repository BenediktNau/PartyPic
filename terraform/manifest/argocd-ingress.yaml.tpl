# =============================================================================
# ARGOCD INGRESS
#
# Macht ArgoCD von aussen erreichbar unter argo.<IP>.nip.io
# Die IP wird von Terraform eingesetzt (Elastic IP).
# =============================================================================
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: manual-argocd-ingress
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  ingressClassName: nginx
  rules:
  - host: argo.${ip}.nip.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: argocd-server
            port:
              number: 80