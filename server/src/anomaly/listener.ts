/**
 * Core Modules
 */

import url from 'url'
import got from 'got'
import Redis from 'ioredis'
import dotenv from 'dotenv'
import readline from 'readline'

const login = require('facebook-chat-api') // eslint-disable-line

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

/**
 * Engine modules
 */

/**
 * Logic
 */

dotenv.config()

const redis = new Redis({
    keyPrefix: 'anomaly_'
})

export async function initFacebookListener(handler: NodeJS.EventEmitter): Promise<void> {
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
                    if (err.error.startsWith('Error retrieving userID. This can be caused by a lot of things')) {
                        await redis.del(facebookAppstateCacheKey)
                        console.log('[LOGIN FAIL] Clearing appstate cache...\n')
                        process.exit()
                    }
                    console.error(err)
            }
            return
        }

        api.setOptions({
            listenEvents: true
        })

        await redis.set(facebookAppstateCacheKey, JSON.stringify(api.getAppState()), 'EX', 86400 * 90)

        console.log('Facebook listener is up and running...')

        api.listenMqtt(async (err: any, event: any) => {
            if (err) return console.error(err)

            if (event.type !== 'message' || 'attachments' in event === false) return
            if (event.attachments[0].source !== 'Aviasales Бот-аномальных цен') return
            /** Автоматическое удаление файлов */
            /*fs.readdirSync(path.join(__dirname, '../../../images/')).forEach(val => {
                if (val.endsWith('.png')) {
                    const file = path.join(__dirname, '../../../images/' + val)
                    const mtime = fs.statSync(file).mtime

                    if (Math.round(new Date().valueOf() / 1000) - Math.round(mtime.valueOf() / 1000) > 3600) {
                        fs.unlinkSync(file)
                    }
                }
            })*/

            let ticketLink = ''

            try {
                for (const callToAction of event.attachments[0].target.call_to_actions) {
                    if (callToAction.title === 'Показать билет') {
                        let aviasalesTracker = ''

                        for (const [k, v] of new URLSearchParams(url.parse(callToAction.action_link).search)) {
                            if (k === 'u') aviasalesTracker = v
                        }

                        const { headers, ...res } = await got(aviasalesTracker, {
                            followRedirect: false,
                            headers: {
                                'user-agent': `Hello, Aviasales developers. I am friendly bot from Flaut.ru. Please don't block me, okay?`
                            }
                        })

                        if (!headers.location.startsWith('https://hydra.aviasales.ru')) {
                            return console.error(`Failed to parse URL from tracker; Code: ${res.statusCode}, headers: ${headers}`)
                        }

                        for (const [k, v] of new URLSearchParams(url.parse(headers.location).search)) {
                            if (k === 't') ticketLink = v
                        }
                    }
                }
            } catch (e) {
                console.error(e)
                return
            }

            if (ticketLink.length === 0) return

            handler.emit('message', ticketLink)
        })
    })
}