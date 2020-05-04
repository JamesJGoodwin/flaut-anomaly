/**
 * Core Modules
 */

import { WebSocketTransfer } from '../../types'

import React, { Component, Fragment } from 'react'
import { ToastContainer, toast } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';

/**
 * Engine Modules
 */

import { init as initWebSocket, sendWebSocketData } from './websocket'
import { Authorization as AuthForm } from './auth'
import { Loader } from './loader'
import { Dashboard } from './dashboard'

/**
 * Logic
 */

 
const showErrorToast = (msg: string): void => {
    toast.error(msg, {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: false,
        progress: undefined
    })
}

const showSuccessToast = (msg: string, duration?: number): void => {
    toast.success(msg, {
        position: 'top-right',
        autoClose: duration ?? 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: false,
        progress: undefined
    })
}

const handleAuth = (login: string, password: string): void => {
    sendWebSocketData(
        JSON.stringify({
            type: 'authorization',
            data: {
                login: login,
                password: password
            }
        } as WebSocketTransfer.AuthLogin)
    )
}

interface AppState {
    isAuthorized: boolean;
    isAuthenticated: boolean;
    isAuthChecked: boolean;
}

export class App extends Component<{}, AppState> {
    constructor(props: {}) {
        super(props)

        this.state = {
            isAuthorized: false,
            isAuthenticated: 'jwt' in localStorage,
            isAuthChecked: false
        }

        this.handleSignOut = this.handleSignOut.bind(this)
    }

    componentDidMount(): void {
        initWebSocket()
        setTimeout(window.startWebSocket, 100)

        document.addEventListener('WebSocketStringMessage', ((e: CustomEvent): void => {
            const message: WebSocketTransfer.ClientIncoming = JSON.parse(e.detail)

            if (message.type === 'authorization') {
                if (message.data.result === 'error') {
                    showErrorToast(message.data.reason)
                } else {
                    localStorage.setItem('jwt', message.data.payload.jwt)
                    localStorage.setItem('uuid', message.data.payload.uuid)
                    showSuccessToast('Authorization successful', 2000)

                    setTimeout(() => {
                        this.setState({
                            isAuthorized: true,
                            isAuthenticated: 'jwt' in localStorage
                        })
                    }, 2000)
                }
            } else if (message.type === 'authentication') {
                if (message.data.result === 'error') {
                    showErrorToast(message.data.reason)
                    this.setState({
                        isAuthChecked: true
                    })
                } else {
                    this.setState({
                        isAuthChecked: true,
                        isAuthorized: true
                    })
                }
            } else if (message.type === 'upload-image') {
                if (message.data.result === 'error') {
                    showErrorToast(message.data.reason)
                } else {
                    showSuccessToast(`Image '${message.data.image.name}' uploaded`)
                }
            } else if (message.type === 'delete-image') {
                if (message.data.result === 'error') {
                    showErrorToast(message.data.reason)
                } else {
                    showSuccessToast(`Image ${message.data.name} has been deleted`)
                }
            }
        }) as EventListener)

        if ('jwt' in localStorage) {
            const initial = setInterval(() => {
                if (window.ws.readyState === 1) {
                    sendWebSocketData(
                        JSON.stringify({
                            type: 'authentication',
                            data: {
                                jwt: localStorage.getItem('jwt'),
                                uuid: localStorage.getItem('uuid')
                            }
                        } as WebSocketTransfer.JWTValidate)
                    )

                    clearInterval(initial)
                }
            }, 100)
        } else {
            this.setState({
                isAuthChecked: true
            })
        }
    }

    handleSignOut(): void {
        localStorage.removeItem('jwt')
        localStorage.removeItem('uuid')

        this.setState({
            isAuthenticated: false,
            isAuthorized: false
        })
    }

    render(): JSX.Element {
        return (
            <Fragment>
                {!this.state.isAuthChecked
                    ? <Loader />
                    : this.state.isAuthorized && this.state.isAuthenticated
                        ? <Dashboard handleSignOut={this.handleSignOut} />
                        : <AuthForm handleAuth={(l: string, p: string): void => handleAuth(l, p)} />
                }
                <ToastContainer />
            </Fragment>
        )
    }
}