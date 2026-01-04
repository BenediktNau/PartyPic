# PartyPic Development Guide

## Architecture Overview

PartyPic is a photo-sharing web app for events.
- **Frontend**: React 19, TypeScript, Vite 7, TailwindCSS 4, TanStack Router, React Query.
- **Backend**: NestJS 11, TypeScript, Passport (JWT), AWS SDK (S3).
- **Database**: PostgreSQL 18 (Raw SQL, no ORM).
- **Storage**: S3-compatible (MinIO in dev).

## Critical Workflows

### Startup
```bash
# 1. Start Infrastructure (DB + MinIO)
docker compose up -d

# 2. Start Server (Port 3000)
cd party-pic_server && npm run start:dev

# 3. Start Client (Port 5173)
cd party-pic_client && npm run dev
```

### Infrastructure (Terraform)
Located in `terraform/`. Deploys an RKE2 Kubernetes cluster on AWS.
- **Credentials**: Managed via `env.sh` (reads env vars) or `set_aws_cred.sh` (writes to `~/.aws/credentials`).
- **Deployment**:
  ```bash
  cd terraform
  terraform init
  terraform apply # Deploys RKE2 Server + Workers
  ```
- **Key Resources**:
  - `aws_instance.rke2_server`: The control plane.
  - `aws_instance.rke2_worker`: Worker nodes (count via `worker_count`).
  - **Manifests**: `terraform/manifest/` contains RKE2 HelmCharts (e.g., `aws-cloud-controller-manager`).
    - Synced to `/var/lib/rancher/rke2/server/manifests` via `null_resource.sync_manifests`.
    - RKE2 automatically applies these manifests.
- **Access**: Use `terraform output ssh_command_server` to connect.

### Database Management
- **No Migration Tool**: Schema changes are manual. See `DatabaseTables.txt`.
- **Connection**:
  - **Preferred**: `PG_POOL` injection pattern (see `app.module.ts` & `pictures.db.service.ts`).
  - **Avoid**: `postrges.service.ts` (contains legacy code/bugs).
- **UUIDs**: All IDs are UUIDs generated via `gen_random_uuid()`.

## Code Patterns & Conventions

### Frontend (party-pic_client)
- **Routing**: File-based routing in `src/routes/`.
  - **Do NOT edit** `src/routeTree.gen.ts` (auto-generated).
  - Use `createFileRoute` for new routes.
- **State**:
  - `AuthContext` for user session/tokens.
  - `React Query` for server state (pictures, sessions).
- **Styling**: TailwindCSS 4.

### Backend (party-pic_server)
- **Module Structure**: Feature-based (e.g., `pictures/`, `sessions/`, `auth/`).
- **Database Access**:
  - Inject `'PG_POOL'` into services.
  - Use raw SQL queries: `pool.query('SELECT * FROM ...', [params])`.
  - **Do NOT use an ORM** (TypeORM/Prisma are NOT configured).
- **Configuration**:
  - Use `ConfigService` to access env vars (e.g., `configService.get('DB_HOST')`).
  - `.env.dev` is loaded by `ConfigModule`.

### Authentication
- **Flow**:
  1. Client sends credentials to `/auth/login`.
  2. Server validates & returns JWT.
  3. Client stores JWT in `localStorage` (via `AuthContext`).
  4. `api-client.ts` interceptor adds `Authorization: Bearer <token>` to requests.
- **Backend Guard**: Use `@UseGuards(JwtAuthGuard)` for protected endpoints.

## Known Issues & Gotchas
- **`postrges.service.ts`**: Contains a crashing bug (`console.log(test)`). Do not use this file; use the `PG_POOL` provider pattern instead.
- **Language**: Comments and some variable names are in **German**.
- **File Uploads**: 10MB limit. Flow: Upload -> Memory -> S3 -> DB Metadata.

## Testing
- **Backend**: `npm test` (Jest).
- **E2E**: `npm run test:e2e`.

## Project Goals & Requirements (Semester Project)

### Core Requirements
1. **Application & Containerization**
   - Dockerfile (multi-stage builds).
   - `docker-compose.yml` for local dev.
2. **Infrastructure as Code (Terraform)**
   - AWS Provider.
   - Variables, outputs, state management.
3. **Orchestration (Kubernetes)**
   - Manifests/Helm Charts.
   - Service Exposure (Ingress/LoadBalancer).
4. **CI/CD Pipeline**
   - Build -> Test -> Docker Build -> Push -> Deploy.
   - Secrets management.
5. **Monitoring & Observability**
   - Prometheus (Metrics), Grafana (Visualization).
   - Track App, Infra, and K8s metrics.

### Bonus Features
6. **Auto-Scaling**: HPA (CPU/Memory), Load Testing (k6).
7. **High Availability**: Multiple replicas, Health Checks (Liveness/Readiness), PDB.
8. **Backup & DR**: Automated backups (DB/Volumes) to S3.

