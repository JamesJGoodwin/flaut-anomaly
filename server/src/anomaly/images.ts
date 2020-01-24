/**
 * Core Modules
 */

import srcset from 'srcset'
import dotenv from 'dotenv'
import puppeteer from 'puppeteer'

dotenv.config()

/**
 * Engine Modules
 */

/**
 * Logic
 */

export async function getPixabayImage(keyword: string, debug = false): Promise<{ image: string | null }> {
    try {
        var browser = await puppeteer.launch({ headless: !debug, args: ['--no-sandbox'] })
    } catch (e) {
        console.log('[Pixabay] Browser launch failed: ')
        console.error(e)
        return { image: null }
    }

    const page = (await browser.pages())[0]

    process.on('unhandledRejection', (reason, p) => {
        console.error('Unhandled Rejection at: Promise', p, 'reason:', reason)
        browser.close()
    })

    const url = `https://safesearch.pixabay.com/photos/search/${keyword}/?cat=buildings&orientation=horizontal`

    /**
     * Переходим из личного кабинета в поисковую выдачу
     */

    await page.goto(url, {
        waitUntil: 'domcontentloaded'
    })

    /**
     * Если на странице есть картинки - выбрать любую случайным образом
     * Предоставить ей класс --anomaly-selected
     */

    const imagesLength = await page.evaluate(() => {
        const photos = document.querySelectorAll('.search_results > .item')

        if (photos.length > 0) {
            photos[Math.floor(Math.random() * photos.length)].className += ' --anomaly_selected'
        }

        return photos.length
    })
    /**
     * Найти ссылку на страницу с изображением
     */
    if (imagesLength > 0) {
        const pageHref = await page.evaluate(() => {
            return document.querySelector('.--anomaly_selected > a').getAttribute('href')
        })

        /**
         * Загружаем картинку с информацией об изображении
         */

        await page.goto(`https://safesearch.pixabay.com/${pageHref}`, { waitUntil: 'domcontentloaded' })

        /**
         * Выбираем ссылку на изображение
         */

        const srcSet = srcset.parse(
            await page.evaluate(() => {
                return document.querySelector('#media_show img[itemprop="contentURL"]').getAttribute('srcset')
            })
        )

        await browser.close()

        const sorted = srcSet.sort((a, b) => b.density - a.density)
        return { image: sorted[0].url }
    } else {
        console.log(`[Pixabay] Failed to fetch image from ${url}`)
        return { image: null }
    }
}

export async function getPexelsImage(keyword: string, debug = false): Promise<{ image: string | null }> {
    try {
        var browser = await puppeteer.launch({ headless: !debug, args: ['--no-sandbox'] })
    } catch (e) {
        console.log('[Pexels] Browser launch failed: ')
        console.error(e)
        return { image: null }
    }

    const page = (await browser.pages())[0]

    process.on('unhandledRejection', (reason, p) => {
        console.error('Unhandled Rejection at: Promise', p, 'reason:', reason)
        browser.close()
    })

    await page.goto(`https://www.pexels.com/search/${keyword}`, { waitUntil: 'domcontentloaded' })

    /**
     * Если на странице есть картинки - выбрать любую случайным образом
     * Предоставить ей класс --anomaly-selected
     */

    const imagesLength = await page.evaluate(() => {
        const photos = document.querySelectorAll('.photo-item')

        if (photos.length > 0) {
            photos[Math.floor(Math.random() * photos.length)].className += ' --anomaly_selected'
        }

        return photos.length
    })

    /**
     * Найти ссылку на картинку на кнопке зарузки изображения
     */

    if (imagesLength > 0) {
        const attr = await page.evaluate(() => {
            return document.querySelector('.--anomaly_selected button[data-photo-id]').getAttribute('data-photo-id')
        })

        await browser.close()
        return { image: `https://images.pexels.com/photos/${attr}/pexels-photo-${attr}.jpeg` }
    }

    await browser.close()

    return { image: null }
}
