/**
 * Core Modules
 */

import path from 'path'
import { readdirSync } from 'fs'

/**
 * Engine Modules
 */

interface FileTypes {
    js: string[];
    css: string[];
}

const fileTypes: FileTypes = {
    js: [],
    css: []
}

const filesPath = 'public/bundle/'
const webpath = '/bundle'
const files = readdirSync(path.resolve(__dirname, '../../' + filesPath))

const allowedFiles = /^(vendors|app)(\.[a-z0-9]{20})?(\.(.{20}))?\.(css|js)$/
const vendorRegexp = /^\/bundle\/vendors.(js|css)$/

for (let i = 0; i < files.length; i++) {
    const period = files[i].lastIndexOf('.')
    const extension = files[i].substring(period + 1)

    if (allowedFiles.test(files[i])) {
        fileTypes[extension].push(`${webpath}/${files[i]}`)
    }
}

fileTypes.js = fileTypes.js.sort(a => {
    if (vendorRegexp.test(a)) {
        return -1
    }
    return 1
})

fileTypes.css = fileTypes.css.sort(a => {
    if (vendorRegexp.test(a)) {
        return -1
    }
    return 1
})

export const getMedia = (): FileTypes => fileTypes