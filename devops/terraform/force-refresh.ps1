# PowerShell script to force Terraform refresh
# This ensures Terraform uses the latest variable values

Write-Host "Refreshing Terraform state and variables..." -ForegroundColor Cyan

# Remove lock file if exists
if (Test-Path ".terraform.tfstate.lock.info") {
    Remove-Item ".terraform.tfstate.lock.info" -Force
    Write-Host "Removed lock file" -ForegroundColor Yellow
}

# Refresh state with explicit var file
Write-Host "Refreshing state..." -ForegroundColor Cyan
terraform refresh -var-file=terraform.tfvars

# Validate
Write-Host "Validating configuration..." -ForegroundColor Cyan
terraform validate

Write-Host ""
Write-Host "Now run: terraform apply -var-file=terraform.tfvars" -ForegroundColor Green
Write-Host "Or simply: terraform apply" -ForegroundColor Green

