import { createSlice } from '@reduxjs/toolkit'
import { HistoryEntry, WebSocketTransfer } from '../../../types'

import { RootState } from './index'

interface DashboardState {
    latest: HistoryEntry[];
}

const initialState: DashboardState = {
    latest: []
}

const LIST_SIZE = 20

const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        setLatest: (state, { payload }: { payload: HistoryEntry[] }): void => {
            state.latest = payload
        },
        addLatest: (state, { payload }: { payload: HistoryEntry }): void => {
            const newLatest = [...state.latest]

            if (newLatest.length === LIST_SIZE) {
                newLatest.pop()
            }

            newLatest.unshift(payload)

            state.latest = newLatest
        },
        setEntryStatus: (state, { payload }: { payload: WebSocketTransfer.EntryStatusBody }): void => {
            const newEntriesList = [...state.latest]

            for (const x of newEntriesList) {
                if (x.id === payload.id) {
                    x.status = payload.status

                    if (x.status_descr) {
                        x.status_descr = payload.status_descr
                    }
                }
            }

            state.latest = newEntriesList
        },
        addNewImage: (state, { payload }: { payload: WebSocketTransfer.UploadImageBody }): void => {
            const latestCopy = [...state.latest]

            for (const l of latestCopy) {
                if (l.full_info.segments[0].destination.cityCode === payload.image.destination) {
                    l.images.push(payload.image)
                }
            }

            state.latest = latestCopy
        },
        removeImage: (state, { payload }: { payload: WebSocketTransfer.DeleteImageBody }): void => {
            const latestCopy = [...state.latest]
            const dest = payload.name.split('').splice(0, 3).join('')

            for (const l of latestCopy) {
                if (l.destination === dest) {
                    for (let i = 0; i < l.images.length; i++) {
                        if (payload.name === l.images[i].name) {
                            l.images.splice(i, 1)
                        }
                    }
                }
            }

            state.latest = latestCopy
        }
    }
})

export const stateSelector = (state: RootState): DashboardState => state.dashboard

export const { setLatest, addLatest, setEntryStatus, addNewImage, removeImage } = dashboardSlice.actions

export default dashboardSlice.reducer