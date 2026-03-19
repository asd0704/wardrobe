# PowerShell script to clean up existing AWS resources
# Run this if you want to delete old resources and use original names

Write-Host "WARNING: This script will delete existing AWS resources!" -ForegroundColor Red
Write-Host "Resources to be deleted:"
Write-Host "  - Security Group: wardrobe-app-sg"
Write-Host "  - Security Group: wardrobe-db-sg"
Write-Host "  - Security Group: wardrobe-nagios-sg"
Write-Host "  - IAM Role: wardrobe-app-role"
Write-Host "  - IAM Instance Profile: wardrobe-app-profile"
Write-Host ""
$confirm = Read-Host "Do you want to continue? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "Aborted." -ForegroundColor Yellow
    exit
}

$region = "ap-south-1"

# Get VPC ID
Write-Host "Getting VPC ID..." -ForegroundColor Cyan
$vpc = aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region $region
Write-Host "Using VPC: $vpc" -ForegroundColor Green

# Delete Security Groups
Write-Host "`nDeleting security groups..." -ForegroundColor Cyan
$sgNames = @("wardrobe-app-sg", "wardrobe-db-sg", "wardrobe-nagios-sg")

foreach ($sgName in $sgNames) {
    $sgId = aws ec2 describe-security-groups --filters "Name=group-name,Values=$sgName" "Name=vpc-id,Values=$vpc" --query "SecurityGroups[0].GroupId" --output text --region $region 2>$null
    
    if ($sgId -and $sgId -ne "None") {
        Write-Host "  Deleting security group: $sgName ($sgId)" -ForegroundColor Yellow
        aws ec2 delete-security-group --group-id $sgId --region $region 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✓ Deleted" -ForegroundColor Green
        } else {
            Write-Host "    ✗ Failed (may be in use)" -ForegroundColor Red
        }
    } else {
        Write-Host "  Security group $sgName not found" -ForegroundColor Gray
    }
}

# Delete IAM Instance Profile
Write-Host "`nDeleting IAM instance profile..." -ForegroundColor Cyan
$profileName = "wardrobe-app-profile"
$profileCheck = aws iam get-instance-profile --instance-profile-name $profileName 2>$null

if ($LASTEXITCODE -eq 0) {
    $roleName = aws iam get-instance-profile --instance-profile-name $profileName --query "InstanceProfile.Roles[0].RoleName" --output text 2>$null
    
    if ($roleName -and $roleName -ne "None") {
        Write-Host "  Removing role from instance profile: $roleName" -ForegroundColor Yellow
        aws iam remove-role-from-instance-profile --instance-profile-name $profileName --role-name $roleName 2>$null
    }
    
    Write-Host "  Deleting instance profile: $profileName" -ForegroundColor Yellow
    aws iam delete-instance-profile --instance-profile-name $profileName 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✓ Deleted" -ForegroundColor Green
    } else {
        Write-Host "    ✗ Failed" -ForegroundColor Red
    }
} else {
    Write-Host "  Instance profile $profileName not found" -ForegroundColor Gray
}

# Delete IAM Role
Write-Host "`nDeleting IAM role..." -ForegroundColor Cyan
$roleName = "wardrobe-app-role"
$roleCheck = aws iam get-role --role-name $roleName 2>$null

if ($LASTEXITCODE -eq 0) {
    # List and delete inline policies
    $policies = aws iam list-role-policies --role-name $roleName --query "PolicyNames" --output text 2>$null
    
    if ($policies) {
        foreach ($policy in $policies.Split("`t")) {
            if ($policy) {
                Write-Host "  Deleting policy: $policy" -ForegroundColor Yellow
                aws iam delete-role-policy --role-name $roleName --policy-name $policy 2>$null
            }
        }
    }
    
    Write-Host "  Deleting role: $roleName" -ForegroundColor Yellow
    aws iam delete-role --role-name $roleName 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✓ Deleted" -ForegroundColor Green
    } else {
        Write-Host "    ✗ Failed" -ForegroundColor Red
    }
} else {
    Write-Host "  IAM role $roleName not found" -ForegroundColor Gray
}

Write-Host "`nCleanup complete!" -ForegroundColor Green
Write-Host "You can now run: terraform apply" -ForegroundColor Cyan

