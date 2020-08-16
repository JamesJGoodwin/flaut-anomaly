/**
 * Core Modules
 */
import { PugTemplates } from '../../types'

import fs from 'fs'
import pug from 'pug'
import path from 'path'
import sharp from 'sharp'
import dotenv from 'dotenv'
import shortid from 'shortid'
import express from 'express'
import proxy from 'express-http-proxy'

dotenv.config()

/**
 * Engine Modules
 */

import { render as anomaly } from './anomaly/render'
import { render as dashboard } from './views/dashboard'
import { initProcessor } from './anomaly'
import { init as initWebSocket, notifyClientAboutImageUpload } from './websocket'
import { checkVKApiAvailability, checkImagesDatabaseIntegrity } from './functions'
import { checkForStuckHistoricalEntries, saveImageInDB } from './anomaly/db'

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

app.use(express.json({ limit: '15mb' }))
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

app.post('/upload', async (req, res) => {
  try {
    const [name, base64] = Object.entries(req.body as { [key: string]: string })[0]

    const imageName = `${name}_${shortid.generate()}.webp`
    const imagePath = path.resolve(__dirname, '../../images')
    const thumbnailPath = path.resolve(__dirname, '../../images/thumbnails')

    if (!fs.existsSync(imagePath)) fs.mkdirSync(imagePath)
    if (!fs.existsSync(thumbnailPath)) fs.mkdirSync(thumbnailPath)

    const record = await saveImageInDB(imageName)

    const imageBuff = Buffer.from(base64.split(';base64,')[1], 'base64')
    await sharp(imageBuff).toFile(path.resolve(imagePath, imageName))
    await sharp(imageBuff).resize(300).toFile(path.resolve(thumbnailPath, imageName))

    notifyClientAboutImageUpload(record)

    res.send('OK')
  } catch (e) {
    res.status(500).send(e)
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

console.log('[app] running pre-startup checks...')

checkVKApiAvailability().then(async () => {
  await checkForStuckHistoricalEntries()
  await checkImagesDatabaseIntegrity()
  console.log('[app] \x1b[32m%s\x1b[0m', 'all checks passed, starting express and websocket servers...')
  initWebSocket()
  initProcessor()

  app.listen(parseInt(process.env.EXPRESS_PORT), 'localhost', () => console.log('[app] ready'))
})
