# How to Check if the Application is Running

## 1. Check Application Health Endpoint

### From Your Local Machine

```bash
# Get the app instance IP from Terraform output
APP_IP=$(terraform -chdir=terraform output -raw app_instance_public_ip)

# Or use the IP directly
curl http://13.235.67.50:3000/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-08T08:30:00.000Z",
  "services": {
    "api": "ok",
    "database": "connected"
  }
}
```

### From Browser

Open in your browser:
```
http://13.235.67.50:3000/api/health
```

## 2. Check PM2 Status (SSH into App Instance)

```bash
# SSH into the app instance
ssh -i ~/.ssh/devops.pem ubuntu@13.235.67.50

# Check PM2 status
pm2 status

# Should show:
# ┌─────┬──────────────┬─────────┬─────────┬──────────┬─────────┐
# │ id  │ name         │ mode    │ ↺       │ status   │ cpu     │
# ├─────┼──────────────┼─────────┼─────────┼──────────┼─────────┤
# │ 0   │ wardrobe-app │ cluster │ 0       │ online   │ 0%      │
# └─────┴──────────────┴─────────┴─────────┴──────────┴─────────┘
```

## 3. Check Application Logs

```bash
# SSH into app instance
ssh -i ~/.ssh/devops.pem ubuntu@13.235.67.50

# View real-time logs
pm2 logs wardrobe-app

# View last 100 lines
pm2 logs wardrobe-app --lines 100

# View only errors
pm2 logs wardrobe-app --err --lines 50

# View log files directly
tail -f /home/ubuntu/digital-wardrobe/logs/out.log
tail -f /home/ubuntu/digital-wardrobe/logs/err.log
```

## 4. Check if Application is Listening on Port 3000

```bash
# SSH into app instance
ssh -i ~/.ssh/devops.pem ubuntu@13.235.67.50

# Check if port 3000 is listening
sudo netstat -tlnp | grep 3000
# Or
sudo ss -tlnp | grep 3000

# Should show:
# tcp  0  0  0.0.0.0:3000  0.0.0.0:*  LISTEN  12345/node
```

## 5. Test Application in Browser

Open your browser and navigate to:
```
http://13.235.67.50:3000
```

You should see the Digital Wardrobe application homepage.

## 6. Test Authentication Endpoints

### Test Registration

```bash
curl -X POST http://13.235.67.50:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "name": "Test User"
  }'
```

### Test Login

```bash
curl -X POST http://13.235.67.50:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456"
  }'
```

## 7. Check MongoDB Connection

```bash
# SSH into app instance
ssh -i ~/.ssh/devops.pem ubuntu@13.235.67.50

# Check MongoDB connection from app instance
# Get database private IP
DB_IP=172.31.15.16

# Test connection
mongosh "mongodb://wardrobe_user:wardrobe123@$DB_IP:27017/Digital_Wardrobe" --eval "db.stats()"
```

## 8. Check S3 Access

```bash
# SSH into app instance
ssh -i ~/.ssh/devops.pem ubuntu@13.235.67.50

# Check if S3 bucket is accessible
aws s3 ls s3://digital-wardrobe-storage-473a3ff6/

# Check IAM role
aws sts get-caller-identity
```

## 9. Check System Resources

```bash
# SSH into app instance
ssh -i ~/.ssh/devops.pem ubuntu@13.235.67.50

# Check CPU and memory usage
htop
# Or
top

# Check disk space
df -h

# Check PM2 memory usage
pm2 monit
```

## 10. Quick Status Check Script

Create a quick script to check everything:

```bash
#!/bin/bash
APP_IP="13.235.67.50"

echo "=== Application Status Check ==="
echo ""

echo "1. Health Endpoint:"
curl -s http://$APP_IP:3000/api/health | jq .
echo ""

echo "2. Application URL:"
echo "http://$APP_IP:3000"
echo ""

echo "3. To check PM2 status, SSH into the instance:"
echo "ssh -i ~/.ssh/devops.pem ubuntu@$APP_IP"
echo "pm2 status"
```

## Common Issues and Solutions

### Application Not Running

```bash
# SSH into app instance
ssh -i ~/.ssh/devops.pem ubuntu@13.235.67.50

# Restart the application
pm2 restart wardrobe-app

# Or restart all PM2 processes
pm2 restart all
```

### Database Connection Failed

Check if MongoDB is running on database instance:
```bash
# SSH into database instance
ssh -i ~/.ssh/devops.pem ubuntu@3.110.114.38

# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo journalctl -u mongod -n 50
```

### Port Not Accessible

Check security group:
```bash
# From AWS Console or CLI
aws ec2 describe-security-groups --group-ids <app-security-group-id>
```

Make sure port 3000 is open for inbound traffic.

## Monitoring Commands

```bash
# Watch PM2 status in real-time
pm2 monit

# Watch application logs
pm2 logs wardrobe-app --lines 0

# Check application metrics
pm2 show wardrobe-app
```

## Access the Application

Once everything is running, access the application at:

**Main URL:**
```
http://13.235.67.50:3000
```

**Health Check:**
```
http://13.235.67.50:3000/api/health
```

**API Endpoints:**
```
http://13.235.67.50:3000/api/auth/register
http://13.235.67.50:3000/api/auth/login
http://13.235.67.50:3000/api/items
http://13.235.67.50:3000/api/users
```

