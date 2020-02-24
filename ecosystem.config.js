module.exports = {
    apps: [
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
