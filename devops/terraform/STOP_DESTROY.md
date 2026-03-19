# How to Stop Terraform from Destroying Resources

## The Issue
Terraform is trying to replace the Nagios security group because the name changed. This is normal but can be concerning.

## Solution: Use the Safe Apply Script

Run this instead of `terraform apply`:

```powershell
cd devops\terraform
.\apply-safely.ps1
```

This script will:
1. Validate the configuration
2. Show you what will be created/destroyed
3. Ask for confirmation
4. Apply changes safely

## Why Resources Are Being Replaced

The Nagios security group name changed from `wardrobe-nagios-sg` to `wardrobe-nagios-sg-v2`. Terraform must:
1. Create the new security group
2. Update the Nagios instance to use it
3. Delete the old security group

**This is safe** - the Nagios instance itself won't be destroyed, just updated.

## Alternative: Import Existing Security Group

If you want to keep using the existing security group name:

```powershell
# Get the security group ID
$sgId = aws ec2 describe-security-groups --filters "Name=group-name,Values=wardrobe-nagios-sg" --query "SecurityGroups[0].GroupId" --output text

# Import it with the new name in state
terraform import -var="resource_name_suffix=-v2" aws_security_group.nagios_sg $sgId
```

But this is more complex. The replacement is simpler and safer.

## Quick Fix: Just Apply

The replacement is safe. Just run:

```powershell
cd devops\terraform
terraform apply -var="resource_name_suffix=-v2" -auto-approve
```

The security group will be replaced, but your Nagios instance will continue running.

## What Gets Destroyed?

Only the **security group** gets destroyed and recreated. The Nagios **instance** stays running and just gets updated to use the new security group.

This is normal and safe!

