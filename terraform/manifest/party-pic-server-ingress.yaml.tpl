apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: party-pic-server-ingress
  namespace: party-pic
  annotations:
    kubernetes.io/ingress.class: nginx
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
              number: 80