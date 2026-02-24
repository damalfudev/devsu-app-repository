# Deployment Guide

## Prerequisites
- AWS infrastructure deployed via Terraform
- EKS cluster: `devsu-app-production-cluster`
- RDS database: `devsu-app-production-db.cuvi8sikyhf3.us-east-1.rds.amazonaws.com`
- ECR repository: `342360442457.dkr.ecr.us-east-1.amazonaws.com/devsu-app`

## Kubernetes Resources Included

### Application
- `00-namespace.yaml` - Creates `devsu-app` namespace
- `app-config.yaml` - ConfigMap with PORT and NODE_ENV
- `rds-secret.yaml` - RDS credentials (pre-configured with actual values)
- `app.yaml` - Deployment (2 replicas) + Service
- `app-hpa.yaml` - Auto-scaling (2-10 pods based on CPU 70%)

### Database Management
- `pgadmin.yaml` - PgAdmin deployment + service

### Ingress
- `ingress.yaml` - AWS ALB Ingress Controller configuration
  - `/` → devsu-app-service (your API)
  - `/pgadmin` → pgadmin-service (database UI)

## CI/CD Pipeline

The `buildspec.yml` automates:
1. Install dependencies
2. Run tests (requires 70% coverage)
3. Run ESLint
4. Build Docker image
5. Scan with Trivy (fails on HIGH/CRITICAL vulnerabilities)
6. Push to ECR
7. Deploy to EKS

## Access After Deployment

Once the pipeline completes:
- **API**: `http://<ALB-DNS>/api/users`
- **Health**: `http://<ALB-DNS>/health`
- **PgAdmin**: `http://<ALB-DNS>/pgadmin`

Get ALB DNS:
```bash
kubectl get ingress -n devsu-app
```
