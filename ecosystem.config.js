module.exports = {
  apps: [
    {
      name: 'Anomaly',
      script: './server/build/index.js',
      watch: ['server/build', 'public/bundle'],
      env: {
        NODE_ENV: 'production'
      },
      cron_restart: '0/3 0 0/1 ? * 2/3 *', // restart every third day starting from monday
      time: true
    }
  ]
}
