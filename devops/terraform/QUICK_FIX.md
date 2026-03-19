# Quick Fix for "Resource Already Exists" Error

## Immediate Solution

You have **3 options** to fix the error:

### Option 1: Use Unique Names (Easiest - Recommended)

Add a suffix to your `terraform.tfvars` file:

```hcl
resource_name_suffix = "-v2"
```

Then run:
```bash
terraform apply
```

This creates new resources with unique names like:
- `wardrobe-app-sg-v2`
- `wardrobe-app-role-v2`

### Option 2: Delete Existing Resources

Run the cleanup script:
```bash
chmod +x cleanup-existing-resources.sh
./cleanup-existing-resources.sh
```

Then run:
```bash
terraform apply
```

### Option 3: Manual Cleanup via AWS CLI

```bash
# Get VPC ID
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text)

# Delete Security Groups
for SG_NAME in "wardrobe-app-sg" "wardrobe-db-sg" "wardrobe-nagios-sg"; do
    SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$SG_NAME" "Name=vpc-id,Values=$VPC_ID" --query "SecurityGroups[0].GroupId" --output text)
    if [ "$SG_ID" != "None" ]; then
        aws ec2 delete-security-group --group-id "$SG_ID"
    fi
done

# Delete IAM Role (after removing from instance profile)
aws iam remove-role-from-instance-profile --instance-profile-name wardrobe-app-profile --role-name wardrobe-app-role
aws iam delete-instance-profile --instance-profile-name wardrobe-app-profile
aws iam delete-role-policy --role-name wardrobe-app-role --policy-name wardrobe-app-s3-policy
aws iam delete-role --role-name wardrobe-app-role
```

## Recommended Approach

**For testing/development**: Use **Option 1** (add suffix)
**For production**: Use **Option 2** (cleanup script) to remove old resources

## After Fixing

Once you've resolved the conflict, run:
```bash
terraform init  # If needed
terraform plan  # Review changes
terraform apply # Deploy
```

For more details, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

