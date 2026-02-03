apiVersion: v1
kind: Namespace
metadata:
  name: party-pic
---
apiVersion: v1
kind: Secret
metadata:
  name: party-pic-secrets
  namespace: party-pic
type: Opaque
stringData:
  db-host: "${db_host}"
  db-password: "${db_password}"
  db-name: "${db_name}"
  db-user: "${db_user}"
  s3-endpoint: "${s3_endpoint}"
  s3-access-key: "${s3_access_key}"
  s3-secret-key: "${s3_secret_key}"
  s3-session-token: "${s3_session_token}"
  s3-bucket-name: "${s3_bucket_name}"
  s3-region: "${s3_region}"
  jwt-secret: "${jwt_secret}"