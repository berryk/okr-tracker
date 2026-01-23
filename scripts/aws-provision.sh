#!/bin/bash
# AWS Provisioning Script for OKR Tracker
# This script creates all AWS resources needed to run OKR Tracker
#
# Prerequisites:
#   - AWS CLI installed and configured with appropriate permissions
#   - jq installed (for JSON parsing)
#
# Usage:
#   ./aws-provision.sh [options]
#
# Options:
#   --region REGION       AWS region (default: us-east-1)
#   --instance-type TYPE  EC2 instance type (default: t3.medium)
#   --key-name NAME       SSH key pair name (required)
#   --domain DOMAIN       Domain name for the app (optional)
#   --dry-run             Show what would be created without creating

set -e

# Default values
REGION="us-east-1"
INSTANCE_TYPE="t3.medium"
KEY_NAME=""
DOMAIN=""
DRY_RUN=false
STACK_NAME="okr-tracker"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --region)
      REGION="$2"
      shift 2
      ;;
    --instance-type)
      INSTANCE_TYPE="$2"
      shift 2
      ;;
    --key-name)
      KEY_NAME="$2"
      shift 2
      ;;
    --domain)
      DOMAIN="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --region REGION       AWS region (default: us-east-1)"
      echo "  --instance-type TYPE  EC2 instance type (default: t3.medium)"
      echo "  --key-name NAME       SSH key pair name (required)"
      echo "  --domain DOMAIN       Domain name for the app (optional)"
      echo "  --dry-run             Show what would be created"
      exit 0
      ;;
    *)
      log_error "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate required parameters
if [ -z "$KEY_NAME" ]; then
  log_error "SSH key pair name is required. Use --key-name"
  echo ""
  echo "Available key pairs in $REGION:"
  aws ec2 describe-key-pairs --region $REGION --query 'KeyPairs[].KeyName' --output table
  exit 1
fi

# Check prerequisites
command -v aws >/dev/null 2>&1 || { log_error "AWS CLI is required but not installed."; exit 1; }
command -v jq >/dev/null 2>&1 || { log_error "jq is required but not installed."; exit 1; }

log_info "Starting OKR Tracker AWS provisioning..."
log_info "Region: $REGION"
log_info "Instance Type: $INSTANCE_TYPE"
log_info "Key Name: $KEY_NAME"
[ -n "$DOMAIN" ] && log_info "Domain: $DOMAIN"

if [ "$DRY_RUN" = true ]; then
  log_warn "DRY RUN MODE - No resources will be created"
fi

# Get latest Ubuntu 24.04 AMI
log_info "Finding latest Ubuntu 24.04 AMI..."
AMI_ID=$(aws ec2 describe-images \
  --region $REGION \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*" \
            "Name=state,Values=available" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text)

if [ -z "$AMI_ID" ] || [ "$AMI_ID" = "None" ]; then
  log_error "Could not find Ubuntu 24.04 AMI"
  exit 1
fi
log_info "Using AMI: $AMI_ID"

# Get default VPC
log_info "Finding default VPC..."
VPC_ID=$(aws ec2 describe-vpcs \
  --region $REGION \
  --filters "Name=is-default,Values=true" \
  --query 'Vpcs[0].VpcId' \
  --output text)

if [ -z "$VPC_ID" ] || [ "$VPC_ID" = "None" ]; then
  log_error "No default VPC found. Please create one or modify script to use existing VPC."
  exit 1
fi
log_info "Using VPC: $VPC_ID"

if [ "$DRY_RUN" = true ]; then
  log_info "Would create the following resources:"
  echo "  - IAM Role: ${STACK_NAME}-role"
  echo "  - IAM Instance Profile: ${STACK_NAME}-profile"
  echo "  - Security Group: ${STACK_NAME}-sg"
  echo "  - EC2 Instance: ${STACK_NAME} ($INSTANCE_TYPE)"
  echo "  - Elastic IP: ${STACK_NAME}-eip"
  exit 0
fi

# Create IAM Role for Bedrock
log_info "Creating IAM role for Bedrock access..."

# Trust policy
TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
)

# Bedrock policy
BEDROCK_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:ListFoundationModels"
      ],
      "Resource": "*"
    }
  ]
}
EOF
)

# Create role (ignore if exists)
aws iam create-role \
  --role-name "${STACK_NAME}-role" \
  --assume-role-policy-document "$TRUST_POLICY" \
  --description "IAM role for OKR Tracker EC2 instance" \
  2>/dev/null || log_warn "Role already exists, skipping..."

# Attach Bedrock policy
aws iam put-role-policy \
  --role-name "${STACK_NAME}-role" \
  --policy-name "${STACK_NAME}-bedrock-policy" \
  --policy-document "$BEDROCK_POLICY"

# Create instance profile
aws iam create-instance-profile \
  --instance-profile-name "${STACK_NAME}-profile" \
  2>/dev/null || log_warn "Instance profile already exists, skipping..."

# Add role to instance profile (ignore if already added)
aws iam add-role-to-instance-profile \
  --instance-profile-name "${STACK_NAME}-profile" \
  --role-name "${STACK_NAME}-role" \
  2>/dev/null || true

# Wait for instance profile to be ready
log_info "Waiting for instance profile to propagate..."
sleep 10

# Create Security Group
log_info "Creating security group..."
SG_ID=$(aws ec2 create-security-group \
  --region $REGION \
  --group-name "${STACK_NAME}-sg" \
  --description "Security group for OKR Tracker" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text 2>/dev/null) || {
    SG_ID=$(aws ec2 describe-security-groups \
      --region $REGION \
      --filters "Name=group-name,Values=${STACK_NAME}-sg" \
      --query 'SecurityGroups[0].GroupId' \
      --output text)
    log_warn "Security group already exists: $SG_ID"
  }

# Add security group rules
log_info "Configuring security group rules..."
aws ec2 authorize-security-group-ingress --region $REGION --group-id $SG_ID \
  --protocol tcp --port 22 --cidr 0.0.0.0/0 2>/dev/null || true
aws ec2 authorize-security-group-ingress --region $REGION --group-id $SG_ID \
  --protocol tcp --port 80 --cidr 0.0.0.0/0 2>/dev/null || true
aws ec2 authorize-security-group-ingress --region $REGION --group-id $SG_ID \
  --protocol tcp --port 443 --cidr 0.0.0.0/0 2>/dev/null || true

# User data script
USER_DATA=$(cat <<'USERDATA'
#!/bin/bash
set -e
exec > >(tee /var/log/user-data.log) 2>&1

echo "Starting OKR Tracker setup..."

# Update system
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu

# Install Docker Compose
apt-get install -y docker-compose-plugin

# Install tools
apt-get install -y git curl wget htop jq

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Install AWS CLI
curl -sL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip -q awscliv2.zip
./aws/install
rm -rf aws awscliv2.zip

# Create app directory
mkdir -p /opt/okr-tracker
chown ubuntu:ubuntu /opt/okr-tracker

# Clone repository
su - ubuntu -c "git clone https://github.com/berryk/okr-tracker.git /opt/okr-tracker"

# Create .env file
cd /opt/okr-tracker
JWT_SECRET=$(openssl rand -hex 32)
INSTANCE_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo "localhost")

cat > .env <<EOF
# Generated by aws-provision.sh
JWT_SECRET=$JWT_SECRET
CORS_ORIGIN=http://$INSTANCE_IP
VITE_API_URL=http://$INSTANCE_IP
LLM_PROVIDER=bedrock
AWS_REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
DB_PASSWORD=okr_password
EOF

chown ubuntu:ubuntu .env

# Start the application
su - ubuntu -c "cd /opt/okr-tracker && docker compose -f docker-compose.aws.yml up -d"

# Wait for services to start
sleep 30

# Initialize database
su - ubuntu -c "cd /opt/okr-tracker && docker compose -f docker-compose.aws.yml exec -T backend npx prisma db push"
su - ubuntu -c "cd /opt/okr-tracker && docker compose -f docker-compose.aws.yml exec -T backend npx prisma db seed"

echo "OKR Tracker setup complete!"
USERDATA
)

# Launch EC2 instance
log_info "Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
  --region $REGION \
  --image-id $AMI_ID \
  --instance-type $INSTANCE_TYPE \
  --key-name $KEY_NAME \
  --security-group-ids $SG_ID \
  --iam-instance-profile Name="${STACK_NAME}-profile" \
  --user-data "$USER_DATA" \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${STACK_NAME}}]" \
  --query 'Instances[0].InstanceId' \
  --output text)

log_info "Instance launched: $INSTANCE_ID"

# Wait for instance to be running
log_info "Waiting for instance to be running..."
aws ec2 wait instance-running --region $REGION --instance-ids $INSTANCE_ID

# Allocate and associate Elastic IP
log_info "Allocating Elastic IP..."
ALLOCATION_ID=$(aws ec2 allocate-address \
  --region $REGION \
  --domain vpc \
  --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=${STACK_NAME}-eip}]" \
  --query 'AllocationId' \
  --output text)

PUBLIC_IP=$(aws ec2 describe-addresses \
  --region $REGION \
  --allocation-ids $ALLOCATION_ID \
  --query 'Addresses[0].PublicIp' \
  --output text)

log_info "Associating Elastic IP: $PUBLIC_IP"
aws ec2 associate-address \
  --region $REGION \
  --instance-id $INSTANCE_ID \
  --allocation-id $ALLOCATION_ID

# Output summary
echo ""
echo "=========================================="
echo -e "${GREEN}OKR Tracker AWS Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "Resources created:"
echo "  - IAM Role: ${STACK_NAME}-role"
echo "  - Security Group: $SG_ID"
echo "  - EC2 Instance: $INSTANCE_ID"
echo "  - Elastic IP: $PUBLIC_IP"
echo ""
echo "Connection details:"
echo "  SSH: ssh -i ~/.ssh/${KEY_NAME}.pem ubuntu@${PUBLIC_IP}"
echo "  Web: http://${PUBLIC_IP}"
echo ""
echo "The instance is initializing. This takes 5-10 minutes."
echo "Check progress with:"
echo "  ssh -i ~/.ssh/${KEY_NAME}.pem ubuntu@${PUBLIC_IP} 'tail -f /var/log/user-data.log'"
echo ""
echo "Demo login credentials:"
echo "  Email: ceo@demo.com"
echo "  Password: demo123"
echo ""
if [ -n "$DOMAIN" ]; then
  echo "To use your domain ($DOMAIN):"
  echo "  1. Point DNS A record to: $PUBLIC_IP"
  echo "  2. SSH in and update /opt/okr-tracker/.env:"
  echo "     CORS_ORIGIN=https://$DOMAIN"
  echo "     VITE_API_URL=https://$DOMAIN"
  echo "  3. Set up SSL (see docs/AWS_DEPLOYMENT.md)"
  echo ""
fi
echo "To delete all resources:"
echo "  ./aws-cleanup.sh --region $REGION"
echo ""
