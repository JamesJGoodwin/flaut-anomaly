/**
 * Core Modules
 */

import got from 'got'
import puppeteer from 'puppeteer'

/**
 * Engine Modules
 */

/**
 * Logic
 */

export async function getAnomalyPicture(query: string, imageName: string): Promise<string> {
    if (process.env.NODE_ENV !== 'production') {
        const browser = await puppeteer.launch({ args: ['--no-sandbox']})
        const page = (await browser.pages())[0]
        const content = await page.goto(`http://localhost:${process.env.EXPRESS_PORT}/render/?t=${query}&i=${imageName}`, { waitUntil: 'networkidle0' })

        if (content.status() !== 200) {
            throw new Error('Anomaly image render failed')
        }

        await page.setViewport({ width: 1200, height: 1200 })
        return await page.screenshot({ encoding: 'base64' })
    } else {
        if (!process.env.ANOMALY_DOMAIN) {
            throw new Error('You forgot to set process.env.ANOMALY_DOMAIN!')
        }

        const res = await got(`http://service.prerender.cloud/screenshot/${process.env.ANOMALY_DOMAIN}/render/?t=${query}&i=${imageName}`, {
            headers: {
                'Prerender-Device-Width': '1200',
                'Prerender-Device-Height': '1200'
            }
        })

        return res.rawBody.toString('base64')
    }
}
