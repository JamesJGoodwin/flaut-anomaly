/**
 * Core Modules
 */

/**
 * Engine Modules
 */

import { showErrorToast, showSuccessToast } from './components/toast'
import {
  setAuthorizationSucceeded,
  setAuthorizationFailed,
  setAuthenticationFailed,
  setAuthenticationSucceeded
} from './slices/auth'

import {
  setLatest,
  addLatest,
  setEntryStatus,
  addNewImage,
  removeImage,
  addNotification,
  clearNotifications,
  addSomeLatests,
  updateLatestStats
} from './slices/dashboard'


import store from './store'

/**
 * Logic
 */

const newEntrySound = new Audio('/static/notify.mp3')
newEntrySound.volume = 0.20

const onOpen = () => console.log('Websocket connection established!')

const onMessage = (ev: MessageEvent): void => {
  if (typeof ev.data === 'string') {
    const message = JSON.parse(ev.data)
    const state = store.getState()


    if (message.type === 'authorization') {
      if (message.data.result === 'error') {
        showErrorToast(message.data.reason)
        store.dispatch(setAuthorizationFailed())
      } else {
        localStorage.setItem('jwt', message.data.payload.jwt)
        localStorage.setItem('uuid', message.data.payload.uuid)
        showSuccessToast('Authorization successful', 2000)

        setTimeout(() => {
          store.dispatch(setAuthorizationSucceeded())
        }, 2000)
      }
    } else if (message.type === 'authentication') {
      if (message.data.result === 'error') {
        if (message.data.reason === 'JWT token expired, please sign in') {
          localStorage.removeItem('jwt')
        }

        showErrorToast(message.data.reason)
        store.dispatch(setAuthenticationFailed())
      } else {
        store.dispatch(setAuthenticationSucceeded())
      }
    }

    if (state.auth.isAuthenticated && state.auth.isAuthorized) {
      if (message.type === 'upload-image') {
        if (window.awaitingUploadNotification.length > 0) {
          if (message.data.result === 'error') {
            showErrorToast(message.data.reason)
          } else {
            store.dispatch(addNewImage(message.data))
            showSuccessToast(`Image '${message.data.image.name}' uploaded`, 2000)
          }

          window.awaitingUploadNotification.pop()
        }
      } else if (message.type === 'delete-image') {
        if (window.awaitingDeletionNotification) {
          if (message.data.result === 'error') {
            showErrorToast(message.data.reason)
          } else {
            store.dispatch(removeImage(message.data))
            showSuccessToast(`Image ${message.data.name} has been deleted`, 2000)
          }

          delete window.awaitingDeletionNotification
        }
      } else if (message.type === 'latest-entries') {
        if (window.awaitingAdditionalLatests) {
          if (message.data.length === 0) {
            window.awaitingAdditionalLatests = true
          } else {
            store.dispatch(addSomeLatests(message.data))
            window.awaitingAdditionalLatests = false
          }
        } else {
          store.dispatch(setLatest(message.data))
        }
      } else if (message.type === 'new-entry') {
        newEntrySound.play()

        store.dispatch(addLatest(message.data.entry))

        sendWebSocketData({
          type: 'dashboard-statistics',
          data: {
            period: localStorage.getItem('dashboardStatisticsPeriod') || 'week'
          }
        })
      } else if (message.type === 'entry-status-update') {
        store.dispatch(setEntryStatus(message.data))

        sendWebSocketData({
          type: 'dashboard-statistics',
          data: {
            period: localStorage.getItem('dashboardStatisticsPeriod') || 'week'
          }
        })
      } else if (message.type === 'notification') {
        if (message.data === 'Facebook login failed') {
          showErrorToast(message.data)
        }
        if (message.data === 'Facebook login successfull!') {
          showSuccessToast(message.data, 1000)
          store.dispatch(clearNotifications())
        }
        if (message.data === '2FA please') {
          store.dispatch(addNotification('2FA'))
        }
      } else if (message.type === 'dashboard-statistics') {
        store.dispatch(updateLatestStats(message.data))
      }
    }
  } else {
    console.log(ev.data)
  }
}

const onClose = () => {
  console.log('Websocket connection broke! Restoring...')
  setTimeout(window.startWebSocket, 1000)
}

const onError = (ev: Event) => {
  console.error('Websocket errored: ', ev)
  window.ws.close()
}

export function init(): void {
  window.startWebSocket = function (): void {
    const isDev = ['localhost', '127.0.0.1'].includes(document.location.hostname)
    const proto = document.location.protocol === 'https:' ? 'wss' : 'ws'
    window.ws = new WebSocket(isDev ? 'ws://localhost:8888' : `${proto}://${document.location.hostname}/ws`)

    window.ws.onopen = onOpen
    window.ws.onclose = onClose
    window.ws.onmessage = onMessage
    window.ws.onerror = onError
  }
}

export const sendWebSocketData = (data: object): void => window.ws.send(JSON.stringify(data))
