module.exports = {
  apps: [
    {
      name: 'Anomaly',
      script: './server/build/index.js',
      watch: ['server/build', 'public/bundle'],
      env: {
        NODE_ENV: 'production'
      },
      time: true
    }
  ]
}
