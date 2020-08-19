/**
 * Core Modules
 */

import url from 'url'
import got from 'got'
import Redis from 'ioredis'
import dotenv from 'dotenv'
import { EventEmitter } from 'events'
import { sendWebsocketData } from '../websocket'

const login = require('facebook-chat-api') // eslint-disable-line

dotenv.config()

const redis = new Redis({
  keyPrefix: 'anomaly_'
})

// event emitter init
const eventListener = new EventEmitter()

/**
 * Engine modules
 */

/**
 * Logic
 */

export const triggerCodeInput = (code: string): boolean => eventListener.emit('2FA', code)

export const initFacebookListener = async (handler: NodeJS.EventEmitter): Promise<void> => {
  const facebookAppstateCacheKey = 'facebook_appstate'
  const appstate: string | null = await redis.get(facebookAppstateCacheKey)

  const credentials =
    appstate === null
      ? { email: process.env.FB_LOGIN, password: process.env.FB_PASS }
      : { appState: JSON.parse(appstate) }

  login(credentials, async (err: any, api: any) => {
    if (err) {
      sendWebsocketData(JSON.stringify({ type: 'notification', data: 'Facebook login failed' }))

      switch (err.error) {
        case 'login-approval':
          const interval = setInterval(() => {
            sendWebsocketData(JSON.stringify({ type: 'notification', data: '2FA please' }))
          }, 2500)

          const codeEnterCallback = (code: string) => {
            console.log(code)
            err.continue(code)
            clearInterval(interval)
          }

          eventListener.once('2FA', codeEnterCallback)

          break
        default:
          if (err.error.startsWith('Error retrieving userID. This can be caused by a lot of things')) {
            await redis.del(facebookAppstateCacheKey)
            console.log('[LOGIN FAIL] Clearing appstate cache...\n')
            process.exit(1)
          }
          console.error(err)
      }
      return
    }

    sendWebsocketData(JSON.stringify({ type: 'notification', data: 'Facebook login successfull!' }))

    api.setOptions({
      listenEvents: true,
      logLevel: 'silent'
    })

    await redis.set(facebookAppstateCacheKey, JSON.stringify(api.getAppState()), 'EX', 86400 * 90)

    api.listenMqtt(async (err: any, event: any) => {
      if (err) return console.error(err)

      if (event.type !== 'message' || 'attachments' in event === false) return
      if (event.attachments[0].source !== 'Aviasales Бот-аномальных цен') return

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
                'user-agent': `This text needs to be here since CloudFlare does not allow empty User-Agents`
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