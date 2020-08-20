/**
 * Core Modules
 */
import { PugTemplates } from '../../types'

import fs from 'fs'
import pug from 'pug'
import md5 from 'md5'
import path from 'path'
import sharp from 'sharp'
import multer from 'multer'
import dotenv from 'dotenv'
import express from 'express'
import proxy from 'express-http-proxy'

dotenv.config()
const upload = multer()

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

app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const contentHash = md5(req.file.buffer)
    const name = `${req.body.code}_${contentHash}.webp`
    const imagePath = path.resolve(__dirname, '../../images')
    const thumbnailPath = path.resolve(__dirname, '../../images/thumbnails')

    if (!fs.existsSync(imagePath)) fs.mkdirSync(imagePath)
    if (!fs.existsSync(thumbnailPath)) fs.mkdirSync(thumbnailPath)

    const record = await saveImageInDB(name)

    await sharp(req.file.buffer).toFile(path.resolve(imagePath, name))
    await sharp(req.file.buffer).resize(300).toFile(path.resolve(thumbnailPath, name))
    
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
