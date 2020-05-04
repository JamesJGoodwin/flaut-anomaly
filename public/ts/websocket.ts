const onOpen = (): void => (console.log('Websocket connection established!'))

const onMessage = (ev: MessageEvent): void => {
    if (typeof ev.data === 'string') {
        document.dispatchEvent(
            new CustomEvent('WebSocketStringMessage', { detail: ev.data })
        )
    } else {
        console.log(ev.data)
    }
}

const onClose = (): void => {
    console.log('Websocket connection broke! Restoring...')
    setTimeout(window.startWebSocket, 1000)
}

const onError = (ev: Event): void => {
    console.error('Websocket errored: ', ev)
    window.ws.close()
}

export function init(): void {
    window.startWebSocket = function(): void {
        const isDev = ['localhost', '127.0.0.1'].includes(document.location.hostname)
        const proto = document.location.protocol === 'https:' ? 'wss' : 'ws'
        window.ws = new WebSocket(isDev ? 'ws://localhost:8888' : `${proto}://${document.location.hostname}/ws`)

        window.ws.onopen = onOpen
        window.ws.onclose = onClose
        window.ws.onmessage = onMessage
        window.ws.onerror = onError
    }
}

export const sendWebSocketData = (data: string): void => window.ws.send(data)
