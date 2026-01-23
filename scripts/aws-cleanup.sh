#!/bin/bash
# AWS Cleanup Script for OKR Tracker
# Removes all AWS resources created by aws-provision.sh
#
# Usage:
#   ./aws-cleanup.sh [options]
#
# Options:
#   --region REGION   AWS region (default: us-east-1)
#   --force           Skip confirmation prompt

set -e

REGION="us-east-1"
FORCE=false
STACK_NAME="okr-tracker"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

while [[ $# -gt 0 ]]; do
  case $1 in
    --region)
      REGION="$2"
      shift 2
      ;;
    --force)
      FORCE=true
      shift
      ;;
    *)
      shift
      ;;
  esac
done

echo "=========================================="
echo -e "${RED}OKR Tracker AWS Cleanup${NC}"
echo "=========================================="
echo ""
echo "This will delete the following resources in $REGION:"
echo "  - EC2 Instance: ${STACK_NAME}"
echo "  - Elastic IP: ${STACK_NAME}-eip"
echo "  - Security Group: ${STACK_NAME}-sg"
echo "  - IAM Role: ${STACK_NAME}-role"
echo "  - IAM Instance Profile: ${STACK_NAME}-profile"
echo ""

if [ "$FORCE" != true ]; then
  read -p "Are you sure you want to delete all resources? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 0
  fi
fi

# Find and terminate EC2 instance
log_info "Finding EC2 instance..."
INSTANCE_ID=$(aws ec2 describe-instances \
  --region $REGION \
  --filters "Name=tag:Name,Values=${STACK_NAME}" "Name=instance-state-name,Values=running,stopped,pending" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text 2>/dev/null)

if [ -n "$INSTANCE_ID" ] && [ "$INSTANCE_ID" != "None" ]; then
  log_info "Terminating instance: $INSTANCE_ID"
  aws ec2 terminate-instances --region $REGION --instance-ids $INSTANCE_ID
  log_info "Waiting for instance to terminate..."
  aws ec2 wait instance-terminated --region $REGION --instance-ids $INSTANCE_ID
else
  log_warn "No instance found"
fi

# Release Elastic IP
log_info "Finding Elastic IP..."
ALLOCATION_ID=$(aws ec2 describe-addresses \
  --region $REGION \
  --filters "Name=tag:Name,Values=${STACK_NAME}-eip" \
  --query 'Addresses[0].AllocationId' \
  --output text 2>/dev/null)

if [ -n "$ALLOCATION_ID" ] && [ "$ALLOCATION_ID" != "None" ]; then
  log_info "Releasing Elastic IP: $ALLOCATION_ID"
  aws ec2 release-address --region $REGION --allocation-id $ALLOCATION_ID
else
  log_warn "No Elastic IP found"
fi

# Delete Security Group
log_info "Finding security group..."
SG_ID=$(aws ec2 describe-security-groups \
  --region $REGION \
  --filters "Name=group-name,Values=${STACK_NAME}-sg" \
  --query 'SecurityGroups[0].GroupId' \
  --output text 2>/dev/null)

if [ -n "$SG_ID" ] && [ "$SG_ID" != "None" ]; then
  log_info "Deleting security group: $SG_ID"
  # May need to wait for ENIs to be deleted
  sleep 5
  aws ec2 delete-security-group --region $REGION --group-id $SG_ID 2>/dev/null || \
    log_warn "Could not delete security group (may still be in use)"
else
  log_warn "No security group found"
fi

# Remove role from instance profile and delete
log_info "Cleaning up IAM resources..."
aws iam remove-role-from-instance-profile \
  --instance-profile-name "${STACK_NAME}-profile" \
  --role-name "${STACK_NAME}-role" 2>/dev/null || true

aws iam delete-instance-profile \
  --instance-profile-name "${STACK_NAME}-profile" 2>/dev/null || \
  log_warn "Could not delete instance profile"

# Delete role policy and role
aws iam delete-role-policy \
  --role-name "${STACK_NAME}-role" \
  --policy-name "${STACK_NAME}-bedrock-policy" 2>/dev/null || true

aws iam delete-role \
  --role-name "${STACK_NAME}-role" 2>/dev/null || \
  log_warn "Could not delete IAM role"

echo ""
echo "=========================================="
echo -e "${GREEN}Cleanup complete!${NC}"
echo "=========================================="
