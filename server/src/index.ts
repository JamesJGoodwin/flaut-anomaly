/**
 * Core Modules
 */
import { PugTemplates } from '../../types'

import fs from 'fs'
import pug from 'pug'
import path from 'path'
import dotenv from 'dotenv'
import express from 'express'
import proxy from 'express-http-proxy'

dotenv.config()

/**
 * Engine Modules
 */

import { render as anomaly } from './anomaly/render'
import { render as dashboard } from './views/dashboard'
import { initProcessor } from './anomaly'
import { init as initWebSocket } from './websocket'
import { checkVKApiAvailability, checkImagesDatabaseIntegrity } from './functions'
import { checkForStuckHistoricalEntries } from './anomaly/db'

/**
 * Logic
 */

const pugs: PugTemplates = {}
const templatesPath = path.resolve(__dirname, '../templates')

fs.readdirSync(templatesPath).forEach((file: string): void => {
  if (file.endsWith('.pug')) {
    try {
      const filepath = path.resolve(templatesPath, file)
      pugs[file.split('.pug')[0]] = pug.compile(fs.readFileSync(filepath, { encoding: 'utf-8' }), {
        filename: filepath
      })
    } catch (e) {
      console.error(e)
    }
  }
})

const app = express()

app.use('/proxy', proxy('https://api.vk.com', {
  proxyReqPathResolver: req => req.originalUrl.replace('/proxy/', '')
}))

app.use('/images', express.static('images'))
app.use(express.static('public'))

app.disable('x-powered-by')

app.get('/render', async (req, res) => {
  try {
    const resp = await anomaly(pugs.anomaly, req)
    res.status(resp.code).set(resp.headers).send(resp.body)
  } catch (e) {
    console.error(e)
    res.send(500)
  }
})

app.get('/', async (req, res) => {
  try {
    const resp = await dashboard(pugs.dashboard)
    res.send(resp)
  } catch (e) {
    console.error(e)
    res.send(500)
  }
})

app.listen(parseInt(process.env.EXPRESS_PORT), 'localhost', () => {
  console.log('Express server is up and running...')
  initWebSocket()
  console.log('Websocket server is up and running...')
  initProcessor()
  // check if vk.com API is available (usefull for development process in Ukraine)
  checkVKApiAvailability()
  // check for stuck historical entries with status "processing"
  checkForStuckHistoricalEntries()
  //
  checkImagesDatabaseIntegrity()
})
