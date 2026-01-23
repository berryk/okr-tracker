# Installing OKR Tracker on AWS via Console

This guide provides step-by-step instructions for deploying OKR Tracker on AWS using the AWS Console (no CLI required).

## Prerequisites

- AWS Account
- SSH key pair (create one in EC2 → Key Pairs if you don't have one)
- Bedrock model access enabled (see Step 1)

## Estimated Cost

| Resource | Monthly Cost |
|----------|--------------|
| t3.medium EC2 | ~$30 |
| 30 GB storage | ~$2.50 |
| Elastic IP | Free (when attached) |
| Bedrock (Claude) | ~$3/1M input tokens, $15/1M output |
| **Total** | ~$35/month + AI usage |

---

## Step 1: Enable Bedrock Model Access

Before deploying, you need to enable access to Claude models in Bedrock.

1. Go to **Amazon Bedrock** in AWS Console
2. Select **Model access** from the left menu
3. Click **Manage model access**
4. Find **Anthropic** section and check:
   - `Claude 3.5 Sonnet` (recommended)
   - `Claude 3 Haiku` (optional - faster/cheaper)
5. Click **Request model access**
6. Wait for status to show "Access granted" (usually instant)

---

## Step 2: Create IAM Role for Bedrock

The EC2 instance needs permission to call Bedrock APIs.

### Create the Policy

1. Go to **IAM** → **Policies** → **Create policy**
2. Click the **JSON** tab
3. Paste this policy:

```json
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
```

4. Click **Next**
5. Name: `OKRTrackerBedrockPolicy`
6. Click **Create policy**

### Create the Role

1. Go to **IAM** → **Roles** → **Create role**
2. **Trusted entity type**: AWS service
3. **Use case**: EC2
4. Click **Next**
5. Search for `OKRTrackerBedrockPolicy` and check it
6. Click **Next**
7. **Role name**: `OKRTrackerRole`
8. Click **Create role**

---

## Step 3: Deploy with CloudFormation (Recommended)

This is the easiest method - everything is automated.

### Upload the Template

1. Go to **CloudFormation** in AWS Console
2. Click **Create stack** → **With new resources (standard)**
3. Select **Upload a template file**
4. Download and upload: [okr-tracker.yaml](../cloudformation/okr-tracker.yaml)

   Or create a new file with this content:

<details>
<summary>Click to expand CloudFormation template</summary>

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'OKR Tracker - Single instance deployment with Bedrock integration'

Parameters:
  KeyName:
    Type: AWS::EC2::KeyPair::KeyName
    Description: SSH key pair for EC2 access

  InstanceType:
    Type: String
    Default: t3.medium
    AllowedValues:
      - t3.small
      - t3.medium
      - t3.large
    Description: EC2 instance type

Resources:
  EC2Role:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub '${AWS::StackName}-role'
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ec2.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: BedrockAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - bedrock:InvokeModel
                  - bedrock:InvokeModelWithResponseStream
                Resource: '*'

  EC2InstanceProfile:
    Type: AWS::IAM::InstanceProfile
    Properties:
      Roles:
        - !Ref EC2Role

  SecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: OKR Tracker security group
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0

  ElasticIP:
    Type: AWS::EC2::EIP
    Properties:
      Domain: vpc

  EC2Instance:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: '{{resolve:ssm:/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id}}'
      InstanceType: !Ref InstanceType
      KeyName: !Ref KeyName
      IamInstanceProfile: !Ref EC2InstanceProfile
      SecurityGroupIds:
        - !Ref SecurityGroup
      BlockDeviceMappings:
        - DeviceName: /dev/sda1
          Ebs:
            VolumeSize: 30
            VolumeType: gp3
      Tags:
        - Key: Name
          Value: !Ref 'AWS::StackName'
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash
          set -e
          exec > >(tee /var/log/user-data.log) 2>&1

          apt-get update && apt-get upgrade -y
          curl -fsSL https://get.docker.com | sh
          usermod -aG docker ubuntu
          apt-get install -y docker-compose-plugin git curl
          curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
          apt-get install -y nodejs
          npm install -g @anthropic-ai/claude-code

          mkdir -p /opt/okr-tracker && chown ubuntu:ubuntu /opt/okr-tracker
          su - ubuntu -c "git clone https://github.com/berryk/okr-tracker.git /opt/okr-tracker"

          cd /opt/okr-tracker
          cat > .env <<EOF
          JWT_SECRET=$(openssl rand -hex 32)
          CORS_ORIGIN=http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
          VITE_API_URL=http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
          LLM_PROVIDER=bedrock
          AWS_REGION=${AWS::Region}
          BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
          DB_PASSWORD=okr_password
          EOF
          chown ubuntu:ubuntu .env

          su - ubuntu -c "cd /opt/okr-tracker && docker compose -f docker-compose.aws.yml up -d"
          sleep 30
          su - ubuntu -c "cd /opt/okr-tracker && docker compose -f docker-compose.aws.yml exec -T backend npx prisma db push"
          su - ubuntu -c "cd /opt/okr-tracker && docker compose -f docker-compose.aws.yml exec -T backend npx prisma db seed"

  EIPAssociation:
    Type: AWS::EC2::EIPAssociation
    Properties:
      InstanceId: !Ref EC2Instance
      EIP: !Ref ElasticIP

Outputs:
  WebURL:
    Description: OKR Tracker URL
    Value: !Sub 'http://${ElasticIP}'
  SSHCommand:
    Description: SSH connection command
    Value: !Sub 'ssh -i ~/.ssh/${KeyName}.pem ubuntu@${ElasticIP}'
  DemoLogin:
    Description: Demo credentials
    Value: 'Email: ceo@demo.com | Password: demo123'
```

</details>

5. Click **Next**

### Configure Stack

1. **Stack name**: `okr-tracker`
2. **Parameters**:
   - **KeyName**: Select your SSH key pair from dropdown
   - **InstanceType**: `t3.medium` (recommended)
3. Click **Next**

### Stack Options

1. Leave defaults or add tags if desired
2. Click **Next**

### Review and Create

1. Scroll to bottom
2. Check: **"I acknowledge that AWS CloudFormation might create IAM resources with custom names"**
3. Click **Submit**

### Wait for Completion

1. Wait for stack status to show `CREATE_COMPLETE` (5-10 minutes)
2. Click the **Outputs** tab
3. Note the **WebURL** - this is your OKR Tracker URL

---

## Step 3 (Alternative): Manual EC2 Launch

If you prefer more control, you can launch EC2 manually.

### Launch Instance

1. Go to **EC2** → **Instances** → **Launch instances**

2. **Name and tags**
   - Name: `okr-tracker`

3. **Application and OS Images**
   - Select **Ubuntu**
   - Choose **Ubuntu Server 24.04 LTS**
   - Architecture: 64-bit (x86)

4. **Instance type**
   - Select `t3.medium` (or `t3.large` for better performance)

5. **Key pair**
   - Select your existing key pair

6. **Network settings** → Click **Edit**
   - Auto-assign public IP: **Enable**
   - Create security group: **Yes**
   - Security group name: `okr-tracker-sg`
   - Add rules:
     | Type | Port | Source |
     |------|------|--------|
     | SSH | 22 | My IP (or 0.0.0.0/0) |
     | HTTP | 80 | 0.0.0.0/0 |
     | HTTPS | 443 | 0.0.0.0/0 |

7. **Configure storage**
   - Size: `30` GiB
   - Volume type: `gp3`

8. **Advanced details** → Expand
   - **IAM instance profile**: Select `OKRTrackerRole` (created in Step 2)
   - **User data**: Paste the following script:

```bash
#!/bin/bash
set -e
exec > >(tee /var/log/user-data.log) 2>&1

echo "=== Starting OKR Tracker Installation ==="

# Update system
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu

# Install Docker Compose
apt-get install -y docker-compose-plugin

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Install other tools
apt-get install -y git curl wget htop jq

# Create app directory
mkdir -p /opt/okr-tracker
chown ubuntu:ubuntu /opt/okr-tracker

# Clone repository
su - ubuntu -c "git clone https://github.com/berryk/okr-tracker.git /opt/okr-tracker"

# Get instance metadata
INSTANCE_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)

# Create environment file
cd /opt/okr-tracker
cat > .env <<EOF
JWT_SECRET=$(openssl rand -hex 32)
CORS_ORIGIN=http://$INSTANCE_IP
VITE_API_URL=http://$INSTANCE_IP
LLM_PROVIDER=bedrock
AWS_REGION=$REGION
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
DB_PASSWORD=okr_password
EOF
chown ubuntu:ubuntu .env

# Start the application
su - ubuntu -c "cd /opt/okr-tracker && docker compose -f docker-compose.aws.yml up -d"

# Wait for containers to be ready
echo "Waiting for containers to start..."
sleep 30

# Initialize database
su - ubuntu -c "cd /opt/okr-tracker && docker compose -f docker-compose.aws.yml exec -T backend npx prisma db push"
su - ubuntu -c "cd /opt/okr-tracker && docker compose -f docker-compose.aws.yml exec -T backend npx prisma db seed"

echo "=== OKR Tracker Installation Complete ==="
echo "Access the application at: http://$INSTANCE_IP"
```

9. Click **Launch instance**

### Allocate Elastic IP (Optional but Recommended)

An Elastic IP gives you a static IP that doesn't change when you stop/start the instance.

1. Go to **EC2** → **Elastic IPs**
2. Click **Allocate Elastic IP address**
3. Click **Allocate**
4. Select the new Elastic IP
5. Click **Actions** → **Associate Elastic IP address**
6. Select your `okr-tracker` instance
7. Click **Associate**

---

## Step 4: Access Your Application

### Wait for Installation

The installation takes 5-10 minutes. You can monitor progress:

1. Go to **EC2** → **Instances**
2. Select your instance
3. Click **Connect** → **EC2 Instance Connect** (or use SSH)
4. Run: `tail -f /var/log/user-data.log`

### Access the Web Interface

1. Find your instance's **Public IPv4 address** (or Elastic IP)
2. Open in browser: `http://<your-ip>`

### Demo Login Credentials

| Email | Password | Role |
|-------|----------|------|
| ceo@demo.com | demo123 | CEO |
| vp.sales@demo.com | demo123 | VP Sales |
| vp.engineering@demo.com | demo123 | VP Engineering |
| manager@demo.com | demo123 | Sales Manager |
| dev@demo.com | demo123 | Developer |

---

## Step 5: Set Up Custom Domain (Optional)

### Using Cloudflare (Free SSL)

1. Add your domain to Cloudflare
2. Create an A record pointing to your Elastic IP
3. Enable Cloudflare proxy (orange cloud)
4. SSL/TLS mode: Full

5. SSH into your instance and update the config:
```bash
cd /opt/okr-tracker
nano .env
# Change:
# CORS_ORIGIN=https://okr.yourdomain.com
# VITE_API_URL=https://okr.yourdomain.com

docker compose -f docker-compose.aws.yml up -d --build
```

### Using Let's Encrypt

1. SSH into your instance
2. Install certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx nginx
sudo certbot --nginx -d okr.yourdomain.com
```

---

## Step 6: Using Claude Code

Claude Code is pre-installed on the instance for continued development.

### Connect via SSH

```bash
ssh -i ~/.ssh/your-key.pem ubuntu@<your-ip>
```

### Start Claude Code

```bash
cd /opt/okr-tracker
claude
```

Claude Code will automatically use Bedrock via the instance's IAM role.

---

## Maintenance

### View Logs

```bash
# Application logs
docker compose -f docker-compose.aws.yml logs -f

# Backend only
docker compose -f docker-compose.aws.yml logs backend

# Installation log
cat /var/log/user-data.log
```

### Update Application

```bash
cd /opt/okr-tracker
git pull
docker compose -f docker-compose.aws.yml up -d --build
```

### Restart Services

```bash
cd /opt/okr-tracker
docker compose -f docker-compose.aws.yml restart
```

### Backup Database

```bash
cd /opt/okr-tracker
docker compose -f docker-compose.aws.yml exec db pg_dump -U okr okr_tracker > backup.sql
```

### Restore Database

```bash
cat backup.sql | docker compose -f docker-compose.aws.yml exec -T db psql -U okr okr_tracker
```

---

## Cleanup / Delete Resources

### If using CloudFormation

1. Go to **CloudFormation**
2. Select your stack
3. Click **Delete**
4. Confirm deletion

### If using Manual EC2

1. **EC2** → **Instances** → Select instance → **Terminate**
2. **EC2** → **Elastic IPs** → Select IP → **Release**
3. **EC2** → **Security Groups** → Select `okr-tracker-sg` → **Delete**
4. **IAM** → **Roles** → Delete `OKRTrackerRole`
5. **IAM** → **Policies** → Delete `OKRTrackerBedrockPolicy`

---

## Troubleshooting

### Instance won't start / User data not running

- Check instance system log: EC2 → Instance → Actions → Monitor → Get system log
- Ensure IAM role is attached
- Verify security group allows outbound internet access

### Can't access web interface

- Verify security group allows port 80 inbound
- Check if containers are running: `docker ps`
- Check container logs: `docker compose -f docker-compose.aws.yml logs`

### Bedrock errors / AI features not working

- Verify IAM role has Bedrock permissions
- Check Bedrock model access is enabled in your region
- Test Bedrock access: `aws bedrock list-foundation-models --region us-east-1`

### Database connection errors

```bash
# Check if database is running
docker compose -f docker-compose.aws.yml ps db

# View database logs
docker compose -f docker-compose.aws.yml logs db

# Connect to database directly
docker compose -f docker-compose.aws.yml exec db psql -U okr okr_tracker
```

---

## Security Recommendations

1. **Restrict SSH access**: Change security group SSH rule from `0.0.0.0/0` to your IP
2. **Use HTTPS**: Set up SSL with Cloudflare or Let's Encrypt
3. **Change default passwords**: Update demo user passwords after setup
4. **Enable AWS backups**: Use AWS Backup or EBS snapshots
5. **Monitor costs**: Set up AWS Budget alerts
