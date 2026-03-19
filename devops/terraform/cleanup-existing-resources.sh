#!/bin/bash

# Script to clean up existing resources that conflict with Terraform
# WARNING: This will delete existing resources. Use with caution!

echo "WARNING: This script will delete existing AWS resources!"
echo "Resources to be deleted:"
echo "  - Security Group: wardrobe-app-sg"
echo "  - Security Group: wardrobe-db-sg"
echo "  - Security Group: wardrobe-nagios-sg"
echo "  - IAM Role: wardrobe-app-role"
echo "  - IAM Instance Profile: wardrobe-app-profile"
echo ""
read -p "Do you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

# Get VPC ID (assuming default VPC)
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region ${AWS_REGION:-ap-south-1})
echo "Using VPC: $VPC_ID"

# Delete Security Groups
echo "Deleting security groups..."
for SG_NAME in "wardrobe-app-sg" "wardrobe-db-sg" "wardrobe-nagios-sg"; do
    SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$SG_NAME" "Name=vpc-id,Values=$VPC_ID" --query "SecurityGroups[0].GroupId" --output text --region ${AWS_REGION:-ap-south-1} 2>/dev/null)
    if [ "$SG_ID" != "None" ] && [ -n "$SG_ID" ]; then
        echo "  Deleting security group: $SG_NAME ($SG_ID)"
        aws ec2 delete-security-group --group-id "$SG_ID" --region ${AWS_REGION:-ap-south-1} 2>/dev/null || echo "    Failed or already deleted"
    else
        echo "  Security group $SG_NAME not found"
    fi
done

# Detach and delete IAM Instance Profile
echo "Deleting IAM instance profile..."
PROFILE_NAME="wardrobe-app-profile"
PROFILE_EXISTS=$(aws iam get-instance-profile --instance-profile-name "$PROFILE_NAME" 2>/dev/null)
if [ $? -eq 0 ]; then
    ROLE_NAME=$(aws iam get-instance-profile --instance-profile-name "$PROFILE_NAME" --query "InstanceProfile.Roles[0].RoleName" --output text 2>/dev/null)
    if [ -n "$ROLE_NAME" ] && [ "$ROLE_NAME" != "None" ]; then
        echo "  Removing role from instance profile: $ROLE_NAME"
        aws iam remove-role-from-instance-profile --instance-profile-name "$PROFILE_NAME" --role-name "$ROLE_NAME" 2>/dev/null || echo "    Failed"
    fi
    echo "  Deleting instance profile: $PROFILE_NAME"
    aws iam delete-instance-profile --instance-profile-name "$PROFILE_NAME" 2>/dev/null || echo "    Failed or already deleted"
else
    echo "  Instance profile $PROFILE_NAME not found"
fi

# Delete IAM Role and Policy
echo "Deleting IAM role..."
ROLE_NAME="wardrobe-app-role"
ROLE_EXISTS=$(aws iam get-role --role-name "$ROLE_NAME" 2>/dev/null)
if [ $? -eq 0 ]; then
    # List and delete inline policies
    POLICIES=$(aws iam list-role-policies --role-name "$ROLE_NAME" --query "PolicyNames" --output text 2>/dev/null)
    for POLICY in $POLICIES; do
        echo "  Deleting policy: $POLICY"
        aws iam delete-role-policy --role-name "$ROLE_NAME" --policy-name "$POLICY" 2>/dev/null || echo "    Failed"
    done
    
    # Delete role
    echo "  Deleting role: $ROLE_NAME"
    aws iam delete-role --role-name "$ROLE_NAME" 2>/dev/null || echo "    Failed or already deleted"
else
    echo "  IAM role $ROLE_NAME not found"
fi

echo ""
echo "Cleanup complete!"
echo "You can now run: terraform apply"

