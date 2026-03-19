module.exports = {
  apps: [{
    name: 'wardrobe-app',
    script: 'npm',
    args: 'start',
    cwd: '/home/ubuntu/digital-wardrobe',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://anuj876updon:KUX5YIVuVcyr7QlI@coatcard.fkxlnpr.mongodb.net/Digital_Wardrobe?retryWrites=true&w=majority&appName=Coatcard'
    },
    error_file: '/home/ubuntu/digital-wardrobe/logs/err.log',
    out_file: '/home/ubuntu/digital-wardrobe/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
}

