apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: manual-grafana-ingress
  namespace: ${monitoring_namespace}
  annotations:
    # Wichtig für Nginx Controller
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
    nginx.ingress.kubernetes.io/ssl-passthrough: "false"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  ingressClassName: nginx
  rules:
  - host: grafana.${ip}.nip.io   # <-- Hier deine ECHTE IP eintragen!
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: grafana
            port:
              number: 80