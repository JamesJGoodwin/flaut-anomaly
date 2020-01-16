import { compileTemplate } from 'pug'
import { WeatherAPI } from '../../../types'

/**
 * Core modules
 */

import got from 'got'
import dotenv from 'dotenv'
import Redis from 'ioredis'
import moment from 'moment'
import { Request } from 'express'

const redis = new Redis()
dotenv.config()

/**
 * Engine modules
 */

import { parseTicketLine } from '../functions'
import { getPixabayImage, getPexelsImage } from './images'

/**
 * Logic
 */

const weatherMonthes = [
    'В январе',
    'В феврале',
    'В марте',
    'В апреле',
    'В мае',
    'В июне',
    'В июле',
    'В августе',
    'В сентябре',
    'В октябре',
    'В ноябре',
    'В декабре'
]

const currencyIconsIndex = {
    rub: 'fas fa-ruble-sign',
    uah: 'fas fa-hryvnia',
    kzt: 'fas fa-tenge',
    usd: 'fas fa-dollar-sign'
}

interface AnomalyRes {
    code: number
    headers: {
        [key: string]: string
    }
    body: string
}

export async function render(anomaly: compileTemplate, req: Request): Promise<AnomalyRes> {
    try {
        // Is ?t not present
        if (!req.query.hasOwnProperty('t')) return { code: 403, headers: {}, body: 'Token is missing' }

        var anomalyData = await parseTicketLine(req.query.t)

        if (anomalyData.result !== 'success') {
            return { code: 500, headers: {}, body: 'An error occured while parsing ?t query' }
        }

        for (let i = 0; i < anomalyData.data.segments.length; i++) {
            anomalyData.data.segments[i].departure.format = moment
                .unix(anomalyData.data.segments[i].departure.timestamp)
                .locale('ru')
                .format('D MMM')
                .replace(/\./g, '')
            anomalyData.data.segments[i].arrival.format = moment
                .unix(anomalyData.data.segments[i].arrival.timestamp)
                .locale('ru')
                .format('D MMM')
                .replace(/\./g, '')
        }

        var imageCacheKey = `anomaly_background_image_${anomalyData.data.segments[0].destination.code}`
        var imageCacheUrl: string | null = await redis.get(imageCacheKey)

        if (imageCacheUrl === null) {
            try {
                anomalyData.data.imageSrc = (await getPixabayImage(anomalyData.data.imageKeyword)).image
            } catch (e) {
                console.log('\x1b[31m%s\x1b[0m', 'Pixabay image download failed, falling back to Pexels method...')
                console.error(e)
            }

            if ('imageSrc' in anomalyData.data === false || anomalyData.data.imageSrc === null) {
                try {
                    anomalyData.data.imageSrc = (await getPexelsImage(anomalyData.data.imageKeyword)).image
                } catch (e) {
                    console.log('\x1b[31m%s\x1b[0m', 'Pexels image download failed as well, shutting down...')
                }
            }

            if ('imageSrc' in anomalyData.data === false || anomalyData.data.imageSrc === null) {
                return { code: 500, headers: {}, body: 'Both image download methods failed' }
            }

            await redis.set(imageCacheKey, anomalyData.data.imageSrc, 'EX', 86400)
        } else {
            anomalyData.data.imageSrc = imageCacheUrl
        }

        if (anomalyData.data.currency !== 'rub') {
            try {
                const currencyRates: { [key: string]: number } = await got(
                    'https://yasen.aviasales.ru/adaptors/currency.json'
                ).json()
                anomalyData.data.price = Math.round(anomalyData.data.price / currencyRates[anomalyData.data.currency])
            } catch (e) {
                console.error(e)
                return {
                    code: 500,
                    headers: {},
                    body: 'Failed to fetch https://yasen.aviasales.ru/adaptors/currency.json'
                }
            }
        }

        try {
            const weatherRes: WeatherAPI = await got(
                `https://api.darksky.net/forecast/${process.env.WEATHER_TOKEN}/${anomalyData.data.segments[0].destination.coordinates.lat},${anomalyData.data.segments[0].destination.coordinates.lon},${anomalyData.data.segments[0].arrival.timestamp}?exclude=currently,flags,hourly`
            ).json()

            const tempCelcius = Math.round(((weatherRes.daily.data[0].temperatureHigh - 32) * 5) / 9)

            var weatherText = `${
                weatherMonthes[new Date(anomalyData.data.segments[0].arrival.timestamp * 1000).getMonth()]
            } ${tempCelcius > 0 ? '+' : ''}${tempCelcius}`
        } catch (e) {
            console.log('\x1b[31m%s\x1b[0m', 'Failed to fetch weather data...')
            console.error(e)
        }

        if (/undefined|NaN/.test(JSON.stringify(anomalyData))) {
            return { code: 500, headers: {}, body: 'anomalyData included undefined or NaN values' }
        }

        return {
            code: 200,
            headers: { 'Content-Type': 'text/html' },
            body: anomaly({
                anomalyData: anomalyData.data,
                weatherText: weatherText,
                now: Math.round(new Date().valueOf() / 1000),
                currencyClass: currencyIconsIndex[anomalyData.data.currency]
            })
        }
    } catch (e) {
        console.error(e)
        return {
            code: 500,
            headers: {},
            body: 'Unknown error occured while generating the page'
        }
    }
}
