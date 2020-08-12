import { Autocomplete, TicketParser, TicketParserSegment, CityNames, Latest } from '../../types'

/**
 * Core Modules
 */

import got from 'got'
import path from 'path'
import dotenv from 'dotenv'
import moment from 'moment'
import { promises as fs } from 'fs'

dotenv.config()

/**
 * Engine Modules
 */

import { getAllImages, saveImageInDB, deleteImageRecord } from './anomaly/db'

/**
 * Logic
 */

/**
 * Example rawLink string:
 * DP15583521001558361400000155VKOBTS15588816001558890600000150BTSVKO_1b1590e3d7fdb483711474f1f7fcf611_9435
 * Where pattern is: segment_sign_price
 * Segment pattern: [ airline: 2 ][ departure_timestamp: 10 ][ arrival_timestamp: 10 ][ duration: 6 ][ origin: 3 ][ destination: 3 ]
 */

export async function parseTicketLink(rawLink: string): Promise<{ result: 'success' | 'error'; data: TicketParser }> {
  if (!rawLink) return { result: 'error', data: null }

  const segmentsList: TicketParserSegment[] = []

  try {
    const ticketInfo: Array<string> = rawLink.split('_') // [segments, sign, price]

    if (ticketInfo.length < 3) return { result: 'error', data: null }

    const price = parseInt(ticketInfo[2])
    const segmentList = ticketInfo[0]
    const airline = segmentList.substr(0, 2)
    let currency = 'rub'

    const ticketWithoutAirline = segmentList.split(airline)[1]
    // Регулярное выражение для захвата сегментов
    const segmentsRegex = RegExp('([0-9]{26}[A-Z]+)', 'g')
    const segments: Array<string> = [] // ['segment', 'segment', ...]
    let tmp

    while ((tmp = segmentsRegex.exec(ticketWithoutAirline)) !== null) {
      segments.push(tmp[0])
    }
    // Регулярное выражение для захвата городов
    const citiesRegex = RegExp('[A-Z]{3}', 'g')

    for (let i = 0; i < segments.length; i++) {
      const cities: Array<string> = [] // ['KPBSVO', 'SVOLAX', ...]
      const cityNames: CityNames[] = []
      let tmp2

      while ((tmp2 = citiesRegex.exec(segments[i])) !== null) {
        cities.push(tmp2[0])
        let cityData: Autocomplete

        try {
          cityData = await got(`https://${process.env.PRICESDATA_DOMAIN}/api/autocomplete?q=${tmp2[0]}`).json()
        } catch (e) {
          if ('response' in e) {
            console.error(e, e.response.body)
          } else {
            console.error(e)
          }
          return { result: 'error', data: null }
        }

        cityNames.push({
          name: 'city_name' in cityData[0] ? cityData[0].city_name : cityData[0].name,
          cityCode: 'city_code' in cityData[0] ? cityData[0].city_code : cityData[0].code,
          countryCode: cityData[0].country_code,
          coordinates: cityData[0].coordinates
        })
      }
      // Если первый сегмент - запарсить валюту города
      if (i === 0) {
        switch (cityNames[0].countryCode) {
          case 'UA':
            currency = 'uah'
            break
          case 'KZ':
            currency = 'kzt'
            break
          case 'BY':
            currency = 'usd'
            break
        }
      }

      const stops = [...cities]

      stops.pop()
      stops.shift()

      segmentsList.push({
        departure: {
          timestamp: parseInt(segments[i].substring(0, 10))
        },
        arrival: {
          timestamp: parseInt(segments[i].substring(10, 20))
        },
        origin: {
          code: cities[0],
          name: cityNames[0].name,
          cityCode: cityNames[0].cityCode,
          coordinates: cityNames[0].coordinates
        },
        destination: {
          code: cities[cities.length - 1],
          name: cityNames[cities.length - 1].name,
          cityCode: cityNames[cities.length - 1].cityCode,
          coordinates: cityNames[cities.length - 1].coordinates
        },
        duration: parseInt(segments[i].substring(20, 26)),
        stops: stops
      })
    }

    return {
      result: 'success',
      data: {
        segments: segmentsList,
        price: price,
        airline: airline,
        currency: currency,
        rawStr: rawLink
      }
    }
  } catch (e) {
    console.error(e)
    return { result: 'error', data: null }
  }
}

export async function getAvaragePrice(o: string, d: string, period: number,): Promise<{ result: 'success' | 'error'; x?: number }> {
  const url = `https://www.flaut.ru/api/prices/route?origin=${o}&destination=${d}&period=${moment.unix(period).format('YYYY-MM') + '-01'}&oneway=false`

  try {
    const body: Latest = await got(url).json()

    if (body.data.length === 0) return { result: 'error' }

    const sum = body.data.map(val => val.value).reduce((a, b) => a + b)
    return { result: 'success', x: sum / body.data.length }
  } catch (e) {
    if ('response' in e) {
      console.error(url, e.response.body, e)
    } else {
      console.error(url, e)
    }

    return { result: 'error' }
  }
}

export async function checkVKApiAvailability(): Promise<void> {
  got('https://api.vk.com/method/users.get?user_id=1').catch(e => {
    if ((e.message as string).includes('connect ECONNREFUSED')) {
      process.env.USE_PROXY = 'true'
    }
  })
}

export async function checkImagesDatabaseIntegrity(): Promise<void> {
  const images = (await fs.readdir(path.resolve(__dirname, '../../images'))).filter(img => /.(jpe?g|png|webp)$/.test(img))
  const dbEntries = (await getAllImages()).map(entry => entry.name)

  let imagesAddedFromDisk = 0
  let imageRecordsRemovedFromDB = 0
  // check if images on disk exists in database
  images.forEach(img => {
    if (!dbEntries.includes(img)) {
      saveImageInDB(img.split('-')[0], img.split('.')[1])
      imagesAddedFromDisk++
    }
  })
  // check if images in database exists on disk
  dbEntries.forEach(entry => {
    if (!images.includes(entry)) {
      deleteImageRecord(entry)
      imageRecordsRemovedFromDB++
    }
  })

  if (imagesAddedFromDisk > 0) {
    console.log(`\x1b[31m%s\x1b[0m ${imagesAddedFromDisk} images were found on disk and restored in database`, 'Integrity damaged')
  }

  if (imageRecordsRemovedFromDB > 0) {
    console.log(`\x1b[31m%s\x1b[0m ${imageRecordsRemovedFromDB} database records were not confirmed on disk`, 'Integrity damaged')
  }
}

