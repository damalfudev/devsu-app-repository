# Devsu Demo DevOps - Node.js Application

Node.js REST API with PostgreSQL database, deployed on AWS EKS with CI/CD automation.

## Features

- Express.js REST API for user management
- PostgreSQL database (AWS RDS)
- AWS Secrets Manager integration
- Docker containerization
- Kubernetes deployment with HPA
- AWS ALB Ingress Controller
- PgAdmin for database management
- Automated CI/CD with AWS CodePipeline

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user

## Local Development

```bash
npm install
npm start
```

## Deployment

The application is automatically deployed via AWS CodePipeline when changes are pushed to the `main` branch.

### Pipeline Stages:
1. **Source** - Pull from GitHub
2. **Build** - Run tests, lint, build Docker image, scan vulnerabilities, push to ECR, deploy to EKS

### Kubernetes Resources:
- `00-namespace.yaml` - Namespace definition
- `app-config.yaml` - ConfigMap for app configuration
- `rds-secret.yaml` - RDS database credentials
- `app.yaml` - Application deployment and service
- `app-hpa.yaml` - Horizontal Pod Autoscaler (2-10 replicas)
- `ingress.yaml` - ALB Ingress for external access
- `pgadmin.yaml` - PgAdmin deployment for database management

## Infrastructure

Deployed using Terraform:
- VPC with public/private subnets across 3 AZs
- EKS cluster with managed node group
- RDS PostgreSQL database
- ECR repository
- CodePipeline + CodeBuild
- AWS Load Balancer Controller
