/**
 * Core Modules
 */

import fs from 'fs'
import got from 'got'
import path from 'path'
import sharp from 'sharp'
import FormData from 'form-data'

/**
 * Engine Modules
 */

import { GetWallUploadServerResponse, UploadPhotoResponse, SaveWallPhotoResponse } from '../../../types'


/**
 * Logic
 */

class VKError extends Error {
  name = 'VKError'
  stack = (new Error()).stack

  constructor(message?: string) {
    super(message || 'Something unknown went wrong, check logs')
  }
}

export const getWallUploadServer = async (): Promise<GetWallUploadServerResponse> => {
  const domain = process.env.USE_PROXY === 'true' ? process.env.VK_API_PROXY : 'api.vk.com'
  const url = new URL(`https://${domain}/method/photos.getWallUploadServer`)

  url.searchParams.append('access_token', process.env.VK_TOKEN_PHOTOS)
  url.searchParams.append('group_id', process.env.VK_GROUP_ID)
  url.searchParams.append('v', '5.103')

  console.log(url.toString())

  try {
    const res: GetWallUploadServerResponse = await got(url.toString()).json()

    if (res.error || !res.response) throw new VKError(JSON.stringify(res))

    return res
  } catch (e) {
    throw new Error(e)
  }
}

export const uploadPhoto = async (base64: string, url: string): Promise<UploadPhotoResponse> => {
  const dirPath = path.resolve('../../../tmp/')

  if (!fs.existsSync(dirPath)) await fs.promises.mkdir(dirPath)

  const imgPath = path.resolve(dirPath, `${Date.now()}.jpeg`)
  await sharp(Buffer.from(base64, 'base64')).toFile(imgPath)

  const form = new FormData()
  form.append('photo', fs.createReadStream(imgPath))

  const URL = process.env.USE_PROXY === 'true' ? url.replace('pu.vk.com', process.env.VK_PU_PROXY) : url
  const res: UploadPhotoResponse = await got.post(URL, { body: form }).json()

  if (res.photo === null || res.photo === `'[]'` || (Array.isArray(res.photo) && res.photo.length === 0)) {
    throw new VKError('Image was not uploaded to VK servers')
  }

  return res
}

export const SaveWallPhoto = async (server: number, photo: string, hash: string): Promise<SaveWallPhotoResponse> => {
  // `photo=${uploadedPhotoResponse.photo}&access_token=${process.env.VK_TOKEN_PHOTOS}&v=5.103`
  const DOMAIN = process.env.USE_PROXY === 'true' ? process.env.VK_API_PROXY : 'api.vk.com'
  const url = new URL(`https://${DOMAIN}/method/photos.saveWallPhoto`)

  url.searchParams.append('group_id', process.env.VK_GROUP_ID)
  url.searchParams.append('server', server.toString())
  url.searchParams.append('hash', hash)
  url.searchParams.append('photo', photo)
  url.searchParams.append('access_token', process.env.VK_TOKEN_PHOTOS)
  url.searchParams.append('v', '5.103')

  const res: SaveWallPhotoResponse = await got(url.toString()).json()

  if (res.error || !res.response) throw new VKError(JSON.stringify(res))

  return res
}

export const wallPost = async (message: string, ownerID: number, id: number): Promise<void> => {
  const DOMAIN = process.env.USE_PROXY === 'true' ? process.env.VK_API_PROXY : 'api.vk.com'
  const url = new URL(`https://${DOMAIN}/method/wall.post`)

  url.searchParams.append('owner_id', `-${process.env.VK_GROUP_ID}`)
  url.searchParams.append('from_group', '1')
  url.searchParams.append('message', message)
  url.searchParams.append('attachments', `photo${ownerID}_${id}`)
  url.searchParams.append('access_token', process.env.VK_TOKEN_STANDALONE)
  url.searchParams.append('v', '5.103')

  await got(url.toString())
}
