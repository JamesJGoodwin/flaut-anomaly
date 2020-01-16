import { TicketParser, AnomalyPictureReturnType } from '../../../types'
import { Browser } from 'puppeteer'

/**
 * Core Modules
 */

import path from 'path'

/**
 * Engine Modules
 */

/**
 * Logic
 */

export async function getAnomalyPicture(browser: Browser, query: string): Promise<AnomalyPictureReturnType> {
    const page = (await browser.pages())[0]

    const response = await page.goto(`http://localhost:3000/anomaly/?t=${query}`, { waitUntil: 'networkidle0' })

    if (response.status() === 200) {
        const anomalyData: TicketParser = await page.evaluate(() => anomalyData)
        const origin = anomalyData.segments[0].origin.code
        const destination = anomalyData.segments[0].destination.code
        const img = path.join(
            __dirname,
            `../../../images/${origin}-${destination}_${Math.round(new Date().valueOf() / 1000)}.png`
        )

        await page.setViewport({ width: 1200, height: 1200 })
        await page.screenshot({ path: img })

        return { imgAddr: img, anomalyData: anomalyData }
    } else {
        const err = await response.text()
        throw new Error(`Failed to fetch /anomaly/?t=${query}: ${err}`)
    }
}
