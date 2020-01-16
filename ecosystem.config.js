module.exports = {
    apps: [
        {
            name: 'Anomaly',
            script: './server/build/anomaly/index.js',
            watch: ['server/build/anomaly'],
            env: {
                NODE_ENV: 'production'
            }
        },
        {
            name: 'ExpressJS Anomaly',
            script: './server/build/index.js',
            watch: ['server/build'],
            env: {
                NODE_ENV: 'production'
            }
        }
    ]
}
