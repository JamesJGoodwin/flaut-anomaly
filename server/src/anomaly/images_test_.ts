/**
 * Core Modules
 */

/**
 * Engine Modules
 */

import { getPixabayImage, getPexelsImage } from './images'

/**
 * Logic
 */
;(async (): Promise<void> => {
    console.log(await getPixabayImage('Kaliningrad'))
    console.log(await getPexelsImage('Kaliningrad'))
})()
