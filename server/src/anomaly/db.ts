/**
 * Core Modules
 */

import { TicketParser, AllowedStatuses, HistoryEntry, WebSocketTransfer, ImageRecord } from '../../../types'
import * as pg from 'pg-promise/typescript/pg-subset'

import dotenv from 'dotenv'
import pgpromise from 'pg-promise'

/**
 * Engine Modules
 */

import { sendWebsocketData } from '../websocket'

/**
 * Logic
 */
dotenv.config()
const Postgres = pgpromise()

const db = Postgres(`postgres://${process.env.PG_USER}:${process.env.PG_SECRET}@${process.env.PG_HOST || '127.0.0.1'}:${process.env.PG_PORT || 5432}/${process.env.PG_DB}`)

db.connect()
    .then(obj => obj.done())
    .catch(e => {
        console.log('\x1b[31m%s\x1b[0m', 'Database connection failed')
        console.error(e)
    })

export const askForConnection = (): pgpromise.IDatabase<{}, pg.IClient> => db

export async function createHistoricalEntry(data: TicketParser): Promise<{ id: number }> {
    const result: HistoryEntry = await db.one(
        'INSERT INTO history (origin, destination, there_date, back_date, price, full_info, currency, status, status_descr, added_at) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
        [
            data.segments[0].origin.cityCode,
            data.segments[0].destination.cityCode,
            new Date(data.segments[0].departure.timestamp * 1000),
            new Date(data.segments[data.segments.length - 1].arrival.timestamp * 1000),
            data.price,
            data,
            data.currency,
            'processing',
            'Обработка началась',
            new Date()
        ]
    )

    result.images = await db.any('SELECT * FROM images WHERE destination = $1', [data.segments[0].destination.code])

    sendWebsocketData(
        JSON.stringify({
            type: 'new-entry',
            data: {
                entry: result
            }
        } as WebSocketTransfer.EntryIncoming)
    )

    return { id: result.id }
}

export async function setEntryStatus(id: number, value: AllowedStatuses, descr?: string): Promise<null> {
    sendWebsocketData(
        JSON.stringify({
            type: 'entry-status-update',
            data: descr ? {
                id: id,
                status: value,
                status_descr: descr
            } : {
                id: id,
                status: value
            }
        } as WebSocketTransfer.EntryStatusIncoming)
    )
    
    return await db.none(
        `UPDATE history SET status = $1${descr ? ', status_descr = $3' : ''} WHERE id = $2`,
        descr ? [value, id, descr] : [value, id]
    )
}

export async function getImages(code: string): Promise<ImageRecord[]> {
    return await db.manyOrNone('SELECT * FROM images WHERE destination = $1', [code])
}

export async function saveImageInDB(code: string, ext: string): Promise<ImageRecord> {
    const images = await getImages(code)

    if (images.length < 6) {
        return await db.one('INSERT INTO images (name, destination, added_at) VALUES ($1, $2, $3) RETURNING *',
            [`${code}-${images.length + 1}.${ext}`, code, new Date()]
        )
    } else {
        const e = new Error('Too much images for this city')
        e.name = 'CityCountErr'

        throw e
    }
}

export async function deleteImageRecord(name: string): Promise<void> {
    return await db.none('DELETE FROM images WHERE name = $1', [name])
}

export async function getRecentEntries(n: number): Promise<HistoryEntry[]> {
    const latest: HistoryEntry[] = await db.any('SELECT * FROM history ORDER BY added_at DESC LIMIT $1', [n])
    const imageQueries: Array<Promise<any>> = []

    for (let i = 0; i < latest.length; i++) {
        imageQueries.push(
            db.any('SELECT * FROM images WHERE destination = $1 ORDER BY added_at DESC', [latest[i].destination])
        )
    }

    const images: Array<ImageRecord[]> = await db.tx(t => t.batch(imageQueries))

    for (let i = 0; i < latest.length; i++) {
        latest[i].images = images[i]
    }

    return latest
}

export async function getUserPassAndUuid(username: string): Promise<null | { password: string; uuid: string }> {
    return await db.oneOrNone('SELECT password, uuid FROM users WHERE username = $1', [username])
}