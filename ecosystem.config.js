module.exports = {
    apps: [
        {
            name: 'Anomaly',
            script: './server/build/index.js',
            watch: ['server/build', 'public/bundle'],
            env: {
                NODE_ENV: 'production'
            },
            restart_delay: 172_800_000
        }
    ]
}
