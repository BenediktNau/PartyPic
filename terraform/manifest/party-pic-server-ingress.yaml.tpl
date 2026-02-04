apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: party-pic-server-ingress
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: api.${ip}.nip.io
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: party-pic-server
                port:
                  number: 3000