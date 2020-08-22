import { createSlice } from '@reduxjs/toolkit'
import { HistoryEntry, LatestStatsReturnType } from '../../../types'

import { RootState } from './index'

interface DashboardState {
  latest: HistoryEntry[]
  notifications: Array<string>
  statistics: LatestStatsReturnType
}

const initialState: DashboardState = {
  latest: [],
  notifications: [],
  statistics: {
    succeeded: 0,
    failed: 0,
    declined: 0
  }
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
      if (state.latest.length === LIST_SIZE) {
        state.latest.pop()
      }

      state.latest.unshift(payload)
    },
    addSomeLatests: (state, { payload }: { payload: HistoryEntry[] }) => {
      payload.forEach(entry => state.latest.push(entry))
    },
    setEntryStatus: (state, { payload }): void => {
      for (const x of state.latest) {
        if (x._id === payload.id) {
          x.status = payload.status

          if (x.statusDescription) {
            x.statusDescription = payload.statusDescription
          }
        }
      }
    },
    addNewImage: (state, { payload }): void => {
      for (const x of state.latest) {
        if (x.fullInfo.segments[0].destination.cityCode === payload.image.destination) {
          x.images.push(payload.image)
        }
      }
    },
    removeImage: (state, { payload }): void => {
      const dest = payload.name.split('').splice(0, 3).join('')

      for (const x of state.latest) {
        if (x.destination === dest) {
          for (let i = 0; i < x.images.length; i++) {
            if (payload.name === x.images[i].name) {
              x.images.splice(i, 1)
            }
          }
        }
      }
    },
    addNotification: (state, { payload }: { payload: '2FA' }) => {
      if (!state.notifications.includes(payload)) {
        state.notifications.push(payload)
      }
    },
    clearNotifications: state => {
      state.notifications = []
    },
    updateLatestStats: (state, { payload }: { payload: LatestStatsReturnType }) => {
      state.statistics = payload
    }
  }
})

export const stateSelector = (state: RootState): DashboardState => state.dashboard

export const {
  setLatest,
  addLatest,
  addSomeLatests,
  setEntryStatus,
  addNewImage,
  removeImage,
  addNotification,
  clearNotifications,
  updateLatestStats
} = dashboardSlice.actions

export default dashboardSlice.reducer