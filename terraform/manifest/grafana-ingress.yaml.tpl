# =============================================================================
# GRAFANA INGRESS
#
# Macht Grafana extern erreichbar ueber:
# grafana.<lb_ip>.nip.io
#
# nip.io ist ein DNS-Wildcard-Service, der IPs in Hostnamen umwandelt.
# Die IP wird von Terraform dynamisch injiziert.
# =============================================================================
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: manual-grafana-ingress
  namespace: ${monitoring_namespace}
  annotations:
    # Wichtig fuer Nginx Controller
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
    nginx.ingress.kubernetes.io/ssl-passthrough: "false"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  ingressClassName: nginx
  rules:
  - host: grafana.${ip}.nip.io  # IP wird von Terraform injiziert
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: grafana
            port:
              number: 80