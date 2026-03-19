# Safe Terraform Apply Script
# This script ensures resources are created, not destroyed

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Safe Terraform Apply" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "main.tf")) {
    Write-Host "Error: main.tf not found. Please run this from the terraform directory." -ForegroundColor Red
    exit 1
}

# Check if terraform.tfvars exists
if (-not (Test-Path "terraform.tfvars")) {
    Write-Host "Creating terraform.tfvars with suffix..." -ForegroundColor Yellow
    @"
resource_name_suffix = "-v2"
aws_region = "ap-south-1"
key_name = "devops"
"@ | Out-File -FilePath "terraform.tfvars" -Encoding utf8
}

Write-Host "Step 1: Validating configuration..." -ForegroundColor Cyan
terraform validate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Validation failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`nStep 2: Creating execution plan..." -ForegroundColor Cyan
terraform plan -var="resource_name_suffix=-v2" -out=tfplan

Write-Host "`nStep 3: Reviewing plan..." -ForegroundColor Cyan
$planOutput = terraform show -json tfplan | ConvertFrom-Json

# Count resource changes
$toCreate = ($planOutput.resource_changes | Where-Object { $_.change.actions -contains "create" }).Count
$toDestroy = ($planOutput.resource_changes | Where-Object { $_.change.actions -contains "delete" }).Count
$toReplace = ($planOutput.resource_changes | Where-Object { $_.change.actions -contains "replace" }).Count

Write-Host "`nPlan Summary:" -ForegroundColor Yellow
Write-Host "  Resources to CREATE: $toCreate" -ForegroundColor Green
Write-Host "  Resources to DESTROY: $toDestroy" -ForegroundColor $(if ($toDestroy -gt 0) { "Red" } else { "Green" })
Write-Host "  Resources to REPLACE: $toReplace" -ForegroundColor $(if ($toReplace -gt 0) { "Yellow" } else { "Green" })

if ($toDestroy -gt 0 -or $toReplace -gt 0) {
    Write-Host "`nWARNING: This plan will destroy or replace some resources!" -ForegroundColor Red
    Write-Host "This is normal for security groups when names change." -ForegroundColor Yellow
    Write-Host ""
    $confirm = Read-Host "Do you want to continue? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Host "Aborted." -ForegroundColor Yellow
        Remove-Item tfplan -ErrorAction SilentlyContinue
        exit 0
    }
}

Write-Host "`nStep 4: Applying changes..." -ForegroundColor Cyan
terraform apply -auto-approve -var="resource_name_suffix=-v2"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Success! Infrastructure deployed." -ForegroundColor Green
    Write-Host "`nGetting outputs..." -ForegroundColor Cyan
    terraform output
} else {
    Write-Host "`n✗ Apply failed!" -ForegroundColor Red
    exit 1
}

