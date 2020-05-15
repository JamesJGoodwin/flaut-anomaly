/**
 * Core Modules
 */

import { WebSocketTransfer } from '../../types'

import React, { Fragment, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ToastContainer } from 'react-toastify'

import 'react-toastify/dist/ReactToastify.css'

/**
 * Engine Modules
 */

import { init as initWebSocket, sendWebSocketData } from './websocket'
import { Authorization as AuthForm } from './components/auth'
import { Loader } from './components/loader'
import { Dashboard } from './components/dashboard'
import { setAuthenticationChecked, stateSelector } from './slices/auth'

/**
 * Logic
 */

const App = (): JSX.Element => {
    const dispatch = useDispatch()
    const { isAuthChecked, isAuthenticated, isAuthorized } = useSelector(stateSelector)

    useEffect(() => {
        initWebSocket() 
        setTimeout(window.startWebSocket, 100)

        if ('jwt' in localStorage) {
            const initial = setInterval(() => {
                if (window.ws.readyState === 1) {
                    const data: WebSocketTransfer.JWTValidate = {
                        type: 'authentication',
                        data: {
                            jwt: localStorage.getItem('jwt'),
                            uuid: localStorage.getItem('uuid')
                        }
                    }
                   
                    sendWebSocketData(data)

                    clearInterval(initial)
                }
            }, 100)
        } else {
            dispatch(setAuthenticationChecked())
        }
    }, [dispatch])

    return (
        <Fragment>
            {!isAuthChecked
                ? <Loader />
                : isAuthorized && isAuthenticated
                    ? <Dashboard />
                    : <AuthForm />
            }
            <ToastContainer />
        </Fragment>
    )
}

export default App