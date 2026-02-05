# =============================================================================
# PARTY-PIC NAMESPACE & SECRETS
#
# Kubernetes Secret mit allen Credentials fuer die Applikation:
# - PostgreSQL Zugangsdaten (DB auf RDS)
# - MinIO/S3 Zugangsdaten (Bild-Storage)
# - JWT Secret fuer Token-Signierung
#
# Werte werden von Terraform aus terraform.tfvars injiziert.
# =============================================================================
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
  # Datenbank-Credentials
  db-host: "${db_host}"
  db-password: "${db_password}"
  db-name: "${db_name}"
  db-user: "${db_user}"
  
  # S3/MinIO-Credentials
  s3-endpoint: "${s3_endpoint}"
  s3-access-key: "${s3_access_key}"
  s3-secret-key: "${s3_secret_key}"
  s3-session-token: "${s3_session_token}"
  s3-bucket-name: "${s3_bucket_name}"
  s3-region: "${s3_region}"
  
  # JWT Secret (min. 32 Zeichen empfohlen)
  jwt-secret: "${jwt_secret}"