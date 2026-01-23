#!/bin/bash
# AWS Setup Script for OKR Tracker
# Run this on a fresh Ubuntu EC2 instance

set -e

echo "=========================================="
echo "OKR Tracker AWS Setup Script"
echo "=========================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then
  echo "Please run as a regular user, not root"
  exit 1
fi

# Update system
echo "Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker $USER
  echo "Docker installed. You may need to log out and back in for group changes."
fi

# Install Docker Compose plugin
if ! docker compose version &> /dev/null; then
  echo "Installing Docker Compose..."
  sudo apt-get install -y docker-compose-plugin
fi

# Install useful tools
echo "Installing utilities..."
sudo apt-get install -y git curl wget htop jq

# Install Node.js 20 (for Claude Code)
if ! command -v node &> /dev/null; then
  echo "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# Install Claude Code CLI
if ! command -v claude &> /dev/null; then
  echo "Installing Claude Code CLI..."
  sudo npm install -g @anthropic-ai/claude-code
fi

# Install AWS CLI
if ! command -v aws &> /dev/null; then
  echo "Installing AWS CLI..."
  curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
  unzip -q awscliv2.zip
  sudo ./aws/install
  rm -rf aws awscliv2.zip
fi

# Create app directory
APP_DIR="/opt/okr-tracker"
if [ ! -d "$APP_DIR" ]; then
  echo "Creating application directory..."
  sudo mkdir -p $APP_DIR
  sudo chown $USER:$USER $APP_DIR
fi

# Clone repository if not already present
if [ ! -d "$APP_DIR/.git" ]; then
  echo "Cloning OKR Tracker repository..."
  git clone https://github.com/berryk/okr-tracker.git $APP_DIR
fi

cd $APP_DIR

# Create .env file if not exists
if [ ! -f ".env" ]; then
  echo "Creating environment file from template..."
  cp .env.aws.example .env

  # Generate JWT secret
  JWT_SECRET=$(openssl rand -hex 32)
  sed -i "s/JWT_SECRET=your-secret-here/JWT_SECRET=$JWT_SECRET/" .env

  echo ""
  echo "=========================================="
  echo "IMPORTANT: Edit the .env file to configure:"
  echo "  - CORS_ORIGIN (your domain)"
  echo "  - VITE_API_URL (your domain)"
  echo "  - AWS_REGION (if not us-east-1)"
  echo "  - BEDROCK_MODEL_ID (if different)"
  echo "=========================================="
  echo ""
fi

# Test Bedrock access
echo "Testing AWS Bedrock access..."
if aws bedrock list-foundation-models --region ${AWS_REGION:-us-east-1} --query 'modelSummaries[?contains(modelId, `anthropic`)].modelId' --output text &> /dev/null; then
  echo "✓ Bedrock access confirmed"
else
  echo "⚠ Warning: Could not access Bedrock. Ensure:"
  echo "  1. EC2 instance has IAM role with Bedrock permissions"
  echo "  2. Bedrock model access is enabled in AWS Console"
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Edit .env file: nano $APP_DIR/.env"
echo "  2. Start the application:"
echo "     cd $APP_DIR"
echo "     docker compose -f docker-compose.aws.yml up -d"
echo "  3. Seed the database:"
echo "     docker compose -f docker-compose.aws.yml exec backend npx prisma db push"
echo "     docker compose -f docker-compose.aws.yml exec backend npx prisma db seed"
echo ""
echo "To use Claude Code:"
echo "  cd $APP_DIR && claude"
echo ""
