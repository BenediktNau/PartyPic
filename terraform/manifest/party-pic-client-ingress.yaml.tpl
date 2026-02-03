apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: party-pic-client-ingress
  namespace: party-pic
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  ingressClassName: nginx
  rules:
  - host: app.${ip}.nip.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: party-pic-client
            port:
              number: 80
      - path: /auth
        pathType: Prefix
        backend:
          service:
            name: party-pic-server
            port:
              number: 3000
      - path: /sessions
        pathType: Prefix
        serviceName: party-pic-server
        backend:
          service:
            name: party-pic-server
            port:
              number: 3000
      - path: /users
        pathType: Prefix
        serviceName: party-pic-server
        backend:
          service:
            name: party-pic-server
            port:
              number: 3000
      - path: /pictures
        pathType: Prefix
        serviceName: party-pic-server
        backend:
          service:
            name: party-pic-server
            port:
              number: 3000
      - path: /metrics
        pathType: Prefix
        serviceName: party-pic-server
        backend:
          service:
            name: party-pic-server
            port:
              number: 3000