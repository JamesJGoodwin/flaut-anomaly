import { IndexedCities, CityData } from '../../types'

/**
 * Core Modules
 */

import got from 'got'

/**
 * Logic
 */

const citiesIndexedData: IndexedCities = {
    codeIndexed: {},
    pageidIndexed: {}
}
;(async () => {
    const cities: CityData[] = await got('http://api.travelpayouts.com/data/ru/cities.json').json()

    const toPageId = (name: string) =>
        name
            .toLowerCase()
            .replace(/\s|\//g, '-')
            .replace(/\s|-\(.*\)/g, '')
            .replace(/'|\./g, '')

    for (let i = 0; i < cities.length; i++) {
        if (cities[i].name !== null && cities[i].coordinates !== null) {
            citiesIndexedData.codeIndexed[cities[i].code] = cities[i]
            citiesIndexedData.codeIndexed[cities[i].code].page_id = toPageId(cities[i].name_translations.en)
        }
    }

    for (const i in citiesIndexedData.codeIndexed) {
        citiesIndexedData.pageidIndexed[citiesIndexedData.codeIndexed[i].page_id] = citiesIndexedData.codeIndexed[i]
    }
})()

export const getCitiesData = () => citiesIndexedData
