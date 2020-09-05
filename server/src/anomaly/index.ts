/**
 * Core Modules
 */

import dotenv from 'dotenv'
import { EventEmitter } from 'events'
import Redis from 'ioredis'

const redis = new Redis({
    keyPrefix: 'anomaly_'
})

dotenv.config()

/**
 * Engine Modules
 */

import { createVkPost } from './vk'
import { parseTicketLink, getAvaragePrice, declOfNum, genText } from '../functions'
import { initFacebookListener } from './listener'
import { createHistoricalEntry, setEntryStatus, getImages } from './db'
import { getAnomalyPicture } from './screenshot'

/**
 * Logic
 */

const POST_PREVENT_MAX_DAYS = parseInt(process.env.POST_PREVENT_MAX_DAYS)
const POST_PREVENT_MAX_PRICE = parseInt(process.env.POST_PREVENT_MAX_PRICE)

const facebookListener = new EventEmitter()

export const getFacebookListener = (): EventEmitter => facebookListener

export async function initProcessor(): Promise<void> {
    initFacebookListener(facebookListener)

    facebookListener.on('message', async rawStr => {
        const parsed = await parseTicketLink(rawStr)

        if (parsed.result !== 'success') return

        const { id } = await createHistoricalEntry(parsed.data)

        if (await redis.get('posted') !== null) {
            return await setEntryStatus(id, 'declined', 'Слишком рано для нового поста')
        }

        if (await redis.get(`${parsed.data.segments[0].origin.cityCode}_${parsed.data.segments[0].destination.cityCode}`) !== null) {
            return await setEntryStatus(id, 'declined', `Направление уже публиковалось за последние сутки`)
        }

        const images = await getImages(parsed.data.segments[0].destination.cityCode)

        if (images.length === 0) {
            return await setEntryStatus(id, 'declined', `Не загружены изображения города`)
        }

        const image = images.length > 1 ? images[Math.floor(Math.random() * images.length)] : images[0]

        /*setTimeout(async () => {
            await setEntryStatus(id, 'declined', `Таймаут (обработка заняла > 60 секунд)`)
        }, 60_000)*/
        
        const daysFromNow = Math.round((parsed.data.segments[0].departure.timestamp - new Date().valueOf() / 1000) / 60 / 60 / 24)
        
        if (daysFromNow > POST_PREVENT_MAX_DAYS) {
            const daysDiff = daysFromNow - POST_PREVENT_MAX_DAYS
            return await setEntryStatus(id, 'declined', `Дата отправки слишком далеко (+${daysDiff} ${declOfNum(daysDiff, ['день', 'дня', 'дней'])})`)
        }

        if (parsed.data.price > POST_PREVENT_MAX_PRICE) {
            return await setEntryStatus(id, 'declined', `Цена превышает заданный порог (+${parsed.data.price}руб.)`)
        }

        await setEntryStatus(id, 'processing', `Проверка цены...`)

        const avgPrice = await getAvaragePrice(
            parsed.data.segments[0].origin.cityCode,
            parsed.data.segments[0].destination.cityCode,
            parsed.data.segments[0].departure.timestamp
        )

        if (avgPrice.result === 'error') {
            return await setEntryStatus(id, 'failed', `Не удалось получить цену от API`)
        } else {
            if (parsed.data.price > avgPrice.x) {
                return await setEntryStatus(id, 'declined', `Скидочная цена превышает среднюю цену по периоду`)
            }
        }

        await setEntryStatus(id, 'processing', 'Генерируется изображение...')

        let anomalyBase64Screenshot: string

        try {
            anomalyBase64Screenshot = await getAnomalyPicture(rawStr, image.name)
        } catch (e) {
            if (e.message === 'Anomaly image render failed') {
                await setEntryStatus(id, 'failed', 'Chromium не удалось загрузить изображение')
            } else if (e.message === 'You forgot to set process.env.ANOMALY_DOMAIN!') {
                await setEntryStatus(id, 'failed', 'Не установлен process.env.ANOMALY_DOMAIN')
            } else {
                console.error(e)
                await setEntryStatus(id, 'declined', `[${e.name}] ${e.message}`)
            }
        }

        await setEntryStatus(id, 'processing', 'Генерируется текст...')

        let text: { text: string; link: string }

        try {
            text = genText(parsed.data, rawStr, parsed.data.price)
        } catch (e) {
            await setEntryStatus(id, 'failed', `[${e.name}] ${e.message}`)
            return console.error(e)
        }

        try {
            await createVkPost(text, parsed.data, anomalyBase64Screenshot, rawStr, id)
        } catch (e) {
            //await setEntryStatus(id, 'failed', `[${e.name}] ${e.message}`)
            return console.error(e)
        }

        await setEntryStatus(id, 'succeeded', 'Создано')
    })
}
