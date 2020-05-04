/**
 * Core Modules
 */

import { WebSocketTransfer } from '../../types'

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

import { getUserPassAndUuid, getRecentEntries, saveImageInDB, deleteImageRecord } from './anomaly/db'
import { signJwt, verifyJwt } from './jwt'

/**
 * logic
 */

class WebSocketListener extends EventEmitter {}

interface WebSocketWithPing extends WebSocket {
    isAlive?: boolean;
    lastPingpong?: number;
    pingScheduled?: boolean;
}

let eventListener: WebSocketListener | null = null

export function sendWebsocketData(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    eventListener.emit('send', data)
}

export function init(): void {
    const wss = new WebSocket.Server({ port: 8888 })
    eventListener = new WebSocketListener()

    wss.on('connection', (ws: WebSocketWithPing) => { // обработать подключение нового клиента
        eventListener.once('send', (data: string | ArrayBufferLike | Blob | ArrayBufferView): void => {
            ws.send(data)
        })

        ws.on('pong', () => {
            ws.isAlive = true
            ws.lastPingpong = Date.now()
            ws.pingScheduled = false
        })

        ws.on('message', async data => {
            if (typeof data === 'string') {
                const parsed: WebSocketTransfer.ServerIncoming = JSON.parse(data)

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
                            } as WebSocketTransfer.AuthResult)
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
                            } as WebSocketTransfer.AuthResult)
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
                        } as WebSocketTransfer.GiveJWT)
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
                                } as WebSocketTransfer.AuthResult)
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
                                } as WebSocketTransfer.JWTError)
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
                                } as WebSocketTransfer.JWTError)
                            )
                        }
                    }
                } else if (parsed.type === 'latest-entries') {
                    const latest = await getRecentEntries(parsed.data.count || 20)

                    return ws.send(
                        JSON.stringify({
                            type: 'latest-entries',
                            data: latest
                        } as WebSocketTransfer.HistoryEntries)
                    )
                } else if (parsed.type === 'upload-image') {
                    try {
                        const ext = parsed.data.mimeType.replace('image/', '')
                        const image = await saveImageInDB(parsed.data.destinationCode, ext)
                        const filepath = path.resolve(__dirname, '../../images/' + image.name)
                        const thumbPath = path.resolve(__dirname, '../../images/thumbnails/' + image.name)

                        await fs.writeFile(
                            filepath,
                            parsed.data.base64.replace(/^data:image\/(png|webp|jpe?g);base64,/, ''),
                            { encoding: 'base64' }
                        )

                        await sharp(filepath).resize(300).toFile(thumbPath)

                        return ws.send(
                            JSON.stringify({
                                type: 'upload-image',
                                data: {
                                    result: 'success',
                                    image: image
                                }
                            } as WebSocketTransfer.UploadImageResult)
                        )
                    } catch (e) {
                        console.error(e)
                        return ws.send(
                            JSON.stringify({
                                type: 'upload-image',
                                data: {
                                    result: 'error',
                                    reason: `[${e.name}] ${e.message}`
                                }
                            } as WebSocketTransfer.UploadImageResult)
                        )
                    }
                } else if (parsed.type === 'delete-image') {
                    try {
                        await fs.unlink(path.resolve(__dirname, '../../images/' + parsed.data.name))
                        await fs.unlink(path.resolve(__dirname, '../../images/thumbnails/' + parsed.data.name))

                        await deleteImageRecord(parsed.data.name)

                        return ws.send(
                            JSON.stringify({
                                type: 'delete-image',
                                data: {
                                    result: 'success',
                                    name: parsed.data.name
                                }
                            } as WebSocketTransfer.DeleteImageResult)
                        )
                    } catch (e) {
                        console.error(e)
                        return ws.send(
                            JSON.stringify({
                                type: 'delete-image',
                                data: {
                                    result: 'error',
                                    reason: `[${e.name}] ${e.message}`
                                }
                            } as WebSocketTransfer.DeleteImageResult)
                        )
                    }
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
        eventListener.removeListener('send', function() {
            console.log('Websocket no longer listening.')
        })
    })
}
