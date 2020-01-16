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
    console.log(await getPixabayImage('moscow', true))
    console.log(await getPexelsImage('moscow', true))
})()
