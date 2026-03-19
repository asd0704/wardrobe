# Deployment Troubleshooting Guide

## Issue: Unable to Sign In or Create Account on AWS Instance

This guide helps troubleshoot authentication issues after deploying to AWS.

## Common Causes

### 1. MongoDB Atlas Network Access

**Problem**: MongoDB Atlas may be blocking connections from your AWS instance.

**Solution**:
1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Go to **Network Access** in the left sidebar
3. Click **Add IP Address**
4. For testing, add `0.0.0.0/0` to allow connections from anywhere (⚠️ Not recommended for production)
5. For production, add your AWS instance's public IP address
6. Wait 1-2 minutes for changes to take effect

**To find your AWS instance IP**:
```bash
# From your local machine, after Terraform deployment
terraform output
# Or check the AWS console for the instance's public IP
```

### 2. Environment Variables Not Set

**Problem**: The application isn't reading the MongoDB connection string.

**Check**:
```bash
# SSH into your AWS instance
ssh -i ~/.ssh/devops.pem ubuntu@<your-aws-ip>

# Check PM2 process environment
pm2 env 0

# Check if MONGODB_URI is set
pm2 describe wardrobe-app | grep MONGODB_URI
```

**Fix**: Re-run the Ansible playbook to ensure environment variables are set:
```bash
ansible-playbook -i ansible/inventory.ini ansible/deploy.yml
```

### 3. Application Not Running

**Check application status**:
```bash
# SSH into AWS instance
ssh -i ~/.ssh/devops.pem ubuntu@<your-aws-ip>

# Check PM2 status
pm2 status

# Check application logs
pm2 logs wardrobe-app --lines 100

# Check for errors
pm2 logs wardrobe-app --err --lines 50
```

**Restart the application**:
```bash
pm2 restart wardrobe-app
pm2 save
```

### 4. Database Connection Issues

**Test MongoDB connection**:
```bash
# From AWS instance, test MongoDB connection
curl http://localhost:3000/api/health

# Expected response:
# {
#   "status": "ok",
#   "services": {
#     "api": "ok",
#     "database": "connected"
#   }
# }
```

**If database is disconnected**:
1. Check MongoDB Atlas network access (see #1)
2. Verify the connection string in `ecosystem.config.js`
3. Check PM2 logs for connection errors

### 5. Port Not Accessible

**Check if the application is listening**:
```bash
# On AWS instance
sudo netstat -tlnp | grep 3000
# Or
sudo ss -tlnp | grep 3000
```

**Check security group**:
1. Go to AWS EC2 Console
2. Select your instance
3. Check Security Groups
4. Ensure port 3000 is open for inbound traffic from `0.0.0.0/0` (or your IP)

### 6. Build Errors

**Check build logs**:
```bash
# SSH into AWS instance
cd /home/ubuntu/digital-wardrobe
cat logs/err.log
cat logs/out.log
```

**Common build issues**:
- Missing dependencies: Run `npm install` manually
- Build failures: Check Node.js version (`node --version` should be 20.x)
- Memory issues: Increase instance size or adjust build settings

## Step-by-Step Debugging

### Step 1: Verify Application is Running

```bash
# SSH into AWS instance
ssh -i ~/.ssh/devops.pem ubuntu@<your-aws-ip>

# Check PM2 status
pm2 status

# Should show:
# ┌─────┬──────────────┬─────────────┬─────────┬─────────┬──────────┐
# │ id  │ name         │ status      │ restarts │ uptime  │ memory   │
# ├─────┼──────────────┼─────────────┼─────────┼─────────┼──────────┤
# │ 0   │ wardrobe-app │ online      │ 0       │ 5m      │ 150 MB   │
# └─────┴──────────────┴─────────────┴─────────┴─────────┴──────────┘
```

### Step 2: Check Health Endpoint

```bash
# From AWS instance
curl http://localhost:3000/api/health

# From your local machine (replace with your AWS IP)
curl http://<your-aws-ip>:3000/api/health
```

### Step 3: Check Application Logs

```bash
# Check recent logs
pm2 logs wardrobe-app --lines 50

# Look for:
# - MongoDB connection messages
# - Server startup messages
# - Any error messages
```

### Step 4: Test Authentication Endpoints

```bash
# Test registration endpoint
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# Test login endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Step 5: Verify MongoDB Atlas Access

1. Check MongoDB Atlas dashboard → Network Access
2. Ensure your AWS instance IP is whitelisted
3. Test connection from AWS instance:
```bash
# Install MongoDB shell (if needed)
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-mongosh

# Test connection (replace with your connection string)
mongosh "mongodb+srv://anuj876updon:KUX5YIVuVcyr7QlI@coatcard.fkxlnpr.mongodb.net/Digital_Wardrobe?retryWrites=true&w=majority&appName=Coatcard"
```

## Quick Fixes

### Restart Application
```bash
pm2 restart wardrobe-app
```

### Re-deploy with Ansible
```bash
ansible-playbook -i ansible/inventory.ini ansible/deploy.yml
```

### Check and Fix Environment Variables
```bash
# Edit ecosystem.config.js on AWS instance
nano /home/ubuntu/digital-wardrobe/ecosystem.config.js

# Restart PM2
pm2 restart wardrobe-app --update-env
pm2 save
```

### View Real-time Logs
```bash
pm2 logs wardrobe-app
```

## MongoDB Atlas Configuration

### Network Access Setup

1. **Login to MongoDB Atlas**: https://cloud.mongodb.com/
2. **Select your cluster**: Click on your cluster name
3. **Network Access**: Click "Network Access" in the left sidebar
4. **Add IP Address**:
   - For development/testing: Add `0.0.0.0/0` (allows all IPs)
   - For production: Add your AWS instance's public IP
5. **Database Access**: Ensure your database user has proper permissions

### Connection String Format

Your connection string should be in this format:
```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

## Still Having Issues?

1. **Check PM2 logs**: `pm2 logs wardrobe-app --lines 200`
2. **Check system logs**: `journalctl -u pm2-ubuntu -n 100`
3. **Verify security group**: Ensure port 3000 is open
4. **Test from browser**: Navigate to `http://<your-aws-ip>:3000/api/health`
5. **Check MongoDB Atlas logs**: View connection attempts in MongoDB Atlas dashboard

## Contact Information

If you continue to experience issues:
1. Check the PM2 logs for specific error messages
2. Verify MongoDB Atlas network access
3. Ensure all environment variables are set correctly
4. Verify the application build completed successfully

