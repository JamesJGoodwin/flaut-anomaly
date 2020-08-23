/**
 * Core Modules
 */

import React, { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Redirect } from 'react-router-dom'

/**
 * Engine Modules
 */

import { sendWebSocketData } from '../../websocket'
import { Loader } from '../../components/loader'
import { stateSelector as authSelector, setAuthenticationChecked } from '../../slices/auth'

import '../../../scss/signin.scss'

/**
 * Logic
 */

export const Authorization = (): JSX.Element => {
  const dispatch = useDispatch()

  const { isAuthChecked, isAuthorized, isAuthenticated } = useSelector(authSelector)

  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')


  useEffect(() => {
    document.body.classList.add('signin')

    if ('jwt' in localStorage) {
      sendWebSocketData({
        type: 'authentication',
        data: {
          jwt: localStorage.getItem('jwt'),
          uuid: localStorage.getItem('uuid')
        }
      })
    } else {
      dispatch(setAuthenticationChecked())
    }

    return () => document.body.classList.remove('signin')
  }, [dispatch])

  const handleAuth = useCallback(() => {
    sendWebSocketData({
      type: 'authorization',
      data: {
        login: login,
        password: password
      }
    })
  }, [login, password])

  return !isAuthChecked
    ? <Loader />
    : isAuthorized && isAuthenticated
      ? <Redirect to="/dashboard" />
      : (
        <form className="form-signin text-center" onSubmit={e => e.preventDefault()}>
          <h1 className="h3 mb-3 font-weight-normal">Авторизуйтесь</h1>
          <label htmlFor="inputLogin" className="sr-only">Имя пользователя</label>
          <input
            value={login}
            type="text"
            id="inputLogin"
            className="form-control"
            placeholder="Имя пользователя"
            required
            autoFocus={true}
            onChange={e => setLogin((e.target as HTMLInputElement).value)}
          />
          <label htmlFor="inputPassword" className="sr-only">Пароль</label>
          <input
            value={password}
            type="password"
            id="inputPassword"
            className="form-control"
            placeholder="Пароль"
            required
            onChange={e => setPassword((e.target as HTMLInputElement).value)}
          />
          <button className="btn btn-lg btn-primary btn-block" type="submit" onClick={handleAuth}>Войти
            </button>
        </form>
      )
}