# AWS Deployment Guide - Separate App and Database Instances

This guide explains how to deploy the Digital Wardrobe application on AWS with:
- **Separate EC2 instances** for application and database
- **MongoDB** running on a dedicated EC2 instance
- **S3** for file storage
- **No external dependencies** (no MongoDB Atlas)

## Architecture

```
┌─────────────────┐         ┌─────────────────┐
│   App Instance  │────────▶│  Database       │
│   (EC2)         │         │  Instance (EC2) │
│                 │         │  (MongoDB)      │
└─────────────────┘         └─────────────────┘
         │
         ▼
┌─────────────────┐
│   S3 Bucket     │
│   (File Storage)│
└─────────────────┘
```

## Prerequisites

1. AWS account with appropriate permissions
2. Terraform installed
3. Ansible installed
4. AWS CLI configured (optional, for S3 access)
5. SSH key pair in AWS (default: `devops`)

## Step 1: Deploy Infrastructure with Terraform

```bash
cd terraform

# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply the infrastructure
terraform apply
```

This will create:
- 2 EC2 instances (app and database)
- Security groups with proper rules
- S3 bucket for file storage
- IAM role for S3 access

**Important outputs:**
```bash
# Get instance IPs
terraform output app_instance_public_ip
terraform output db_instance_public_ip
terraform output s3_bucket_name
terraform output mongodb_connection_string
```

## Step 2: Configure Ansible Inventory

Create `ansible/inventory.ini` based on the template:

```bash
cd ansible
cp inventory.template.ini inventory.ini
```

Edit `inventory.ini` and replace `APP_IP` and `DB_IP` with actual IPs from Terraform output:

```ini
[app]
13.126.0.235 ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/devops.pem

[database]
13.126.0.236 ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/devops.pem

[wardrobe:children]
app
database
```

## Step 3: Setup MongoDB on Database Instance

```bash
ansible-playbook -i inventory.ini setup-mongodb.yml
```

This will:
- Install MongoDB 7.0
- Configure it to listen on all interfaces (within VPC)
- Create admin and application users
- Start MongoDB service

**Default credentials:**
- Admin: `admin` / `admin123`
- App user: `wardrobe_user` / `wardrobe123`

⚠️ **Change these passwords in production!**

## Step 4: Deploy Application

Update the Ansible playbook with S3 bucket name:

```bash
# Get S3 bucket name
S3_BUCKET=$(terraform -chdir=terraform output -raw s3_bucket_name)

# Deploy application
ansible-playbook -i inventory.ini deploy.yml \
  -e "s3_bucket=$S3_BUCKET" \
  -e "aws_region=ap-south-1"
```

Or edit `ansible/deploy.yml` and set `s3_bucket` variable directly.

## Step 5: Verify Deployment

### Check Application Health

```bash
# Get app IP
APP_IP=$(terraform -chdir=terraform output -raw app_instance_public_ip)

# Test health endpoint
curl http://$APP_IP:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "services": {
    "api": "ok",
    "database": "connected"
  }
}
```

### Check MongoDB Connection

```bash
# SSH into app instance
ssh -i ~/.ssh/devops.pem ubuntu@$APP_IP

# Check PM2 logs
pm2 logs wardrobe-app

# Check if MongoDB is accessible
# (from app instance)
DB_IP=$(terraform -chdir=terraform output -raw db_instance_private_ip)
mongosh "mongodb://wardrobe_user:wardrobe123@$DB_IP:27017/Digital_Wardrobe"
```

## Configuration

### Environment Variables

The application uses these environment variables (set via PM2 ecosystem config):

- `NODE_ENV=production`
- `PORT=3000`
- `MONGODB_URI=mongodb://wardrobe_user:wardrobe123@<db-private-ip>:27017/Digital_Wardrobe`
- `S3_BUCKET=<bucket-name>`
- `AWS_REGION=ap-south-1`

### Security Groups

**App Security Group:**
- Inbound: SSH (22), App Port (3000)
- Outbound: All traffic

**Database Security Group:**
- Inbound: SSH (22), MongoDB (27017) - **only from app security group**
- Outbound: All traffic

### S3 Bucket Configuration

- Private bucket (no public access)
- Versioning enabled
- Files stored under `uploads/` prefix
- IAM role attached to app instance for automatic authentication

## Troubleshooting

### Application Can't Connect to Database

1. **Check security groups:**
   ```bash
   # Verify database security group allows app security group
   aws ec2 describe-security-groups --group-ids <db-sg-id>
   ```

2. **Test connectivity from app instance:**
   ```bash
   ssh -i ~/.ssh/devops.pem ubuntu@<app-ip>
   telnet <db-private-ip> 27017
   ```

3. **Check MongoDB is running:**
   ```bash
   ssh -i ~/.ssh/devops.pem ubuntu@<db-ip>
   sudo systemctl status mongod
   ```

### S3 Upload Fails

1. **Check IAM role:**
   ```bash
   # From app instance
   aws sts get-caller-identity
   ```

2. **Verify bucket name:**
   ```bash
   # Check environment variable
   pm2 env 0 | grep S3_BUCKET
   ```

3. **Test S3 access:**
   ```bash
   aws s3 ls s3://<bucket-name>/
   ```

### MongoDB Authentication Issues

1. **Reset MongoDB users:**
   ```bash
   ssh -i ~/.ssh/devops.pem ubuntu@<db-ip>
   mongosh admin
   # Then run:
   db.createUser({
     user: 'wardrobe_user',
     pwd: 'wardrobe123',
     roles: [{ role: 'readWrite', db: 'Digital_Wardrobe' }]
   })
   ```

## Cost Optimization

- **t3.micro instances**: Free tier eligible (750 hours/month)
- **S3 storage**: ~$0.023/GB/month
- **Data transfer**: Free within same region

Estimated monthly cost (outside free tier):
- 2x t3.micro: ~$15-20/month
- S3 (10GB): ~$0.23/month
- **Total: ~$15-20/month**

## Scaling

### Vertical Scaling
- Increase instance types in `terraform/variables.tf`
- `t3.small`, `t3.medium`, etc.

### Horizontal Scaling
- Add more app instances behind a load balancer
- Use MongoDB replica set for database high availability
- Use S3 CloudFront for CDN

## Backup Strategy

1. **MongoDB backups:**
   ```bash
   # On database instance
   mongodump --out /backup/$(date +%Y%m%d)
   # Upload to S3
   aws s3 sync /backup s3://<bucket-name>/backups/
   ```

2. **S3 versioning:** Already enabled for file recovery

## Security Best Practices

1. **Change default passwords** in `ansible/setup-mongodb.yml`
2. **Use AWS Secrets Manager** for sensitive credentials
3. **Enable MongoDB authentication** (already configured)
4. **Restrict security groups** to specific IPs in production
5. **Enable S3 bucket encryption**
6. **Use VPC** with private subnets for database instance

## Next Steps

- Set up monitoring (CloudWatch, PM2 monitoring)
- Configure domain name and SSL certificate
- Set up automated backups
- Implement CI/CD pipeline
- Add load balancer for high availability

