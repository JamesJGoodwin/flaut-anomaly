/**
 * Core Modules
 */

import fs from 'fs'
import url from 'url'
import got from 'got'
import path from 'path'
import Redis from 'ioredis'
import dotenv from 'dotenv'
import moment from 'moment'
import tunnel from 'tunnel'
import readline from 'readline'
import puppeteer from 'puppeteer'

const login = require('facebook-chat-api')

const redis = new Redis()
dotenv.config()

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

/**
 * Engine Modules
 */

import { getAnomalyPicture } from './screenshot'
import { genText, vk as createVkPost } from './vk'

/**
 * Logic
 */
const proxyAddrs = fs.readFileSync(path.join(__dirname, '../../proxies.txt'), { encoding: 'utf8' }).split('\r\n')

function checkProxy(addr: string): Promise<{ valid: boolean; proxy: string }> {
    return new Promise(resolve => {
        setTimeout(() => resolve({ valid: false, proxy: addr }), 6000)

        got('https://m.vk.com/', {
            agent: tunnel.httpOverHttp({
                proxy: {
                    host: addr.split(':')[0],
                    port: parseInt(addr.split(':')[1])
                }
            }),
            timeout: 5000
        })
            .then(res => {
                if (res.statusCode === 200) {
                    resolve({ valid: true, proxy: addr })
                } else resolve({ valid: false, proxy: addr })
            })
            .catch(() => resolve({ valid: false, proxy: addr }))
    })
}

;(async () => {
    try {
        console.log('[VK] Checking availability of vk.com...')
        await got('https://m.vk.com/')
    } catch (e) {
        if (e.code === 'ECONNREFUSED') {
            console.log('[VK] vk.com is unavailable, searching for a working proxy...')

            const promises = []

            for (let i = 0; i < proxyAddrs.length; i++) {
                promises.push(checkProxy(proxyAddrs[i]))
            }

            const res = await Promise.all(promises)

            for (let i = 0; i < res.length; i++) {
                if (res[i].valid === true) {
                    console.log(`[VK] Found working proxy address: ${res[i].proxy}`)
                    process.env.PROXY_ADDR = res[i].proxy
                    break
                }
            }
        } else {
            return console.error(e)
        }
    }

    if ('PROXY_ADDR' in process.env === false) {
        console.log('\x1b[31m%s\x1b[0m', '[VK] No proxy was found to access vk.com, exiting...')
        process.exit(1)
    }

    const facebookAppstateCacheKey = 'facebook_appstate'
    const appstate: string | null = await redis.get(facebookAppstateCacheKey)

    const credentials =
        appstate === null
            ? { email: process.env.FB_LOGIN, password: process.env.FB_PASS }
            : { appState: JSON.parse(appstate) }

    login(credentials, async (err: any, api: any) => {
        if (err) {
            switch (err.error) {
                case 'login-approval':
                    console.log('Enter code > ')
                    rl.on('line', line => {
                        err.continue(line)
                        rl.close()
                    })
                    break
                default:
                    console.error(err)
            }
            return
        }

        api.setOptions({
            listenEvents: true,
            userAgent:
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.117 Safari/537.36'
        })

        await redis.set(facebookAppstateCacheKey, JSON.stringify(api.getAppState()), 'EX', 86400 * 30)

        api.listenMqtt(async (err: any, event: any) => {
            if (err) return console.error(err)

            if (event.type !== 'message' || 'attachments' in event === false) return
            if (event.attachments[0].source !== 'Aviasales Бот-аномальных цен') return
            /**
             * Автоматическое удаление файлов
             */
            fs.readdirSync(path.join(__dirname, '../../../images/')).forEach(val => {
                const file = path.join(__dirname, '../../../images/' + val)
                const mtime = fs.statSync(file).mtime

                if (Math.round(new Date().valueOf() / 1000) - Math.round(mtime.valueOf() / 1000) > 3600) {
                    fs.unlinkSync(file)
                    console.log(`[GC] File ${val} has been deleted automatically`)
                }
            })

            const lastVkPost: string | null = await redis.get('lastVkPost')

            if (lastVkPost !== null) {
                return console.log('Message declined due to recent activity')
            }

            var ticketLink = ''

            try {
                for (const callToAction of event.attachments[0].target.call_to_actions) {
                    if (callToAction.title === 'Показать билет') {
                        const actionLink = callToAction.action_link
                        const aviasalesLink = url.parse(actionLink).search
                        ticketLink = url
                            .parse(decodeURIComponent(aviasalesLink).split('?u=')[1])
                            .query.split('t=')[1]
                            .split('&')[0]
                    }
                }
            } catch (e) {
                return
            }

            if (ticketLink.length === 0) return
            /**
             * Parse route and dates
             */
            var preventSplitStrings = ticketLink.split('_')
            var preventPrice = preventSplitStrings[2]
            var preventSegments = preventSplitStrings[0]
                .split(preventSplitStrings[0].substring(0, 2))[1]
                .match(/([0-9]{26}[A-Z]+)/g)
            var preventDepartureDate = preventSegments[0].substring(0, 10)
            var preventCities = preventSegments[0].match(/[A-Z]{3}/g)

            try {
                let testPrevent = preventCities[0]
            } catch (e) {
                console.error(preventCities, ticketLink, e)
            }
            /**
             * If date is too far
             */
            if (
                moment.unix(parseInt(preventDepartureDate)).diff(moment(), 'days') >
                parseInt(process.env.POST_PREVENT_MAX_DAYS)
            ) {
                return console.log(
                    `[Anomaly][${preventCities[0]}-${
                        preventCities[preventCities.length - 1]
                    }] Departure date is far than ${process.env.POST_PREVENT_MAX_DAYS} days from now`
                )
            }
            /**
             * Если цена билета слишком большая (см config.json)
             */
            if (preventPrice > process.env.POST_PREVENT_MAX_PRICE) {
                return console.log(
                    `[Anomaly][${preventCities[0]}-${preventCities[preventCities.length - 1]}] Price is higher than ${
                        process.env.POST_PREVENT_MAX_PRICE
                    } rubles`
                )
            }
            /**
             * Запрашиваем информацию по ценам на месяц, в котором планируется совершить вылет
             */
            try {
                var preventPrices = await got(
                    `https://${process.env.PRICESDATA_DOMAIN}/api/prices/route?origin=${preventCities[0]}&destination=${
                        preventCities[preventCities.length - 1]
                    }&period=2019-03-01&oneway=false`
                )
            } catch (e) {
                try {
                    console.log(e.response.body)
                } catch (unused) {
                    console.error(e)
                }
            }

            /**
             * Агрегируем информацию и находим среднюю цену по месяцу
             */
            var preventPricesObj = JSON.parse(preventPrices.body).data
            var preventPricesSum = 0

            for (let i = 0; i < preventPricesObj.length; i++) {
                preventPricesSum = preventPricesSum + parseInt(preventPricesObj[i].value)
            }

            var preventAvgPrice = Math.round(preventPricesSum / preventPricesObj.length)

            /**
             * Если цена билета с учётом скидки больше, чем средняя цена по месяцу
             */
            if (parseInt(preventPrice) > preventAvgPrice) {
                return console.log(
                    `[Anomaly][${preventCities[0]}-${
                        preventCities[preventCities.length - 1]
                    }] Anomaly price is higher than avarage price`
                )
            }
            /**
             * Запускаем Puppeteer и начинаем рендеринг изображения со страницы
             */
            const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })

            try {
                var screenshot = await getAnomalyPicture(browser, ticketLink)
            } catch (e) {
                return console.error(e)
            } finally {
                await browser.close()
            }

            try {
                var text = genText(screenshot.anomalyData, ticketLink, preventPrice)
            } catch (e) {
                return console.error(e)
            }

            try {
                await createVkPost(text, screenshot, ticketLink)
            } catch (e) {
                return console.error(e)
            }
        })
    })
})()
