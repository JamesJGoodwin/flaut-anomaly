import { Autocomplete, TicketParser, TicketParserSegment, CityNames } from '../../types'

/**
 * Core Modules
 */

import got from 'got'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Engine Modules
 */

import { getCitiesData } from './cities'

const citiesIndexedData = getCitiesData()

/**
 * Logic
 */

/**
 * Example rawLink string:
 * DP15583521001558361400000155VKOBTS15588816001558890600000150BTSVKO_1b1590e3d7fdb483711474f1f7fcf611_9435
 * Where pattern is: segment_sign_price
 * Segment pattern: [ airline: 2 ][ departure_timestamp: 10 ][ arrival_timestamp: 10 ][ duration: 6 ][ origin: 3 ][ destination: 3 ]
 */

export async function parseTicketLine(rawLink: string): Promise<{ result: 'success' | 'error'; data: TicketParser }> {
    var segmentsList: TicketParserSegment[] = []

    try {
        var ticketInfo: Array<string> = rawLink.split('_') // [segments, sign, price]

        var price = parseInt(ticketInfo[2])
        var segmentList = ticketInfo[0]
        var airline = segmentList.substr(0, 2)
        var currency = 'rub'
        var imageKeyword

        var ticketWithoutAirline = segmentList.split(airline)[1]
        // Регулярное выражение для захвата сегментов
        const segmentsRegex = RegExp('([0-9]{26}[A-Z]+)', 'g')
        var segments: Array<string> = [] // ['segment', 'segment', ...]
        var tmp

        while ((tmp = segmentsRegex.exec(ticketWithoutAirline)) !== null) {
            segments.push(tmp[0])
        }
        // Регулярное выражение для захвата городов
        var citiesRegex = RegExp('[A-Z]{3}', 'g')

        for (let i = 0; i < segments.length; i++) {
            const cities: Array<string> = [] // ['KPBSVO', 'SVOLAX', ...]
            const cityNames: CityNames[] = []
            let tmp2

            while ((tmp2 = citiesRegex.exec(segments[i])) !== null) {
                cities.push(tmp2[0])

                try {
                    var cityData: Autocomplete = await got(
                        `https://${process.env.PRICESDATA_DOMAIN}/api/autocomplete?q=${tmp2[0]}`
                    ).json()
                } catch (e) {
                    console.log('\x1b[31m%s\x1b[0m', 'Failed to fetch autocomplete data at parseTicketLine')
                    console.error(e)
                    return { result: 'error', data: null }
                }

                cityNames.push({
                    name: 'city_name' in cityData[0] ? cityData[0].city_name : cityData[0].name,
                    city_code: 'city_code' in cityData[0] ? cityData[0].city_code : cityData[0].code,
                    country_code: cityData[0].country_code,
                    coordinates: cityData[0].coordinates
                })
            }
            // Если первый сегмент - запарсить валюту города
            if (i === 0) {
                switch (cityNames[0].country_code) {
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

                imageKeyword = citiesIndexedData.codeIndexed[cityNames[1].city_code].name_translations.en
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
                    city_code: cityNames[0].city_code,
                    coordinates: cityNames[0].coordinates
                },
                destination: {
                    code: cities[cities.length - 1],
                    name: cityNames[cities.length - 1].name,
                    city_code: cityNames[cities.length - 1].city_code,
                    coordinates: cityNames[cities.length - 1].coordinates
                },
                duration: parseInt(segments[i].substring(20, 26)),
                stops: stops
            })
        }

        var finalData: TicketParser = {
            segments: segmentsList,
            price: price,
            airline: airline,
            currency: currency,
            imageKeyword: imageKeyword
        }

        return { result: 'success', data: finalData }
    } catch (e) {
        console.error(e)
        return { result: 'error', data: null }
    }
}
