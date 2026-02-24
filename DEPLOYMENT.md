# Deployment Guide - Devsu Application

## Quick Access

**Application URL:** `http://devsu-app-alb-607509135.us-east-1.elb.amazonaws.com`

**Endpoints:**
- **API:** `http://devsu-app-alb-607509135.us-east-1.elb.amazonaws.com/api/users`
- **Health:** `http://devsu-app-alb-607509135.us-east-1.elb.amazonaws.com/health`
- **PgAdmin:** `http://devsu-app-alb-607509135.us-east-1.elb.amazonaws.com/pgadmin/`

## Infrastructure Details

**AWS Resources:**
- **EKS Cluster:** `devsu-app-production-cluster`
- **RDS Instance:** `devsu-app-production-db.cuvi8sikyhf3.us-east-1.rds.amazonaws.com`
- **ECR Repository:** `342360442457.dkr.ecr.us-east-1.amazonaws.com/devsu-app`
- **CodePipeline:** `devsu-app-production-pipeline`
- **Region:** `us-east-1`

## Automated Deployment Process

All deployments are fully automated via AWS CodePipeline:

1. **Developer pushes code** to `main` branch on GitHub
2. **GitHub webhook** triggers AWS CodePipeline
3. **CodeBuild executes** buildspec.yml:
   - Installs dependencies
   - Runs ESLint code quality checks
   - Builds Docker image with unique tag
   - Scans image with Trivy for vulnerabilities
   - Pushes image to Amazon ECR
   - Updates Kubernetes manifests
   - Deploys to EKS cluster
4. **Rolling update** deploys new version with zero downtime
5. **Health checks** verify deployment success

**Deployment Time:** ~10 minutes from commit to production

## Monitoring Deployment

### Check Pipeline Status

```bash
# View pipeline state
aws codepipeline get-pipeline-state \
  --name devsu-app-production-pipeline \
  --region us-east-1

# View recent executions
aws codepipeline list-pipeline-executions \
  --pipeline-name devsu-app-production-pipeline \
  --region us-east-1 \
  --max-items 5
```

### Check Application Status

```bash
# Configure kubectl
aws eks update-kubeconfig --name devsu-app-production-cluster --region us-east-1

# Check pods
kubectl get pods -n devsu-app

# Check deployment
kubectl get deployment devsu-app -n devsu-app

# View application logs
kubectl logs -f deployment/devsu-app -n devsu-app
```

### Check Build Logs

```bash
# Tail CodeBuild logs
aws logs tail /aws/codebuild/devsu-app-production-build --follow --region us-east-1
```

## Current Deployment Status

- ✅ **Pipeline:** Operational and automated
- ✅ **Application:** 2 pods running (auto-scales 2-10)
- ✅ **Database:** RDS PostgreSQL Multi-AZ (high availability)
- ✅ **Load Balancer:** ALB with health checks
- ✅ **Auto-scaling:** HPA configured based on CPU (70% threshold)
- ✅ **Monitoring:** CloudWatch Logs and Container Insights enabled

## Manual Operations

### Rollback Deployment

If a deployment causes issues:

```bash
# Rollback to previous version
kubectl rollout undo deployment/devsu-app -n devsu-app

# Check rollback status
kubectl rollout status deployment/devsu-app -n devsu-app

# View deployment history
kubectl rollout history deployment/devsu-app -n devsu-app
```

### Scale Application Manually

```bash
# Scale to specific number of replicas
kubectl scale deployment devsu-app --replicas=5 -n devsu-app

# Note: HPA will override manual scaling based on CPU usage
```

### Restart Application

```bash
# Restart all pods (rolling restart)
kubectl rollout restart deployment/devsu-app -n devsu-app
```

### View Deployment Details

```bash
# Get deployment info
kubectl describe deployment devsu-app -n devsu-app

# Get service info
kubectl describe service devsu-app-service -n devsu-app

# Get ingress info
kubectl describe ingress devsu-app-ingress -n devsu-app
```

## Accessing PgAdmin

**URL:** `http://devsu-app-alb-607509135.us-east-1.elb.amazonaws.com/pgadmin/`

**Credentials:** Stored in Kubernetes secret (created by Terraform from AWS Secrets Manager)

```bash
# Get PgAdmin email
kubectl get secret pgadmin-secret -n devsu-app -o jsonpath='{.data.PGADMIN_DEFAULT_EMAIL}' | base64 -d

# Get PgAdmin password
kubectl get secret pgadmin-secret -n devsu-app -o jsonpath='{.data.PGADMIN_DEFAULT_PASSWORD}' | base64 -d
```

**Connecting to RDS from PgAdmin:**
1. Login to PgAdmin
2. Add New Server
3. Connection details:
   - Host: `devsu-app-production-db.cuvi8sikyhf3.us-east-1.rds.amazonaws.com`
   - Port: `5432`
   - Database: `devsu_app`
   - Username: `postgres`
   - Password: (from rds-credentials secret)

## Emergency Procedures

### Application Down

1. Check pod status: `kubectl get pods -n devsu-app`
2. Check logs: `kubectl logs -f deployment/devsu-app -n devsu-app`
3. Check events: `kubectl get events -n devsu-app --sort-by='.lastTimestamp'`
4. If needed, rollback: `kubectl rollout undo deployment/devsu-app -n devsu-app`

### Database Issues

1. Check RDS status in AWS Console
2. Verify security groups allow EKS → RDS traffic
3. Check connection from pod: `kubectl exec -it <POD> -n devsu-app -- nc -zv <RDS-ENDPOINT> 5432`

### Pipeline Failures

1. Check CodeBuild logs: `aws logs tail /aws/codebuild/devsu-app-production-build --follow`
2. Review failed stage in CodePipeline console
3. Fix issue and push new commit to trigger pipeline

---

**Last Updated:** 2026-02-24  
**Environment:** Production  
**Maintained By:** Devsu DevOps Team
