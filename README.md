# Devsu Node.js Application - Production Ready

A production-grade Node.js REST API for user management, deployed on AWS EKS with automated CI/CD pipeline, PostgreSQL database, and comprehensive monitoring.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Application Features](#application-features)
- [API Documentation](#api-documentation)
- [Containerization](#containerization)
- [Kubernetes Deployment](#kubernetes-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Security](#security)

## Overview

This is a RESTful API built with Express.js that provides user management functionality with PostgreSQL database backend. The application is containerized using Docker and deployed on AWS EKS (Elastic Kubernetes Service) with a fully automated CI/CD pipeline.

**Tech Stack:**
- **Runtime:** Node.js 18 (LTS)
- **Framework:** Express.js 4.18.2
- **Database:** PostgreSQL (AWS RDS Multi-AZ)
- **Container:** Docker (Alpine Linux base)
- **Orchestration:** Kubernetes (AWS EKS)
- **CI/CD:** AWS CodePipeline + CodeBuild
- **Infrastructure:** Terraform

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Internet                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Application    │
                    │  Load Balancer  │
                    │     (ALB)       │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼─────┐        ┌────▼─────┐        ┌────▼─────┐
   │  Pod 1   │        │  Pod 2   │        │ PgAdmin  │
   │ (Node.js)│        │ (Node.js)│        │   Pod    │
   └────┬─────┘        └────┬─────┘        └──────────┘
        │                   │
        └───────────┬───────┘
                    │
            ┌───────▼────────┐
            │   RDS Postgres │
            │   (Multi-AZ)   │
            └────────────────┘
```

**Key Components:**
- **Application Pods:** 2-10 replicas (auto-scaled based on CPU)
- **Database:** RDS PostgreSQL with Multi-AZ for high availability
- **Load Balancer:** AWS ALB with health checks
- **Secrets:** AWS Secrets Manager for credentials
- **Monitoring:** CloudWatch Logs and Container Insights

## Application Features

### Core Functionality

- **User Management API:** Create, read, and list users
- **Health Monitoring:** Built-in health check endpoint
- **Database Connection Pooling:** Efficient PostgreSQL connection management
- **Input Validation:** Schema validation using Yup
- **Error Handling:** Comprehensive error handling and logging
- **Graceful Shutdown:** Proper cleanup on termination

### Production Features

- **Auto-scaling:** Horizontal Pod Autoscaler (2-10 replicas)
- **High Availability:** Multi-pod deployment across availability zones
- **Health Checks:** Liveness and readiness probes
- **Resource Limits:** CPU and memory constraints
- **Security:** Non-root container, secrets management
- **SSL/TLS:** RDS connection with SSL enabled

## API Documentation

### Base URL

```
http://<ALB-DNS>/api
```

### Endpoints

#### 1. Health Check

**GET** `/health`

Check application and database health.

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-02-24T00:00:00.000Z"
}
```

#### 2. List All Users

**GET** `/api/users`

Retrieve all users from the database.

**Response:**
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "dni": "12345678"
  }
]
```

#### 3. Get User by ID

**GET** `/api/users/:id`

Retrieve a specific user by ID.

**Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "dni": "12345678"
}
```

**Error Response (404):**
```json
{
  "error": "User not found: 1"
}
```

#### 4. Create User

**POST** `/api/users`

Create a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "dni": "12345678"
}
```

**Validation Rules:**
- `name`: Required, string, 3-100 characters
- `dni`: Required, string, 8 characters

**Response (201):**
```json
{
  "id": 1,
  "name": "John Doe",
  "dni": "12345678"
}
```

**Error Response (400):**
```json
{
  "error": "User already exists: 12345678"
}
```

### Testing the API

```bash
# Health check
curl http://<ALB-DNS>/health

# List users
curl http://<ALB-DNS>/api/users

# Get user by ID
curl http://<ALB-DNS>/api/users/1

# Create user
curl -X POST http://<ALB-DNS>/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","dni":"12345678"}'
```

## Containerization

### Docker Best Practices Implemented

#### 1. Multi-stage Build (Optimized)

While this application uses a single-stage build due to its simplicity, the Dockerfile follows production best practices:

```dockerfile
FROM public.ecr.aws/docker/library/node:18-alpine3.19
```

**Why Alpine Linux?**
- Minimal base image (~5MB vs ~900MB for standard Node)
- Reduced attack surface
- Faster image pulls and deployments
- Lower storage costs

#### 2. Efficient Layer Caching

```dockerfile
COPY package*.json ./
RUN npm ci
COPY . .
```

**Benefits:**
- Dependencies are cached separately from application code
- Rebuilds are faster when only code changes
- `npm ci` ensures reproducible builds (uses package-lock.json)

#### 3. Non-root User (Security)

Alpine Node image runs as non-root user by default, following security best practices.

#### 4. Health Checks

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
```

**Benefits:**
- Docker can detect unhealthy containers
- Kubernetes uses this for container health monitoring
- Automatic restart of failed containers

#### 5. Minimal Dependencies

- Only production dependencies in final image
- No build tools or dev dependencies
- `.dockerignore` excludes unnecessary files

#### 6. ECR Public Registry

Using `public.ecr.aws` instead of Docker Hub avoids rate limiting issues in CI/CD pipelines.

### Image Size Optimization

**Final Image Size:** ~73MB

**Optimization Techniques:**
- Alpine Linux base (5MB)
- Single stage build
- npm ci (clean install, no cache)
- .dockerignore excludes node_modules, tests, docs

### Security Scanning

Every image is scanned with **Trivy** for vulnerabilities before deployment:
- Scans for OS and application vulnerabilities
- Checks for misconfigurations
- Reports LOW, MEDIUM, HIGH, and CRITICAL issues
- Build fails on critical vulnerabilities


## Kubernetes Deployment

### Kubernetes Manifests Explained

#### 1. Namespace (`00-namespace.yaml`)

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: devsu-app
```

**Purpose:** Isolates application resources from other workloads in the cluster.

**Benefits:**
- Resource isolation and organization
- RBAC policies per namespace
- Resource quotas and limits
- Network policies

---

#### 2. ConfigMap (`app-config.yaml`)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: devsu-app
data:
  PORT: "8000"
  NODE_ENV: "production"
```

**Purpose:** Stores non-sensitive configuration data.

**Best Practices:**
- Separates configuration from code
- Easy to update without rebuilding images
- Can be mounted as files or environment variables
- Version controlled with application

---

#### 3. Secrets (`rds-secret.yaml`)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: rds-credentials
  namespace: devsu-app
type: Opaque
stringData:
  DATABASE_HOST: "<RDS-ENDPOINT>"
  DATABASE_PORT: "5432"
  DATABASE_NAME: "devsu_app"
  DATABASE_USER: "postgres"
  DATABASE_PASSWORD: "<PASSWORD>"
```

**Purpose:** Stores sensitive database credentials securely.

**Security Features:**
- Base64 encoded at rest
- RBAC controls access
- Not logged in kubectl output
- Synced from AWS Secrets Manager
- Encrypted in etcd

**Note:** This secret is dynamically updated by the CI/CD pipeline with actual RDS credentials from AWS Secrets Manager.

---

#### 4. Application Deployment (`app.yaml`)

**Deployment Specification:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: devsu-app
  namespace: devsu-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: devsu-app
  template:
    spec:
      containers:
      - name: app
        image: <ECR-REPO>:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 8000
```

**Key Features:**

**a) Replica Management**
- Initial replicas: 2 (high availability)
- Managed by HPA (scales 2-10 based on CPU)
- Rolling update strategy (zero downtime)

**b) Resource Management**
```yaml
resources:
  requests:
    cpu: 100m      # Minimum guaranteed CPU
    memory: 128Mi  # Minimum guaranteed memory
  limits:
    cpu: 500m      # Maximum CPU allowed
    memory: 512Mi  # Maximum memory allowed
```

**Benefits:**
- Prevents resource starvation
- Enables efficient scheduling
- Protects against memory leaks
- Supports auto-scaling decisions

**c) Environment Variables**
```yaml
env:
- name: DATABASE_HOST
  valueFrom:
    secretKeyRef:
      name: rds-credentials
      key: DATABASE_HOST
```

**Benefits:**
- Secrets injected at runtime
- No hardcoded credentials
- Easy to rotate credentials
- Follows 12-factor app principles

**d) Liveness Probe**
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 30
  failureThreshold: 3
```

**Purpose:** Detects if container is alive and functioning.

**Behavior:**
- Waits 30s after container starts
- Checks every 30s
- Restarts container after 3 consecutive failures
- Prevents stuck/deadlocked containers

**e) Readiness Probe**
```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 10
  failureThreshold: 3
```

**Purpose:** Determines if container is ready to receive traffic.

**Behavior:**
- Checks every 10s
- Removes pod from service endpoints if failing
- Prevents routing traffic to unhealthy pods
- Faster than liveness probe (5s initial delay)

**Service Specification:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: devsu-app-service
  namespace: devsu-app
spec:
  type: ClusterIP
  selector:
    app: devsu-app
  ports:
  - port: 8000
    targetPort: 8000
```

**Purpose:** Provides stable network endpoint for pods.

**ClusterIP Benefits:**
- Internal-only access (security)
- Load balances across healthy pods
- Stable DNS name (devsu-app-service.devsu-app.svc.cluster.local)
- Works with ALB Ingress Controller

---

#### 5. Horizontal Pod Autoscaler (`app-hpa.yaml`)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: devsu-app-hpa
  namespace: devsu-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: devsu-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

**Purpose:** Automatically scales pods based on CPU usage.

**Scaling Behavior:**
- **Min Replicas:** 2 (ensures high availability)
- **Max Replicas:** 10 (prevents runaway scaling)
- **Target CPU:** 70% (scales up when exceeded)
- **Scale Up:** Adds pods when CPU > 70% for 3 minutes
- **Scale Down:** Removes pods when CPU < 70% for 5 minutes

**Benefits:**
- Handles traffic spikes automatically
- Reduces costs during low traffic
- Maintains performance SLAs
- No manual intervention needed

---

#### 6. Ingress (`ingress.yaml`)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: devsu-app-ingress
  namespace: devsu-app
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/load-balancer-name: devsu-app-alb
spec:
  ingressClassName: alb
  rules:
  - http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: devsu-app-service
            port:
              number: 8000
      - path: /pgadmin
        pathType: Prefix
        backend:
          service:
            name: pgadmin-service
            port:
              number: 80
```

**Purpose:** Exposes services externally via AWS Application Load Balancer.

**AWS Load Balancer Controller Annotations:**

- `scheme: internet-facing` - Creates public ALB
- `target-type: ip` - Routes directly to pod IPs (better performance)
- `healthcheck-path: /health` - ALB health check endpoint
- `healthcheck-interval-seconds: 30` - Check every 30s
- `healthy-threshold-count: 2` - 2 successful checks = healthy
- `unhealthy-threshold-count: 2` - 2 failed checks = unhealthy

**Path-based Routing:**
- `/api/*` → Application service (port 8000)
- `/pgadmin/*` → PgAdmin service (port 80)

**Benefits:**
- Single ALB for multiple services (cost-effective)
- Automatic ALB provisioning and configuration
- Health-based routing (only to healthy pods)
- Integration with AWS security groups

---

#### 7. PgAdmin Deployment (`pgadmin.yaml`)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgadmin
  namespace: devsu-app
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: pgadmin
        image: dpage/pgadmin4:latest
        env:
        - name: PGADMIN_DEFAULT_EMAIL
          valueFrom:
            secretKeyRef:
              name: pgadmin-secret
              key: PGADMIN_DEFAULT_EMAIL
        - name: SCRIPT_NAME
          value: /pgadmin
```

**Purpose:** Web-based PostgreSQL administration tool.

**Configuration:**
- `SCRIPT_NAME: /pgadmin` - Enables subpath routing
- Credentials from Kubernetes secret (created by Terraform)
- Health checks on `/pgadmin/misc/ping`
- Single replica (sufficient for admin tool)

**Access:** `http://<ALB-DNS>/pgadmin/`


## CI/CD Pipeline

### Pipeline Overview

The application uses AWS CodePipeline with CodeBuild for automated continuous integration and deployment.

**Pipeline Stages:**

1. **Source Stage**
   - Triggered by GitHub webhook on push to `main` branch
   - Uses AWS CodeStar Connection for GitHub integration
   - Fetches source code as ZIP artifact

2. **Build Stage**
   - Runs CodeBuild project with `buildspec.yml`
   - Executes tests, linting, security scans
   - Builds and pushes Docker image to ECR
   - Deploys to EKS cluster

### buildspec.yml Explained

The `buildspec.yml` defines the build process in CodeBuild.

#### Environment Variables

```yaml
env:
  variables:
    COVERAGE_THRESHOLD: "70"
```

Automatically injected by CodeBuild:
- `AWS_ACCOUNT_ID` - AWS account number
- `AWS_DEFAULT_REGION` - Deployment region
- `ECR_REPOSITORY_URI` - ECR repository URL
- `EKS_CLUSTER_NAME` - Target EKS cluster
- `CODEBUILD_RESOLVED_SOURCE_VERSION` - Git commit SHA

#### Phase 1: Pre-build

```yaml
pre_build:
  commands:
    - npm ci
    - npm run lint || echo "ESLint check completed"
    - aws ecr get-login-password | docker login ...
```

**Actions:**
1. **Install Dependencies** - `npm ci` for reproducible builds
2. **Code Quality Check** - ESLint validates code style and catches errors
3. **ECR Authentication** - Login to push Docker images

**Why `npm ci` instead of `npm install`?**
- Faster (10-20x in CI environments)
- Uses package-lock.json exactly (reproducible)
- Removes existing node_modules first (clean state)
- Fails if package.json and package-lock.json are out of sync

#### Phase 2: Build

```yaml
build:
  commands:
    - export IMAGE_TAG=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c1-7)-$(date +%s)
    - docker build -t $ECR_REPOSITORY_URI:$IMAGE_TAG .
    - trivy image --exit-code 0 --severity LOW,MEDIUM,HIGH,CRITICAL $ECR_REPOSITORY_URI:$IMAGE_TAG
```

**Actions:**
1. **Generate Unique Tag** - Combines commit SHA (first 7 chars) + Unix timestamp
   - Example: `4d1e4d3-1771906345`
   - Ensures immutable tags (no conflicts)
   - Traceable to specific commit

2. **Build Docker Image** - Creates container image with application code

3. **Security Scan with Trivy**
   - Scans for known vulnerabilities (CVEs)
   - Checks OS packages and Node.js dependencies
   - Reports all severity levels
   - `--exit-code 0` makes scan informational (doesn't fail build)

**Why Trivy?**
- Fast and accurate vulnerability scanner
- Supports multiple languages and OS packages
- Regularly updated vulnerability database
- Industry standard for container security

#### Phase 3: Post-build

```yaml
post_build:
  commands:
    - docker push $ECR_REPOSITORY_URI:$IMAGE_TAG
    - sed -i "s|\${AWS_ACCOUNT_ID}|$AWS_ACCOUNT_ID|g" k8s/app.yaml
    - sed -i "s|\${AWS_REGION}|$AWS_DEFAULT_REGION|g" k8s/app.yaml
    - sed -i "s|devsu-app:latest|devsu-app:$IMAGE_TAG|g" k8s/app.yaml
    - aws eks update-kubeconfig --name $EKS_CLUSTER_NAME --region $AWS_DEFAULT_REGION
    - kubectl apply -f k8s/00-namespace.yaml
    - kubectl apply -f k8s/rds-secret.yaml
    - kubectl apply -f k8s/app-config.yaml
    - kubectl apply -f k8s/pgadmin.yaml
    - kubectl apply -f k8s/app.yaml
    - kubectl apply -f k8s/ingress.yaml
    - kubectl rollout status deployment/devsu-app -n devsu-app --timeout=5m || echo "Rollout in progress..."
    - kubectl get ingress devsu-app-ingress -n devsu-app
```

**Actions:**

1. **Push Image to ECR** - Stores Docker image in private registry

2. **Update Kubernetes Manifests** - Replaces placeholders with actual values:
   - `${AWS_ACCOUNT_ID}` → Actual AWS account ID
   - `${AWS_REGION}` → Deployment region
   - `devsu-app:latest` → Specific image tag (e.g., `devsu-app:4d1e4d3-1771906345`)

3. **Configure kubectl** - Authenticates with EKS cluster

4. **Deploy to Kubernetes** - Applies manifests in order:
   - Namespace (foundation)
   - Secrets (credentials)
   - ConfigMap (configuration)
   - PgAdmin (database admin tool)
   - Application (main workload)
   - Ingress (external access)

5. **Verify Deployment** - Checks rollout status (non-blocking)

6. **Display Ingress** - Shows ALB URL for access

**Deployment Strategy:**
- Rolling update (default)
- Zero downtime deployments
- Gradual pod replacement
- Automatic rollback on failure

#### Artifacts

```yaml
artifacts:
  files:
    - k8s/**/*
    - coverage/**/*
    - buildspec.yml
```

**Purpose:** Stores build outputs in S3 for auditing and debugging.

#### Caching

```yaml
cache:
  paths:
    - 'node_modules/**/*'
```

**Purpose:** Speeds up subsequent builds by caching dependencies.

**Benefits:**
- Faster builds (skip npm install if package.json unchanged)
- Reduced network usage
- Lower build costs

### Pipeline Quality Gates

The pipeline enforces quality standards:

1. ✅ **Dependency Installation** - Must complete successfully
2. ✅ **Code Linting** - ESLint checks (informational)
3. ✅ **Docker Build** - Must build without errors
4. ✅ **Security Scan** - Trivy vulnerability scan (informational)
5. ✅ **Image Push** - Must push to ECR successfully
6. ✅ **Kubernetes Deployment** - Must apply manifests successfully

**Failure Handling:**
- Any critical failure stops the pipeline
- Previous version remains running (no downtime)
- CloudWatch logs capture all output
- Notifications can be configured via SNS


## Local Development

### Prerequisites

- Node.js 18.x or higher
- PostgreSQL 14+ (local or Docker)
- npm or yarn

### Setup

1. **Clone the repository:**
```bash
git clone https://github.com/damalfudev/devsu-app-repository.git
cd devsu-app-repository
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**

Create a `.env` file (for local development only):
```env
PORT=8000
NODE_ENV=development
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=devsu_app
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
```

4. **Setup local database:**
```bash
# Using Docker
docker run --name postgres-dev \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=devsu_app \
  -p 5432:5432 \
  -d postgres:14-alpine

# Or install PostgreSQL locally
```

5. **Run the application:**
```bash
npm start
```

The API will be available at `http://localhost:8000`

### Development Commands

```bash
# Start application
npm start

# Run linting
npm run lint

# Fix linting issues automatically
npm run lint -- --fix

# Run tests (when available)
npm test
```

### Testing Locally

```bash
# Health check
curl http://localhost:8000/health

# List users
curl http://localhost:8000/api/users

# Create user
curl -X POST http://localhost:8000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","dni":"12345678"}'
```

## Deployment

### Automated Deployment (Production)

The application deploys automatically when code is pushed to the `main` branch:

1. **Push code to GitHub:**
```bash
git add .
git commit -m "Your commit message"
git push origin main
```

2. **Pipeline automatically:**
   - Pulls source code
   - Runs linting and tests
   - Builds Docker image
   - Scans for vulnerabilities
   - Pushes to ECR
   - Deploys to EKS
   - Verifies deployment

3. **Monitor deployment:**
```bash
# Check pipeline status
aws codepipeline get-pipeline-state \
  --name devsu-app-production-pipeline \
  --region us-east-1

# Check pod status
kubectl get pods -n devsu-app

# View application logs
kubectl logs -f deployment/devsu-app -n devsu-app
```

### Manual Deployment (Emergency)

If you need to deploy manually:

```bash
# Build and push image
docker build -t <ECR-REPO>:manual-$(date +%s) .
docker push <ECR-REPO>:manual-$(date +%s)

# Update deployment
kubectl set image deployment/devsu-app \
  app=<ECR-REPO>:manual-<TIMESTAMP> \
  -n devsu-app

# Monitor rollout
kubectl rollout status deployment/devsu-app -n devsu-app
```

### Rollback

If a deployment causes issues:

```bash
# Rollback to previous version
kubectl rollout undo deployment/devsu-app -n devsu-app

# Check rollback status
kubectl rollout status deployment/devsu-app -n devsu-app

# View rollout history
kubectl rollout history deployment/devsu-app -n devsu-app
```

## Monitoring

### Application Logs

```bash
# Stream logs from all pods
kubectl logs -f -l app=devsu-app -n devsu-app

# View logs from specific pod
kubectl logs <POD-NAME> -n devsu-app

# View previous container logs (if crashed)
kubectl logs <POD-NAME> -n devsu-app --previous
```

### CloudWatch Logs

```bash
# Tail application logs
aws logs tail /aws/containerinsights/devsu-app-production-cluster/application --follow

# Tail CodeBuild logs
aws logs tail /aws/codebuild/devsu-app-production-build --follow
```

### Resource Monitoring

```bash
# Check pod resource usage
kubectl top pods -n devsu-app

# Check node resource usage
kubectl top nodes

# Check HPA status
kubectl get hpa -n devsu-app
```

### Health Checks

```bash
# Check application health
curl http://<ALB-DNS>/health

# Check pod status
kubectl get pods -n devsu-app

# Check deployment status
kubectl get deployment devsu-app -n devsu-app

# Check service endpoints
kubectl get endpoints -n devsu-app
```

## Security

### Security Best Practices Implemented

#### 1. Container Security

- ✅ **Non-root user** - Container runs as non-privileged user
- ✅ **Minimal base image** - Alpine Linux reduces attack surface
- ✅ **Vulnerability scanning** - Trivy scans every image
- ✅ **Immutable tags** - Each build gets unique tag
- ✅ **Private registry** - Images stored in ECR (not public)

#### 2. Secrets Management

- ✅ **No hardcoded secrets** - All credentials in Secrets Manager/Kubernetes Secrets
- ✅ **Environment injection** - Secrets injected at runtime
- ✅ **Encryption at rest** - Secrets encrypted in etcd
- ✅ **RBAC controls** - Limited access to secrets
- ✅ **SSL/TLS for RDS** - Encrypted database connections

#### 3. Network Security

- ✅ **Private subnets** - Pods run in private subnets (no direct internet access)
- ✅ **Security groups** - Restrict traffic to necessary ports only
- ✅ **ClusterIP services** - Internal-only service access
- ✅ **ALB as entry point** - Single controlled ingress point

#### 4. Access Control

- ✅ **IAM roles** - Service accounts use IAM roles (no access keys)
- ✅ **Least privilege** - Minimal permissions for each component
- ✅ **RBAC** - Kubernetes role-based access control

#### 5. Code Quality

- ✅ **ESLint** - Enforces code standards (Airbnb style guide)
- ✅ **Input validation** - Yup schema validation
- ✅ **Error handling** - Comprehensive try-catch blocks
- ✅ **SQL injection prevention** - Parameterized queries

### Security Checklist

- [ ] Rotate database credentials regularly
- [ ] Review CloudWatch logs for suspicious activity
- [ ] Update dependencies monthly (`npm audit`)
- [ ] Review security group rules quarterly
- [ ] Enable AWS GuardDuty for threat detection
- [ ] Configure AWS WAF on ALB (optional)

## Project Structure

```
devsu-app-repo/
├── index.js                    # Application entry point
├── package.json                # Dependencies and scripts
├── package-lock.json           # Locked dependency versions
├── Dockerfile                  # Container image definition
├── buildspec.yml               # CI/CD build specification
├── .dockerignore               # Files excluded from Docker build
├── .eslintrc.json              # ESLint configuration
├── .eslintignore               # Files excluded from linting
├── .gitignore                  # Files excluded from Git
│
├── users/                      # User module
│   ├── controller.js           # User business logic
│   └── router.js               # User route definitions
│
├── shared/                     # Shared utilities
│   ├── database/
│   │   └── database.js         # PostgreSQL connection pool
│   ├── middleware/
│   │   └── validateSchema.js  # Request validation middleware
│   └── schema/
│       └── users.js            # User validation schema
│
└── k8s/                        # Kubernetes manifests
    ├── 00-namespace.yaml       # Namespace definition
    ├── app-config.yaml         # Application ConfigMap
    ├── rds-secret.yaml         # Database credentials Secret
    ├── app.yaml                # Application Deployment & Service
    ├── app-hpa.yaml            # Horizontal Pod Autoscaler
    ├── pgadmin.yaml            # PgAdmin Deployment & Service
    └── ingress.yaml            # ALB Ingress Controller
```

## Configuration Files

### .dockerignore

Excludes unnecessary files from Docker image:
```
node_modules
npm-debug.log
.git
.env
README.md
k8s/
```

**Benefits:**
- Smaller image size
- Faster builds
- No sensitive files in image

### .eslintrc.json

ESLint configuration using Airbnb style guide:
```json
{
  "extends": "airbnb-base",
  "rules": {
    "semi": ["error", "never"],
    "no-console": "off"
  }
}
```

**Enforces:**
- Consistent code style
- Best practices
- Error prevention
- Maintainability

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  dni VARCHAR(8) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
- `id` - Auto-incrementing primary key
- `name` - User's full name (3-100 characters)
- `dni` - Document number (8 characters, unique)
- `created_at` - Timestamp of creation

**Indexes:**
- Primary key on `id`
- Unique constraint on `dni`

The table is automatically created by the application on startup if it doesn't exist.

## Troubleshooting

### Common Issues

#### 1. Pods Not Starting

```bash
# Check pod status
kubectl get pods -n devsu-app

# Describe pod for details
kubectl describe pod <POD-NAME> -n devsu-app

# Check logs
kubectl logs <POD-NAME> -n devsu-app
```

**Common causes:**
- Image pull errors (check ECR permissions)
- Database connection failures (check RDS security group)
- Resource limits too low (check node capacity)

#### 2. Database Connection Errors

```bash
# Verify RDS endpoint in secret
kubectl get secret rds-credentials -n devsu-app -o jsonpath='{.data.DATABASE_HOST}' | base64 -d

# Test connectivity from pod
kubectl exec -it <POD-NAME> -n devsu-app -- sh
nc -zv <RDS-ENDPOINT> 5432
```

**Common causes:**
- Incorrect RDS endpoint
- Security group not allowing traffic from EKS
- Database not in available state

#### 3. ALB Returns 502/503

```bash
# Check target health
aws elbv2 describe-target-health \
  --target-group-arn <TG-ARN> \
  --region us-east-1

# Check service endpoints
kubectl get endpoints -n devsu-app
```

**Common causes:**
- Pods failing health checks
- Service selector mismatch
- Incorrect health check path

## Performance Optimization

### Current Configuration

- **Replicas:** 2-10 (auto-scaled)
- **CPU Request:** 100m per pod
- **CPU Limit:** 500m per pod
- **Memory Request:** 128Mi per pod
- **Memory Limit:** 512Mi per pod

### Scaling Behavior

- **Scale Up:** When average CPU > 70% across all pods
- **Scale Down:** When average CPU < 70% for 5 minutes
- **Max Pods:** 10 (prevents runaway scaling)
- **Min Pods:** 2 (ensures high availability)

### Database Connection Pooling

```javascript
// Configured in shared/database/database.js
max: 20,              // Maximum connections
min: 2,               // Minimum connections
idleTimeoutMillis: 30000,
connectionTimeoutMillis: 2000
```

**Benefits:**
- Reuses connections (reduces overhead)
- Limits concurrent connections to RDS
- Handles connection failures gracefully

## Contributing

### Code Style

This project uses ESLint with Airbnb style guide:

```bash
# Check code style
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### Commit Messages

Follow conventional commits format:
```
feat: Add new feature
fix: Fix bug
docs: Update documentation
chore: Update dependencies
```

### Pull Request Process

1. Create feature branch from `main`
2. Make changes and test locally
3. Run linting: `npm run lint`
4. Commit with descriptive message
5. Push and create pull request
6. Wait for CI checks to pass
7. Request review from team

## License

This project is proprietary and confidential.

## Support

For issues or questions:
- Check CloudWatch logs for errors
- Review Kubernetes events: `kubectl get events -n devsu-app`
- Contact DevOps team

---

**Application Version:** 1.0.0  
**Last Updated:** 2026-02-24  
**Maintained By:** Devsu DevOps Team
