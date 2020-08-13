/**
 * Core Modules
 */

import React, { useEffect, useState } from 'react'

/**
 * Engine Modules
 */

import { sendWebSocketData } from '../../websocket'

import '../../../scss/signin.scss'

/**
 * Logic
 */

export const Authorization = (): JSX.Element => {
    const [login, setLogin] = useState('')
    const [password, setPassword] = useState('')

    useEffect(() => {
        document.body.classList.add('signin')

        return () => document.body.classList.remove('signin')
    }, [])

    const handleAuth = () => {
        const data = {
            type: 'authorization',
            data: {
                login: login,
                password: password
            }
        }
    
        sendWebSocketData(data)
    }

    return (
        <form className="form-signin text-center" onSubmit={(e): void => e.preventDefault()}>
            <h1 className="h3 mb-3 font-weight-normal">Sign in please</h1>
            <label htmlFor="inputLogin" className="sr-only">Login</label>
            <input
                onInput={(e): void => setLogin((e.target as HTMLInputElement).value)}
                value={login}
                type="text"
                id="inputLogin"
                className="form-control"
                placeholder="Login"
                required
                autoFocus={true}
                onChange={() => { /** */ }}
            />
            <label htmlFor="inputPassword" className="sr-only">Password</label>
            <input
                onInput={(e): void => setPassword((e.target as HTMLInputElement).value)}
                value={password}
                type="password"
                id="inputPassword"
                className="form-control"
                placeholder="Password"
                required
            />
            <button
                className="btn btn-lg btn-primary btn-block"
                type="submit"
                onClick={() => handleAuth()}
            >
                Sign in
            </button>
        </form>
    )
}