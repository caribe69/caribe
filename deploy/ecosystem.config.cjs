/* eslint-disable */
// PM2 ecosystem — mantiene el backend corriendo siempre, con auto-restart.
module.exports = {
  apps: [
    {
      name: 'hotel-backend',
      cwd: '/opt/hotel/backend',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/hotel-backend.error.log',
      out_file: '/var/log/hotel-backend.out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
