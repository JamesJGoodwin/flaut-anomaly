import { compileTemplate } from 'pug'
import { WeatherAPI } from '../../../types'

/**
 * Core modules
 */

import fs from 'fs'
import got from 'got'
import path from 'path'
import dotenv from 'dotenv'
import moment from 'moment'
import { Request } from 'express'

dotenv.config()

/**
 * Engine modules
 */

import { parseTicketLink } from '../functions'

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
    code: number;
    headers: {
        [key: string]: string;
    };
    body: string;
}

export async function render(anomaly: compileTemplate, req: Request): Promise<AnomalyRes> {
    try {
        // Is ?t not present
        if (!req.query.hasOwnProperty('t')) return { code: 403, headers: {}, body: 'Token is missing' }
        if (!req.query.hasOwnProperty('i')) return { code: 403, headers: {}, body: 'Image name is missing' }

        if (!fs.existsSync(path.resolve(__dirname, '../../../images/' + req.query.i))) {
            const errMsg = `Image ${req.query.i} does not exist!`
            console.error(errMsg)
            return { code: 500, headers: {}, body: errMsg }
        }

        const anomalyData = await parseTicketLink(req.query.t as string)

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

        let weatherText = ''

        try {
            const weatherRes: WeatherAPI = await got(
                `https://api.darksky.net/forecast/${process.env.WEATHER_TOKEN}/${anomalyData.data.segments[0].destination.coordinates.lat},${anomalyData.data.segments[0].destination.coordinates.lon},${anomalyData.data.segments[0].arrival.timestamp}?exclude=currently,flags,hourly`
            ).json()

            const tempCelcius = Math.round(((weatherRes.daily.data[0].temperatureHigh - 32) * 5) / 9)

            weatherText = `${
                weatherMonthes[new Date(anomalyData.data.segments[0].arrival.timestamp * 1000).getMonth()]
            } ${tempCelcius > 0 ? '+' : ''}${tempCelcius}`
        } catch (e) {
            console.error('\x1b[31m%s\x1b[0m', 'Failed to fetch weather data...')
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
                imageName: req.query.i,
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
