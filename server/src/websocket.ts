/**
 * Core Modules
 */
import { ImageRecord } from '../../types'

import path from 'path'
import bcrypt from 'bcrypt'
import WebSocket from 'ws'
import { EventEmitter } from 'events'
import { promises as fs } from 'fs'
import sharp from 'sharp'

sharp.cache(false)

/**
 * Engine Modules
 */

import { getUserPassAndUuid, getRecentEntries, deleteImageRecord, getLatestStatistics } from './anomaly/db'
import { signJwt, verifyJwt } from './jwt'
import { triggerCodeInput } from './anomaly/listener'

/**
 * logic
 */


interface WebSocketWithPing extends WebSocket {
  isAlive?: boolean;
  lastPingpong?: number;
  pingScheduled?: boolean;
}

const wss = new WebSocket.Server({ port: 8888 })
const eventListener = new EventEmitter()

export const notifyClientAboutImageUpload = (image: ImageRecord): void => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: 'upload-image',
          data: {
            result: 'success',
            image: image
          }
        })
      )
    }
  })
}

export function sendWebsocketData(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
  eventListener.emit('send', data)
}

export function init(): void {
  eventListener.on('send', (data: string | ArrayBufferLike | Blob | ArrayBufferView): void => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    })
  })

  wss.on('connection', (ws: WebSocketWithPing) => { // обработать подключение нового клиента
    ws.on('pong', () => {
      ws.isAlive = true
      ws.lastPingpong = Date.now()
      ws.pingScheduled = false
    })

    ws.on('message', async data => {
      if (typeof data === 'string') {
        const parsed = JSON.parse(data)

        if (parsed.type === 'authorization') {
          const user = await getUserPassAndUuid(parsed.data.login)

          if (user === null) {
            return ws.send(
              JSON.stringify({
                type: 'authorization',
                data: {
                  result: 'error',
                  reason: `User with name '${parsed.data.login}' is not registered`
                }
              })
            )
          }

          const isPasswordValid = await bcrypt.compare(parsed.data.password, user.password)

          if (!isPasswordValid) {
            return ws.send(
              JSON.stringify({
                type: 'authorization',
                data: {
                  result: 'error',
                  reason: `Wrong password`
                }
              })
            )
          }

          const token = await signJwt({ uuid: user.uuid })

          ws.send(
            JSON.stringify({
              type: 'authorization',
              data: {
                result: 'success',
                payload: {
                  uuid: user.uuid,
                  jwt: token
                }
              }
            })
          )
        } else if (parsed.type === 'authentication') {
          try {
            const { uuid } = (await verifyJwt(parsed.data.jwt) as { uuid: string })

            if (uuid === parsed.data.uuid) {
              return ws.send(
                JSON.stringify({
                  type: 'authentication',
                  data: {
                    result: 'success'
                  }
                })
              )
            }
          } catch (e) {
            if (e.name === 'TokenExpiredError') {
              return ws.send(
                JSON.stringify({
                  type: 'authentication',
                  data: {
                    result: 'error',
                    reason: 'JWT token expired, please sign in'
                  }
                })
              )
            } else {
              console.error(e)

              return ws.send(
                JSON.stringify({
                  type: 'authentication',
                  data: {
                    result: 'error',
                    reason: `[${e.name}] ${e.message}`
                  }
                })
              )
            }
          }
        } else if (parsed.type === 'latest-entries') {
          const latest = await getRecentEntries(parsed.data.count || 20, parsed.data.skip || 0)

          return ws.send(
            JSON.stringify({
              type: 'latest-entries',
              data: latest
            })
          )
        } else if (parsed.type === 'delete-image') {
          try {
            await fs.unlink(path.resolve(__dirname, '../../images/' + parsed.data.name))
            await fs.unlink(path.resolve(__dirname, '../../images/thumbnails/' + parsed.data.name))

            await deleteImageRecord(parsed.data.name)

            wss.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(
                  JSON.stringify({
                    type: 'delete-image',
                    data: {
                      result: 'success',
                      name: parsed.data.name
                    }
                  })
                )
              }
            })
          } catch (e) {
            console.error(e)
            return ws.send(
              JSON.stringify({
                type: 'delete-image',
                data: {
                  result: 'error',
                  reason: `[${e.name}] ${e.message}`
                }
              })
            )
          }
        } else if (parsed.type === 'server-2fa') {
          triggerCodeInput(parsed.data.code)
        } else if (parsed.type === 'dashboard-statistics') {
          const periods = { day: 86400, week: 86400 * 7, month: 86400 * 30 }
          const data = await getLatestStatistics(new Date(Date.now() - periods[parsed.data.period] * 1000))

          return ws.send(
            JSON.stringify({ type: 'dashboard-statistics', data })
          )
        } else {
          console.log('Received unknown websocket message: ', parsed)
        }
      }
    })
  })

  const pingpong = setInterval(() => {
    wss.clients.forEach((ws: WebSocketWithPing) => {
      if (!ws.pingScheduled) {
        if (ws.isAlive === false) return ws.terminate()

        ws.pingScheduled = true

        const TIMEOUT = 'lastPingpong' in ws ? ws.lastPingpong + 30_000 - Date.now() : 25_000

        setTimeout(() => {
          ws.isAlive = false
          ws.lastPingpong = Date.now()
          ws.ping()
        }, TIMEOUT)
      }
    })
  }, 5_000)

  wss.on('close', () => {
    clearInterval(pingpong)
    eventListener.removeListener('send', function () {
      console.log('Websocket no longer listening.')
    })
  })
}
