module.exports = {
    apps: [
        {
            name: 'Anomaly',
            script: './server/build/anomaly/index.js',
            watch: false,
            env: {
                NODE_ENV: 'production'
            }
        },
        {
            name: 'ExpressJS Anomaly',
            script: './server/build/index.js',
            watch: false,
            env: {
                NODE_ENV: 'production'
            }
        }
    ]
}
