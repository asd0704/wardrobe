# Migration Summary: MongoDB Atlas → AWS EC2 + S3

## What Changed

### ✅ Infrastructure (Terraform)
- **Before**: Single EC2 instance
- **After**: 
  - Separate EC2 instance for application
  - Separate EC2 instance for MongoDB database
  - S3 bucket for file storage
  - IAM role for S3 access
  - Security groups configured for secure communication

### ✅ Database
- **Before**: MongoDB Atlas (external service, network access issues)
- **After**: MongoDB 7.0 running on dedicated EC2 instance
  - No external dependencies
  - Private network communication
  - Full control over configuration

### ✅ File Storage
- **Before**: Local filesystem (`public/uploads/`)
- **After**: AWS S3 bucket
  - Scalable storage
  - Automatic backups (versioning enabled)
  - Public read access for images
  - Fallback to local storage if S3 unavailable

### ✅ Deployment
- **Before**: Single Ansible playbook
- **After**: 
  - Separate playbook for MongoDB setup (`setup-mongodb.yml`)
  - Updated app deployment playbook with S3 support
  - Dynamic inventory with app and database groups

## Benefits

1. **No External Dependencies**: Everything runs on AWS
2. **Better Security**: Database only accessible from app instance
3. **Scalable Storage**: S3 handles unlimited file storage
4. **Cost Effective**: ~$15-20/month (vs MongoDB Atlas pricing)
5. **Full Control**: Complete control over database and storage

## Quick Start

1. **Deploy infrastructure:**
   ```bash
   cd terraform
   terraform init
   terraform apply
   ```

2. **Setup inventory:**
   ```bash
   cd ansible
   # Edit inventory.ini with IPs from terraform output
   ```

3. **Setup MongoDB:**
   ```bash
   ansible-playbook -i inventory.ini setup-mongodb.yml
   ```

4. **Deploy application:**
   ```bash
   S3_BUCKET=$(terraform -chdir=../terraform output -raw s3_bucket_name)
   ansible-playbook -i inventory.ini deploy.yml -e "s3_bucket=$S3_BUCKET"
   ```

## Files Modified

### New Files
- `terraform/main.tf` - Updated with separate instances and S3
- `ansible/setup-mongodb.yml` - MongoDB installation playbook
- `ansible/inventory.template.ini` - Inventory template
- `src/lib/s3.ts` - S3 utility functions
- `AWS_DEPLOYMENT_GUIDE.md` - Complete deployment guide

### Modified Files
- `terraform/variables.tf` - Added database instance type and bucket prefix
- `terraform/outputs.tf` - Added new outputs for instances and S3
- `ansible/deploy.yml` - Updated for separate instances and S3
- `src/app/api/upload/route.ts` - Added S3 upload support
- `package.json` - Added AWS SDK dependencies

## Breaking Changes

⚠️ **Important**: If you have existing deployments:

1. **Database**: You'll need to migrate data from MongoDB Atlas to EC2 MongoDB
2. **Files**: Existing files in `public/uploads/` need to be migrated to S3
3. **Environment Variables**: MongoDB URI format changed

## Migration Steps (if upgrading existing deployment)

1. **Export data from MongoDB Atlas:**
   ```bash
   mongodump --uri="mongodb+srv://..." --out=/tmp/backup
   ```

2. **Import to EC2 MongoDB:**
   ```bash
   mongorestore --uri="mongodb://wardrobe_user:wardrobe123@<db-ip>:27017/Digital_Wardrobe" /tmp/backup
   ```

3. **Migrate files to S3:**
   ```bash
   aws s3 sync public/uploads/ s3://<bucket-name>/uploads/
   ```

## Next Steps

See `AWS_DEPLOYMENT_GUIDE.md` for detailed instructions and troubleshooting.

