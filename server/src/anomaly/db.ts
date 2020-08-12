/**
 * Core Modules
 */

import { TicketParser, AllowedStatuses, HistoryEntry, WebSocketTransfer, ImageRecord } from '../../../types'

import dotenv from 'dotenv'
import { MongoClient } from 'mongodb'



/**
 * Engine Modules
 */

import { sendWebsocketData } from '../websocket'

/**
 * Logic
 */

dotenv.config()

const client = new MongoClient('mongodb://localhost:27017', { useUnifiedTopology: true })

client.connect(e => {
  if (e) {
    console.log('\x1b[31m%s\x1b[0m', 'Database connection failed')
    console.error(e)
  }
})

const db = client.db('anomaly_db')

export async function createHistoricalEntry(data: TicketParser): Promise<{ id: string }> {
  const entry: HistoryEntry = {
    origin: data.segments[0].origin.cityCode,
    destination: data.segments[0].destination.cityCode,
    departureDate: new Date(data.segments[0].departure.timestamp * 1000),
    backDate: new Date(data.segments[data.segments.length - 1].arrival.timestamp * 1000),
    price: data.price,
    fullInfo: data,
    currency: data.currency,
    status: 'processing',
    statusDescription: 'Обработка началась',
    createdAt: new Date()
  }

  entry.id = (await db.collection('history').insertOne(entry)).insertedId
  entry.images = await db.collection('images').findOne({ destination: entry.destination }, { projection: { _id: 0 } })

  sendWebsocketData(
    JSON.stringify({
      type: 'new-entry',
      data: { entry }
    } as WebSocketTransfer.EntryIncoming)
  )

  return { id: entry.id }
}

export async function setEntryStatus(id: string, value: AllowedStatuses, descr?: string): Promise<void> {
  sendWebsocketData(
    JSON.stringify({
      type: 'entry-status-update',
      data: descr ? {
        id: id,
        status: value,
        statusDescription: descr
      } : {
        id: id,
        status: value
      }
    } as WebSocketTransfer.EntryStatusIncoming)
  )

  await db.collection('history').findOneAndUpdate({ id }, { $set: { status: value } })

  if (descr) {
    await db.collection('history').findOneAndUpdate({ id }, { $set: { statusDescription: descr } })
  }
}

export async function getImages(code: string): Promise<ImageRecord[]> {
  return await db.collection('images').find({ destination: code }).toArray()
}

export async function getAllImages(): Promise<ImageRecord[]> {
  return await db.collection('images').find().toArray()
}

export async function saveImageInDB(code: string, ext: string): Promise<ImageRecord> {
  const images = await getImages(code)

  if (images.length < 6) {
    const entry: ImageRecord = {
      name: `${code}-${images.length + 1}.${ext}`,
      destination: code,
      addedAt: new Date()
    }

    entry.id = (await db.collection('images').insertOne(entry)).insertedId
    return entry
  } else {
    const e = new Error('Too much images for this city')
    e.name = 'CityCountErr'

    throw e
  }
}

export async function deleteImageRecord(name: string): Promise<void> {
  await db.collection('images').findOneAndDelete({ name })
}

export async function getRecentEntries(n: number): Promise<HistoryEntry[]> {
  const latest: HistoryEntry[] = await db.collection('history').find().sort({ createdAt: -1 }).limit(n).toArray()

  if (latest.length === 0) return []

  const images: ImageRecord[] = await db.collection('images').find({
    $or: [...new Set(latest.map(x => x.destination))].map(code => { return { destination: code } })
  }).toArray()

  latest.forEach(entry => {
    images.forEach(image => {
      if (!entry.images) entry.images = []

      if (image.destination === entry.destination) {
        entry.images.push(image)
      }
    })
  })

  return latest
}

export async function getUserPassAndUuid(username: string): Promise<null | { password: string; uuid: string }> {
  return await db.collection('users').findOne({ username }, { projection: { password: 1, uuid: 1 } })
}

export async function checkForStuckHistoricalEntries(): Promise<void> {
  const result = await db.collection('history').updateMany({ status: 'processing' }, { $set: { status: 'failed', statusDescription: 'Entry stuck or outdated' } })
  if (result.matchedCount > 0) {
    console.log(`${result.matchedCount} stuck/outdated entries found, ${result.modifiedCount} were fixed`)
  }
}