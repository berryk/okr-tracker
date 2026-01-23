# AWS Deployment Guide

This guide walks you through deploying OKR Tracker on a single EC2 instance with Docker, using AWS Bedrock for Claude models.

## Quick Start (Automated)

### Option 1: Shell Script (Fastest)

```bash
# Clone the repo locally first
git clone https://github.com/berryk/okr-tracker.git
cd okr-tracker

# Run the provisioning script
./scripts/aws-provision.sh --key-name your-ssh-key --region us-east-1

# That's it! The script will output the URL when done.
```

### Option 2: CloudFormation

```bash
aws cloudformation create-stack \
  --stack-name okr-tracker \
  --template-body file://cloudformation/okr-tracker.yaml \
  --parameters ParameterKey=KeyName,ParameterValue=your-ssh-key \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1

# Watch progress
aws cloudformation wait stack-create-complete --stack-name okr-tracker

# Get outputs
aws cloudformation describe-stacks --stack-name okr-tracker \
  --query 'Stacks[0].Outputs' --output table
```

### Cleanup

```bash
# Shell script method
./scripts/aws-cleanup.sh --region us-east-1

# CloudFormation method
aws cloudformation delete-stack --stack-name okr-tracker
```

---

## Manual Deployment

If you prefer to set things up manually, follow the steps below.

## Prerequisites

- AWS Account with Bedrock access enabled
- Domain name (optional, for HTTPS)
- SSH key pair for EC2

## Step 1: Enable Bedrock Model Access

1. Go to AWS Console → Amazon Bedrock → Model access
2. Request access to Claude models:
   - `anthropic.claude-3-5-sonnet-20241022-v2:0` (recommended)
   - `anthropic.claude-3-haiku-20240307-v1:0` (faster, cheaper)
3. Wait for access approval (usually instant for Claude)

## Step 2: Create IAM Role for EC2

Create an IAM role with Bedrock permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-*"
      ]
    }
  ]
}
```

Name it `OKRTrackerBedrockRole` and attach it to your EC2 instance.

## Step 3: Launch EC2 Instance

### Instance Configuration

| Setting | Recommended Value |
|---------|-------------------|
| AMI | Ubuntu 24.04 LTS |
| Instance Type | t3.medium (2 vCPU, 4 GB) or t3.large (2 vCPU, 8 GB) |
| Storage | 30 GB gp3 |
| IAM Role | OKRTrackerBedrockRole |

### Security Group Rules

| Type | Port | Source | Description |
|------|------|--------|-------------|
| SSH | 22 | Your IP | SSH access |
| HTTP | 80 | 0.0.0.0/0 | Web traffic |
| HTTPS | 443 | 0.0.0.0/0 | Secure web traffic |

### User Data Script (paste in Advanced Details)

```bash
#!/bin/bash
set -e

# Update system
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu

# Install Docker Compose
apt-get install -y docker-compose-plugin

# Install useful tools
apt-get install -y git curl wget htop

# Install Node.js 20 (for Claude Code)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Create app directory
mkdir -p /opt/okr-tracker
chown ubuntu:ubuntu /opt/okr-tracker

echo "Setup complete! Reboot to apply docker group changes."
```

## Step 4: Connect and Deploy

### SSH into your instance

```bash
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

### Clone and configure the project

```bash
cd /opt/okr-tracker
git clone https://github.com/berryk/okr-tracker.git .

# Create environment file
cat > .env << 'EOF'
# Bedrock Configuration
LLM_PROVIDER=bedrock
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0

# Database (internal Docker network)
DATABASE_URL=postgresql://okr:okr_password@db:5432/okr_tracker
REDIS_URL=redis://redis:6379

# App Settings
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com
JWT_SECRET=$(openssl rand -hex 32)
EOF
```

### Update docker-compose for AWS

```bash
# Edit docker-compose.yml to use the AWS-specific config
# Or use the aws-docker-compose.yml included in the repo
```

### Start the application

```bash
docker compose up -d
```

### Verify it's running

```bash
docker compose ps
curl http://localhost/health
```

## Step 5: Configure Domain & HTTPS (Optional)

### Option A: Use Cloudflare Tunnel (Recommended)

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Authenticate and create tunnel
cloudflared tunnel login
cloudflared tunnel create okr-tracker
cloudflared tunnel route dns okr-tracker okr.yourdomain.com

# Create config
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: <TUNNEL-ID>
credentials-file: /home/ubuntu/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: okr.yourdomain.com
    service: http://localhost:80
  - service: http_status:404
EOF

# Run as service
cloudflared service install
systemctl start cloudflared
```

### Option B: Use Nginx + Let's Encrypt

```bash
# Install certbot
apt-get install -y certbot python3-certbot-nginx nginx

# Get certificate
certbot --nginx -d okr.yourdomain.com

# Certbot will auto-configure nginx
```

### Option C: Use AWS ALB + ACM

1. Create Application Load Balancer
2. Request ACM certificate for your domain
3. Create target group pointing to EC2:80
4. Configure Route53 or external DNS

## Step 6: Set Up Claude Code with Bedrock

Claude Code can use Bedrock for its AI backend.

### Configure AWS credentials

The EC2 instance role provides credentials automatically. For Claude Code:

```bash
# Claude Code will use the instance role automatically
# Just set the provider to bedrock
export CLAUDE_CODE_USE_BEDROCK=1
export AWS_REGION=us-east-1
```

### Or use a profile

```bash
# If you need explicit credentials
aws configure --profile bedrock
export AWS_PROFILE=bedrock
```

### Start Claude Code

```bash
cd /opt/okr-tracker
claude
```

## Step 7: Database Seeding

```bash
# Run the seed script
docker compose exec backend npx prisma db seed
```

## Maintenance

### View logs

```bash
docker compose logs -f
docker compose logs backend --tail 100
```

### Update the application

```bash
cd /opt/okr-tracker
git pull
docker compose up -d --build
```

### Backup database

```bash
docker compose exec db pg_dump -U okr okr_tracker > backup-$(date +%Y%m%d).sql
```

### Restore database

```bash
cat backup-20260122.sql | docker compose exec -T db psql -U okr okr_tracker
```

## Cost Estimate

| Resource | Monthly Cost (approx) |
|----------|----------------------|
| t3.medium EC2 | $30-35 |
| 30 GB gp3 EBS | $2.50 |
| Bedrock (Claude Sonnet) | $3/1M input, $15/1M output tokens |
| **Total** | ~$35-50/month + usage |

## Troubleshooting

### Bedrock access denied

```bash
# Check IAM role is attached
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/

# Verify Bedrock permissions
aws bedrock list-foundation-models --region us-east-1
```

### Docker permission denied

```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Database connection issues

```bash
# Check database is running
docker compose ps db
docker compose logs db

# Connect directly
docker compose exec db psql -U okr okr_tracker
```
