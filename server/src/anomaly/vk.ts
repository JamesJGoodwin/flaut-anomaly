import {
    TicketParser,
    AnomalyPictureReturnType,
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
import Redis from 'ioredis'
import dotenv from 'dotenv'
import moment from 'moment'
import FormData from 'form-data'

dotenv.config()
const redis = new Redis()

/**
 * Engine Modules
 */

/**
 * Logic
 */

const utm = '&utm_campaign=anomaly&utm_source=vkontakte&utm_medium=social'
const cases = JSON.parse(fs.readFileSync(path.join(__dirname, '../../cases.json'), { encoding: 'utf-8' }))

export async function vk(text: { text: string; link: string }, screenshot: AnomalyPictureReturnType, t: string) {
    /**
     * Получение сокращённой ссылки на пост
     */
    try {
        var shortenedRes: { shortened: string } = await got
            .post(`https://${process.env.PRICESDATA_DOMAIN}/api/shortener`, {
                json: {
                    url: text.link + utm,
                    expiration: screenshot.anomalyData.segments[0].departure.timestamp
                }
            })
            .json()
    } catch (e) {
        throw new Error(e)
    }

    const shortened = shortenedRes.shortened

    /**
     * Загружаем фотографию на сервера VK.com
     */
    try {
        var photoUpload: GetWallUploadServerResponse = await got(
            `https://api.vk.com/method/photos.getWallUploadServer?access_token=${process.env.VK_TOKEN_PHOTOS}&group_id=${process.env.VK_GROUP_ID}&v=8.85`
        ).json()
    } catch (e) {
        throw new Error(e)
    }

    if ('error' in photoUpload || 'response' in photoUpload === false) {
        throw new Error('[VK] photos.getWallUploadServer fetch failed: ' + photoUpload)
    }
    /**
     * Загрузка фото на сервер VK
     */
    try {
        var form = new FormData()
        form.append('photo', fs.createReadStream(screenshot.imgAddr))
        var uploadedPhotoResponse: UploadPhotoResponse = await got
            .post(photoUpload.response.upload_url, {
                body: form
            })
            .json()
    } catch (e) {
        throw new Error(`[VK] Failed to upload photo at ${photoUpload.response.upload_url}`)
    }

    if (
        'error' in uploadedPhotoResponse ||
        uploadedPhotoResponse.photo === null ||
        uploadedPhotoResponse.photo.length === 0
    ) {
        throw new Error(`[VK] Failed to upload photo at ${photoUpload.response.upload_url}`)
    }
    /**
     * Сохраняем фотографию в группе ВКонтакте
     */
    try {
        var imagePostDataResponse: SaveWallPhotoResponse = await got(
            `https://api.vk.com/method/photos.saveWallPhoto?group_id=${process.env.VK_GROUP_ID}&server=${uploadedPhotoResponse.server}&hash=${uploadedPhotoResponse.hash}&photo=${uploadedPhotoResponse.photo}&access_token=${process.env.VK_TOKEN_PHOTOS}&v=8.85`
        ).json()
    } catch (e) {
        throw new Error(`[VK] Failed to fetch photos.saveWallPhoto: ${e}`)
    }

    if ('error' in imagePostDataResponse) {
        throw new Error(`[VK] Failed to fetch photos.saveWallPhoto: ${imagePostDataResponse}`)
    }
    /**
     * Делаем пост на стене группы
     */
    const directionKey = `${screenshot.anomalyData.segments[0].origin.code}_${
        screenshot.anomalyData.segments[screenshot.anomalyData.segments.length - 1].destination.code
    }`
    const direction: string | null = await redis.get(directionKey)
    const cached: string | null = await redis.get('lastVkPost')

    if (cached === null) {
        if (direction === null) {
            try {
                await got(
                    `https://api.vk.com/method/wall.post?owner_id=-${
                        process.env.VK_GROUP_ID
                    }&from_group=1&message=${encodeURIComponent(
                        text.text + '\n\nЗабронировать: ' + shortened + '\n\n'
                    )}&attachments=photo${imagePostDataResponse.response[0].owner_id}_${
                        imagePostDataResponse.response[0].id
                    }&access_token=${process.env.VK_TOKEN_STANDALONE}&v=8.85)`
                )
            } catch (e) {
                throw new Error(e)
            }

            await redis.set('lastVkPost', moment().unix(), 'EX', parseInt(process.env.POST_PREVENT_DIFF) * 60)
            await redis.set(directionKey, 1, 'EX', parseInt(process.env.POST_PREVENT_CACHED_DIRECTIONS))

            console.log(
                '\x1b[32m%s\x1b[0m',
                `[VK][${screenshot.anomalyData.segments[0].origin.code}-${
                    screenshot.anomalyData.segments[screenshot.anomalyData.segments.length - 1].destination.code
                }] Posted!`
            )
        } else {
            console.log('[VK] Posting forbidden due to direction duplicate')
        }
    } else {
        console.log('[VK] Posting forbidden due to recent activity')
    }
}

export function genText(anomaly: TicketParser, t: string, p: number) {
    for (let i = 0; i < anomaly.segments.length; i++) {
        for (let j in cases) {
            if (j === anomaly.segments[i].origin.city_code) {
                anomaly.segments[i].origin.case = 'из ' + cases[j].cases.ro
            }

            if (j === anomaly.segments[i].destination.city_code) {
                anomaly.segments[i].destination.case = cases[j].cases.vi
            }
        }
    }

    let tripLength = moment
        .unix(anomaly.segments[1].departure.timestamp)
        .diff(moment.unix(anomaly.segments[0].departure.timestamp), 'days')

    let finalText = `🔥 Специальное предложение! ${anomaly.segments[0].origin.case.replace('из', 'Из')} ${
        anomaly.segments[0].destination.case
    } на ${tripLength} ${daysCount(tripLength)} за ${anomaly.price} ${currencyToText(anomaly.price, anomaly.currency)}`

    var finalLink = `https://www.flaut.ru/search/${anomaly.segments[0].origin.code}${moment
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

function daysCount(n: number) {
    if (n === 1) return 'день'
    else if (n >= 2 && n <= 4) return 'дня'
    else return 'дней'
}

function currencyToText(num: number, curr: string) {
    const currencyToCase = (number: number, txt: Array<string>, cases = [2, 0, 1, 1, 1, 2]) =>
        txt[number % 100 > 4 && number % 100 < 20 ? 2 : cases[number % 10 < 5 ? number % 10 : 5]]

    switch (curr) {
        case 'rub':
            return currencyToCase(num, ['рубля', 'рубля', 'рублей'])
        case 'uah':
            return currencyToCase(num, ['гривны', 'гривны', 'гривен'])
        case 'kzt':
            return currencyToCase(num, ['тенге', 'тенге', 'тенге'])
        case 'usd':
            return currencyToCase(num, ['доллара', 'доллара', 'долларов'])
    }
}
