# Terraform Troubleshooting Guide

## Error: Resource Already Exists

If you encounter errors like:
- `The security group 'wardrobe-app-sg' already exists`
- `Role with name wardrobe-app-role already exists`

This means resources from a previous Terraform run still exist in AWS.

## Solutions

### Option 1: Use Unique Resource Names (Recommended for Testing)

Add a suffix to make resource names unique:

1. Edit `terraform.tfvars`:
```hcl
resource_name_suffix = "-v2"
```

2. Run terraform apply:
```bash
terraform apply
```

This will create new resources with names like:
- `wardrobe-app-sg-v2`
- `wardrobe-app-role-v2`

### Option 2: Import Existing Resources

If you want to manage existing resources with Terraform:

1. Get the resource IDs:
```bash
# Get Security Group ID
aws ec2 describe-security-groups --filters "Name=group-name,Values=wardrobe-app-sg" --query "SecurityGroups[0].GroupId" --output text

# Get IAM Role ARN
aws iam get-role --role-name wardrobe-app-role --query "Role.Arn" --output text
```

2. Import into Terraform state:
```bash
# Import security group
terraform import aws_security_group.app_sg sg-xxxxxxxxxxxxx

# Import IAM role
terraform import aws_iam_role.app_role wardrobe-app-role
```

3. Run terraform apply:
```bash
terraform apply
```

### Option 3: Delete Existing Resources

**WARNING: This will permanently delete resources!**

#### Manual Deletion via AWS Console:
1. Go to EC2 → Security Groups → Delete `wardrobe-app-sg`, `wardrobe-db-sg`, `wardrobe-nagios-sg`
2. Go to IAM → Roles → Delete `wardrobe-app-role`
3. Go to IAM → Instance Profiles → Delete `wardrobe-app-profile`

#### Automated Cleanup Script:
```bash
chmod +x cleanup-existing-resources.sh
./cleanup-existing-resources.sh
```

Then run:
```bash
terraform apply
```

### Option 4: Destroy All and Recreate

If you want to start completely fresh:

```bash
# First, try to destroy (if state exists)
terraform destroy

# If that fails, manually delete resources, then:
terraform apply
```

## Common Issues

### Issue: Security Group Dependency Error

**Error**: `InvalidGroup.NotFound` or circular dependency

**Solution**: Security groups reference each other. Terraform handles this automatically, but if you see errors:
1. Ensure all security groups are defined in the same file
2. Use `depends_on` if needed
3. Run `terraform apply` multiple times if needed (Terraform will retry)

### Issue: IAM Role Already Exists

**Error**: `EntityAlreadyExists: Role with name wardrobe-app-role already exists`

**Solution**: 
- Use `resource_name_suffix` variable
- Or delete existing role manually
- Or import existing role

### Issue: Cannot Delete Security Group

**Error**: `DependencyViolation: resource is in use`

**Solution**: 
1. Find resources using the security group:
```bash
aws ec2 describe-instances --filters "Name=instance.group-name,Values=wardrobe-app-sg" --query "Reservations[*].Instances[*].[InstanceId,Tags[?Key=='Name'].Value|[0]]" --output table
```

2. Terminate or modify instances using the security group
3. Then delete the security group

### Issue: IAM Role Cannot Be Deleted

**Error**: `DeleteConflict: Cannot delete entity, must detach all policies first`

**Solution**:
1. Detach policies:
```bash
aws iam list-attached-role-policies --role-name wardrobe-app-role
aws iam detach-role-policy --role-name wardrobe-app-role --policy-arn <policy-arn>
```

2. Delete inline policies:
```bash
aws iam list-role-policies --role-name wardrobe-app-role
aws iam delete-role-policy --role-name wardrobe-app-role --policy-name <policy-name>
```

3. Remove from instance profiles:
```bash
aws iam remove-role-from-instance-profile --instance-profile-name wardrobe-app-profile --role-name wardrobe-app-role
```

4. Delete the role:
```bash
aws iam delete-role --role-name wardrobe-app-role
```

## Best Practices

1. **Always use `terraform plan` first** to see what will be created
2. **Use version control** for your Terraform files
3. **Use remote state** (S3 backend) for team collaboration
4. **Tag resources** for better organization
5. **Use `resource_name_suffix`** when testing multiple deployments

## Getting Help

If issues persist:
1. Check Terraform state: `terraform show`
2. Validate configuration: `terraform validate`
3. Check AWS console for existing resources
4. Review Terraform logs with `-debug` flag: `terraform apply -debug`

