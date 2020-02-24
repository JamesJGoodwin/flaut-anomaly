/**
 * Core Modules
 */

import fs from 'fs'
import pug from 'pug'
import path from 'path'
import dotenv from 'dotenv'
import express from 'express'

dotenv.config()

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
app.use(express.urlencoded({ extended: true }))

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

app.get('/webhook', (req, res) => {
    let mode = req.query['hub.mode']
    let token = req.query['hub.verify_token']
    let challenge = req.query['hub.challenge']

    if (mode && token) {
        if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) res.send(challenge)
        else res.status(403).end()
    }
})

app.post('/webhook', (req, res) => {
    console.log(req.body)

    res.status(200).send('EVENT_RECEIVED')
})

app.listen(3000, 'localhost', () => console.log('Express web-server is up and running...'))
