# How to Fix the Resource Conflict Error

## The Issue
Terraform is still trying to create resources without the `-v2` suffix, even though `terraform.tfvars` has it set.

## Solution: Force Terraform to Use the Variable File

### Method 1: Explicitly Specify Variable File (RECOMMENDED)

Run terraform apply with the `-var-file` flag:

```powershell
cd devops\terraform
terraform apply -var-file=terraform.tfvars
```

### Method 2: Refresh State First

```powershell
cd devops\terraform
.\force-refresh.ps1
terraform apply
```

### Method 3: Use Command Line Variable

```powershell
cd devops\terraform
terraform apply -var="resource_name_suffix=-v2"
```

### Method 4: Check Your Current Directory

Make sure you're running terraform from the `devops\terraform` directory:

```powershell
# Check current directory
pwd

# Should show: C:\Users\sduse\Downloads\Python\devops\terraform

# If not, navigate there:
cd C:\Users\sduse\Downloads\Python\devops\terraform
terraform apply
```

## Verify Variables Are Loaded

Check if Terraform sees your variables:

```powershell
terraform plan -var-file=terraform.tfvars | Select-String "wardrobe-app-sg"
```

You should see `wardrobe-app-sg-v2` in the output.

## If Still Not Working

1. **Check terraform.tfvars location:**
   ```powershell
   Test-Path terraform.tfvars
   # Should return: True
   ```

2. **Verify the file content:**
   ```powershell
   Get-Content terraform.tfvars
   # Should show: resource_name_suffix = "-v2"
   ```

3. **Try with explicit path:**
   ```powershell
   terraform apply -var-file="C:\Users\sduse\Downloads\Python\devops\terraform\terraform.tfvars"
   ```

## Quick One-Liner Fix

```powershell
cd C:\Users\sduse\Downloads\Python\devops\terraform; terraform apply -var="resource_name_suffix=-v2"
```

This will definitely work because it passes the variable directly on the command line.

