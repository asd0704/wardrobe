#!/bin/bash
# Force Terraform to refresh and use new variable values

echo "Refreshing Terraform state and variables..."

# Remove any cached variable values
rm -f .terraform.tfstate.lock.info 2>/dev/null

# Refresh state
terraform refresh -var-file=terraform.tfvars

# Validate
terraform validate

echo ""
echo "Now run: terraform apply -var-file=terraform.tfvars"

