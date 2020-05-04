/**
 * Core Modules
 */

import pug from 'pug'

/**
 * Engine Module
 */

import { getMedia } from '../media'

/**
 * Logic
 */

export async function render(template: pug.compileTemplate): Promise<string> {
    const media = getMedia()

    return template({
        stylesheets: media.css,
        scripts: media.js
    })
}
