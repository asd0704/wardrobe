# IMMEDIATE FIX - Resource Conflict Error

## The Problem
Terraform is trying to create resources that already exist in AWS:
- `wardrobe-app-sg` (Security Group)
- `wardrobe-app-role` (IAM Role)

## Solution Applied
I've created `terraform.tfvars` with `resource_name_suffix = "-v2"` which will create resources with unique names:
- `wardrobe-app-sg-v2`
- `wardrobe-app-role-v2`

## Next Steps

### Option 1: Use the new terraform.tfvars (RECOMMENDED)
The file `terraform.tfvars` has been created. Just run:

```bash
terraform apply
```

This will create new resources with the `-v2` suffix, avoiding conflicts.

### Option 2: Delete Old Resources First
If you want to use the original names, delete the old resources:

**Using AWS Console:**
1. Go to EC2 → Security Groups → Delete `wardrobe-app-sg`
2. Go to IAM → Roles → Delete `wardrobe-app-role`
3. Go to IAM → Instance Profiles → Delete `wardrobe-app-profile`

**Using AWS CLI:**
```bash
# Get VPC ID
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region ap-south-1)

# Delete Security Groups
for SG_NAME in "wardrobe-app-sg" "wardrobe-db-sg" "wardrobe-nagios-sg"; do
    SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$SG_NAME" "Name=vpc-id,Values=$VPC_ID" --query "SecurityGroups[0].GroupId" --output text --region ap-south-1 2>/dev/null)
    if [ "$SG_ID" != "None" ] && [ -n "$SG_ID" ]; then
        echo "Deleting $SG_NAME: $SG_ID"
        aws ec2 delete-security-group --group-id "$SG_ID" --region ap-south-1
    fi
done

# Delete IAM Resources
aws iam remove-role-from-instance-profile --instance-profile-name wardrobe-app-profile --role-name wardrobe-app-role 2>/dev/null
aws iam delete-instance-profile --instance-profile-name wardrobe-app-profile 2>/dev/null
aws iam delete-role-policy --role-name wardrobe-app-role --policy-name wardrobe-app-s3-policy 2>/dev/null
aws iam delete-role --role-name wardrobe-app-role 2>/dev/null
```

Then remove the suffix from `terraform.tfvars`:
```hcl
resource_name_suffix = ""  # or remove this line
```

### Option 3: Import Existing Resources
If you want Terraform to manage the existing resources:

```bash
# Get Security Group ID
SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=wardrobe-app-sg" --query "SecurityGroups[0].GroupId" --output text)

# Import security group
terraform import aws_security_group.app_sg $SG_ID

# Import IAM role
terraform import aws_iam_role.app_role wardrobe-app-role
```

## Recommended Action
**Just run `terraform apply`** - the `terraform.tfvars` file is already configured with the suffix!

