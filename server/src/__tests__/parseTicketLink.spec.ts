import { parseTicketLink } from '../functions'
import { TicketParser } from '../../../types'

const link = 'DP15583521001558361400000155VKOBTS15588816001558890600000150BTSVKO_1b1590e3d7fdb483711474f1f7fcf611_9435'

const faultyResult: { result: 'error'; data: null } = { result: 'error', data: null }

const successfullResult: { result: 'success' | 'error'; data: TicketParser } = {
    result: 'success',
    data: {
        segments: [{
            departure: {
                timestamp: 1558352100
            },
            arrival: {
                timestamp: 1558361400
            },
            origin: {
                code: 'VKO',
                name: 'Москва',
                cityCode: 'MOW',
                coordinates: {
                    lon: 37.2921,
                    lat: 55.60315
                }
            },
            destination: {
                code: 'BTS',
                name: 'Братислава',
                cityCode: 'BTS',
                coordinates: {
                    lon: 17.21,
                    lat: 48.17
                }
            },
            duration: 155,
            stops: []
        }, {
            departure: {
                timestamp: 1558881600
            },
            arrival: {
                timestamp: 1558890600
            },
            origin: {
                code: 'BTS',
                name: 'Братислава',
                cityCode: 'BTS',
                coordinates: {
                    lon: 17.21,
                    lat: 48.17
                }
            },
            destination: {
                code: 'VKO',
                name: 'Москва',
                cityCode: 'MOW',
                coordinates: {
                    lon: 37.2921,
                    lat: 55.60315
                }
            },
            duration: 150,
            stops: []
        }],
        price: 9435,
        airline: 'DP',
        currency: 'rub',
        rawStr: link
    }
}

export const getSuccessfullObj = (): { result: 'success' | 'error'; data: TicketParser } => successfullResult

describe('tests', function() {
    it('should parse link normaly', async done => {
        expect(await parseTicketLink(link)).toMatchObject(successfullResult)
        done()
    }, 10_000)

    it('should return empty data on incomplete string', async done => {
        const linkWithoutPrice = link.split('_').splice(0, 2).join('_')
        expect(await parseTicketLink(linkWithoutPrice)).toMatchObject(faultyResult)
        done()
    }, 10_000)

    it('should return data on undefined string', async done => {
        expect(await parseTicketLink(undefined)).toMatchObject(faultyResult)
        done()
    }, 10_000)
})