#!/bin/bash

# Quick fix script for resource conflicts
# This script will help you resolve the "resource already exists" error

echo "=========================================="
echo "Terraform Resource Conflict Fixer"
echo "=========================================="
echo ""
echo "You have existing AWS resources that conflict with Terraform."
echo ""
echo "Choose an option:"
echo "1. Use unique names (add suffix) - RECOMMENDED"
echo "2. Delete existing resources"
echo "3. Exit"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "Creating terraform.tfvars with unique suffix..."
        if [ -f "terraform.tfvars" ]; then
            if ! grep -q "resource_name_suffix" terraform.tfvars; then
                echo "" >> terraform.tfvars
                echo "# Added to avoid resource conflicts" >> terraform.tfvars
                echo "resource_name_suffix = \"-v2\"" >> terraform.tfvars
                echo "✓ Added resource_name_suffix to terraform.tfvars"
            else
                echo "✓ resource_name_suffix already exists in terraform.tfvars"
            fi
        else
            cat > terraform.tfvars << EOF
# Terraform variables
# Add your AWS configuration here

# Resource name suffix to avoid conflicts with existing resources
resource_name_suffix = "-v2"

# Add other variables as needed:
# aws_region = "ap-south-1"
# key_name = "your-keypair-name"
EOF
            echo "✓ Created terraform.tfvars with resource_name_suffix"
        fi
        echo ""
        echo "Now run: terraform apply"
        ;;
    2)
        echo ""
        echo "WARNING: This will delete existing resources!"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            if [ -f "cleanup-existing-resources.sh" ]; then
                chmod +x cleanup-existing-resources.sh
                ./cleanup-existing-resources.sh
            else
                echo "Cleanup script not found. Please run cleanup manually."
            fi
        else
            echo "Cancelled."
        fi
        ;;
    3)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

