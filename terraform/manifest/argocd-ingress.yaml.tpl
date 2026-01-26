apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: manual-argocd-ingress
  namespace: argocd
  annotations:
    # Wichtig für Nginx Controller
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  ingressClassName: nginx
  rules:
  - host: argo.${ip}.nip.io   # <-- Hier deine ECHTE IP eintragen!
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: argocd-server
            port:
              number: 80