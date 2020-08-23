import { TicketParser } from '../../../types'

/**
 * Core Modules
 */

import got from 'got'
import dotenv from 'dotenv'
import Redis from 'ioredis'

const redis = new Redis({
  keyPrefix: 'anomaly_'
})

dotenv.config()

/**
 * Engine Modules
 */

import { setEntryStatus } from './db'
import { getWallUploadServer, uploadPhoto, SaveWallPhoto, wallPost } from './vkCalls'

/**
 * Logic
 */

export const createVkPost = async (
  text: { text: string; link: string },
  data: TicketParser,
  img: string,
  rawTicket: string,
  id: string): Promise<void> => {
  /**
   * Получение сокращённой ссылки на пост
   */
  await setEntryStatus(id, 'processing', 'Создание короткой ссылки...')

  const { shortened }: { shortened: string } = await got.post(`https://${process.env.PRICESDATA_DOMAIN}/api/shortener`, {
    json: {
      url: text.link + '&utm_campaign=anomaly&utm_source=vkontakte&utm_medium=social',
      expiration: data.segments[0].departure.timestamp
    }
  }).json()

  /**
   * Загрузка фото на сервер VK
   */

  await setEntryStatus(id, 'processing', 'Запрос сервера для загрузки изображения в VK...')
  const photoUpload = await getWallUploadServer()
  await setEntryStatus(id, 'processing', 'Загрузка изображения в VK...')
  const { server, photo, hash } = await uploadPhoto(img, photoUpload.response.upload_url)
  await setEntryStatus(id, 'processing', 'Сохранение изображения в группе VK...')
  const savedWallPhoto = await SaveWallPhoto(server, photo[0], hash)
  /**
   * Делаем пост на стене группы
   */

  if (await redis.get(`${data.segments[0].origin.cityCode}_${data.segments[0].destination.cityCode}`) !== null) {
    return await setEntryStatus(id, 'declined', `Направление уже публиковалось за последние сутки`)
  }

  if (await redis.get('posted') !== null) {
    return await setEntryStatus(id, 'declined', 'Слишком рано для нового поста')
  }

  await setEntryStatus(id, 'processing', 'Создание поста в группе...')

  const postText = encodeURIComponent(text.text + '\n\nЗабронировать: ' + shortened + '\n\n')
  await wallPost(postText, savedWallPhoto.response[0].owner_id, savedWallPhoto.response[0].id)

  await redis.set('posted', '', 'EX', 7200)
  await redis.set(`${data.segments[0].origin.cityCode}_${data.segments[0].destination.cityCode}`, '', 'EX', 86_400 * 7)
}