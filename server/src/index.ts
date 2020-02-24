/**
 * Core Modules
 */

import fs from 'fs'
import pug from 'pug'
import path from 'path'
import express from 'express'

/**
 * Engine Modules
 */

import { render as anomaly } from './anomaly/render'

/**
 * Logic
 */
const anomalyTemplatePath = path.join(__dirname, '../anomaly.pug')

const app = express()

const templates = {
    anomaly: pug.compile(fs.readFileSync(anomalyTemplatePath, { encoding: 'utf-8' }), { filename: anomalyTemplatePath })
}

app.use(express.static('public'))

app.disable('x-powered-by')

app.get('/anomaly/', function(req, res) {
    anomaly(templates.anomaly, req)
        .then(anomalyRes => {
            res.status(anomalyRes.code)
                .set(anomalyRes.headers)
                .send(anomalyRes.body)
        })
        .catch(e => {
            console.error(e)
            res.send(500)
        })
})

app.listen(3000, 'localhost', () => {
    console.log('Express web-server is up and running...')
})
