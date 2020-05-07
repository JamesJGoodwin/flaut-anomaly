import {
    TicketParser,
    GetWallUploadServerResponse,
    UploadPhotoResponse,
    SaveWallPhotoResponse
} from '../../../types'

/**
 * Core Modules
 */

import fs from 'fs'
import got from 'got'
import path from 'path'
import dotenv from 'dotenv'
import Redis from 'ioredis'
import moment from 'moment'
import FormData from 'form-data'
import streamBuffers from 'stream-buffers'

const redis = new Redis({
    keyPrefix: 'anomaly_'
})

dotenv.config()

/**
 * Engine Modules
 */

import { setEntryStatus } from './db'

/**
 * Logic
 */

const utm = '&utm_campaign=anomaly&utm_source=vkontakte&utm_medium=social'
const cases = JSON.parse(fs.readFileSync(path.join(__dirname, '../../cases.json'), { encoding: 'utf-8' }))

export async function vk(text: { text: string; link: string }, data: TicketParser, img: string, rawTicket: string, id: number): Promise<void> {
    /**
     * Получение сокращённой ссылки на пост
     */
    await setEntryStatus(id, 'processing', 'Создание короткой ссылки...')

    const shortenedRes: { shortened: string } = await got.post(`https://${process.env.PRICESDATA_DOMAIN}/api/shortener`, {
        json: {
            url: text.link + utm,
            expiration: data.segments[0].departure.timestamp
        }
    }).json()

    const shortened = shortenedRes.shortened

    /**
     * Загружаем фотографию на сервера VK.com
     */
    await setEntryStatus(id, 'processing', 'Загрузка фото в VK...')

    const photoUpload: GetWallUploadServerResponse = await got(`https://api.vk.com/method/photos.getWallUploadServer?access_token=${process.env.VK_TOKEN_PHOTOS}&group_id=${process.env.VK_GROUP_ID}&v=5.103`).json()

    if ('error' in photoUpload || 'response' in photoUpload === false) {
        const e = new Error('photos.getWallUploadServer fetch failed: ' + photoUpload)
        e.name = 'VKError'
        throw e
    }
    /**
     * Загрузка фото на сервер VK
     */
    const readableStreamBuffer = new streamBuffers.ReadableStreamBuffer({
        frequency: 10,
        chunkSize: 2048
      })
      
    readableStreamBuffer.put(img, 'utf8')

    const form = new FormData()
    form.append('photo', readableStreamBuffer)

    const uploadedPhotoResponse: UploadPhotoResponse = await got.post(photoUpload.response.upload_url, { body: form }).json()

    if ('error' in uploadedPhotoResponse || uploadedPhotoResponse.photo === null || uploadedPhotoResponse.photo.length === 0) {
        const e = new Error(`Failed to upload photo at ${photoUpload.response.upload_url}`)
        e.name = 'VKError'
        throw e
    }
    /**
     * Сохраняем фотографию в группе ВКонтакте
     */
    const imagePostDataResponse: SaveWallPhotoResponse = await got(`https://api.vk.com/method/photos.saveWallPhoto?group_id=${process.env.VK_GROUP_ID}&server=${uploadedPhotoResponse.server}&hash=${uploadedPhotoResponse.hash}&photo=${uploadedPhotoResponse.photo}&access_token=${process.env.VK_TOKEN_PHOTOS}&v=5.103`).json()

    if ('error' in imagePostDataResponse) {
        const e = new Error(`Failed to fetch photos.saveWallPhoto: ${JSON.stringify(imagePostDataResponse)}`)
        e.name = 'VKError'
        throw e
    }
    /**
     * Делаем пост на стене группы
     */

    if (await redis.get(`${data.segments[0].origin.cityCode}_${data.segments[0].destination.cityCode}`) !== null) {
        return await setEntryStatus(id, 'declined', `Направление уже публиковалось за последние сутки`)
    }

    if (await redis.get('posted') !== null) {
        return await setEntryStatus(id, 'declined', 'Слишком рано для нового поста')
    }
    
    await setEntryStatus(id, 'processing', 'Создание поста в группе...')

    let wallPostUrl = `https://api.vk.com/method/wall.post?owner_id=-${process.env.VK_GROUP_ID}`
        wallPostUrl += `&from_group=1`
        wallPostUrl += `&message=${encodeURIComponent(text.text + '\n\nЗабронировать: ' + shortened + '\n\n')}`
        wallPostUrl += `&attachments=photo${imagePostDataResponse.response[0].owner_id}_${imagePostDataResponse.response[0].id}`
        wallPostUrl += `&access_token=${process.env.VK_TOKEN_STANDALONE}`
        wallPostUrl += `&v=5.103`
    
    await got(wallPostUrl)

    await redis.set('posted', '', 'EX', 7200)
    await redis.set(`${data.segments[0].origin.cityCode}_${data.segments[0].destination.cityCode}`, '', 'EX', 86_400)
}

export function declOfNum(number: number, titles: string[]): string {
    const cases = [2, 0, 1, 1, 1, 2]
    return titles[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]]
}

const currencyToCase = (number: number, txt: string[], cases = [2, 0, 1, 1, 1, 2]): string => {
    return txt[number % 100 > 4 && number % 100 < 20 ? 2 : cases[number % 10 < 5 ? number % 10 : 5]]
}

function currencyToText(num: number, curr: string): string {
    if (curr === 'rub') return currencyToCase(num, ['рубля', 'рубля', 'рублей'])
    if (curr === 'uah') return currencyToCase(num, ['гривны', 'гривны', 'гривен'])
    if (curr === 'kzt') return currencyToCase(num, ['тенге', 'тенге', 'тенге'])
    if (curr === 'usd') return currencyToCase(num, ['доллара', 'доллара', 'долларов'])
}

export function genText(anomaly: TicketParser, t: string, p: number): { text: string; link: string } {
    for (let i = 0; i < anomaly.segments.length; i++) {
        for (const j in cases) {
            if (j === anomaly.segments[i].origin.cityCode) {
                anomaly.segments[i].origin.case = 'из ' + cases[j].cases.ro
            }

            if (j === anomaly.segments[i].destination.cityCode) {
                anomaly.segments[i].destination.case = cases[j].cases.vi
            }
        }
    }

    const tripLength = moment
        .unix(anomaly.segments[1].departure.timestamp)
        .diff(moment.unix(anomaly.segments[0].departure.timestamp), 'days')

    const finalText = `🔥 Специальное предложение! ${anomaly.segments[0].origin.case.replace('из', 'Из')} ${
        anomaly.segments[0].destination.case
    } на ${tripLength} ${declOfNum(tripLength, ['день', 'дня', 'дней'])} за ${anomaly.price} ${currencyToText(anomaly.price, anomaly.currency)}`

    let finalLink = `https://www.flaut.ru/search/${anomaly.segments[0].origin.code}${moment
        .unix(anomaly.segments[0].departure.timestamp)
        .format('DDMM')}${anomaly.segments[0].destination.code}`

    if (anomaly.segments.length > 1) {
        finalLink += moment.unix(anomaly.segments[1].departure.timestamp).format('DDMM')
    }

    finalLink += `1?t=${t}&t_currency=${anomaly.currency}&t_original_price=${p}`

    return {
        text: finalText,
        link: finalLink
    }
}
