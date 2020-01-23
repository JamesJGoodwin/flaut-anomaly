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
    console.log(await getPixabayImage('Kazan', true))
    console.log(await getPexelsImage('Moscow', true))
})()
