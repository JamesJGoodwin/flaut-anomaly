import { getSuccessfullObj } from './parseTicketLink.spec'
import { createHistoricalEntry, askForConnection } from '../anomaly/db'

const successfullObj = getSuccessfullObj()
const db = askForConnection()

describe('database tests', function() {
    it('should return id', async done => {
        const { id } = await createHistoricalEntry(successfullObj.data)
        expect(typeof id).toBe('number')

        await db.none('DELETE FROM history WHERE id = $1', [id])

        done()
    })
})
