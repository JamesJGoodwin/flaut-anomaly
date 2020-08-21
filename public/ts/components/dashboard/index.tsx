/**
 * Core Modules
 */

import React, { useEffect, Fragment, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHistory, faBell as fasBell } from '@fortawesome/free-solid-svg-icons'
import { faBell, faUser } from '@fortawesome/free-regular-svg-icons'
import { roundArrow } from 'tippy.js'
import Tippy from '@tippyjs/react'
import cx from 'classnames'

import 'tippy.js/dist/svg-arrow.css'
import 'tippy.js/themes/light.css'

/**
 * Engine Modules
 */

import { sendWebSocketData } from '../../websocket'
import { Entry as HistoricalEntry } from './historicalEntry'
import { signOut } from '../../slices/auth'
import { stateSelector, clearNotifications } from '../../slices/dashboard'

/**
 * Logic
 */

const LIST_SIZE = 20

export const Dashboard = (): JSX.Element => {
  const dispatch = useDispatch()
  const { latest, notifications } = useSelector(stateSelector)

  const [code, setCode] = useState('')

  const skips = useRef(1)

  useEffect(() => {
    document.body.classList.add('dashboard')

    const onScrollCallback = () => {
      const scrollFromBottom = document.body.scrollHeight - window.scrollY - document.body.clientHeight
      
      if (scrollFromBottom < 400 && !window.awaitingAdditionalLatests) {
        window.awaitingAdditionalLatests = true
        sendWebSocketData({
          type: 'latest-entries',
          data: {
            count: LIST_SIZE,
            skip: LIST_SIZE * skips.current
          }
        })

        skips.current++
      }
    }

    window.addEventListener('scroll', onScrollCallback)

    const data = {
      type: 'latest-entries',
      data: {
        count: LIST_SIZE,
        skip: 0
      }
    }
    sendWebSocketData(data)

    return () => {
      document.body.classList.remove('dashboard')
      window.removeEventListener('scroll', onScrollCallback)
    }
  }, [dispatch])

  const handleSignOut = () => {
    localStorage.removeItem('jwt')
    localStorage.removeItem('uuid')

    dispatch(signOut())
  }

  return (
    <Fragment>
      <nav id="top-navigation" className="navbar navbar-dark fixed-top bg-dark flex-md-nowrap p-0 shadow">
        <a className="navbar-brand col-sm-3 col-md-2 mr-0" href="#">Anomaly</a>
        <ul className="navbar-nav px-3 flex-row align-items-center">
          <li className={cx('nav-item', 'notifications', 'mr-5', { '--animate': notifications.length > 0 })}>
            <Tippy
              disabled={notifications.length === 0}
              trigger="click"
              interactive={true}
              arrow={roundArrow}
              theme="light"
              offset={[0, 20]}
              onHidden={() => dispatch(clearNotifications())}
              content={
                <div className="notifications-holder">
                  {notifications.map(x => {
                    if (x === '2FA') {
                      return (
                        <div className="notification two-fa" key={x}>
                          <p className="description">Facebook 2FA confirmation required</p>
                          <form className="form-inline" onSubmit={(e: React.FormEvent) => e.preventDefault()}>
                            <div className="form-group">
                              <label htmlFor="facebook-2fa">Enter your code:</label>
                              <input
                                autoComplete="off"
                                type="text"
                                className="form-control ml-3"
                                id="facebook-2fa"
                                placeholder="XXXXXX"
                                value={code}
                                onChange={(e: React.ChangeEvent) => setCode((e.target as HTMLInputElement).value)}
                              />
                            </div>
                            <button
                              type="submit"
                              className="btn btn-primary ml-3"
                              onClick={() => sendWebSocketData({ type: 'server-2fa', data: { code } })}
                            >Submit</button>
                          </form>
                        </div>
                      )
                    }
                  })}
                </div>
              }
            >
              <span tabIndex={0}>
                <FontAwesomeIcon icon={notifications.length > 0 ? fasBell : faBell} />
              </span>
            </Tippy>
          </li>
          <li className="nav-item text-nowrap sign-out">
            <a className="nav-link" href="#" onClick={() => handleSignOut()}>Выйти</a>
          </li>
        </ul>
      </nav>
      <div className="container-fluid">
        <div className="row">
          <nav className="col-md-2 d-none d-md-block sidebar">
            <div className="sidebar-sticky">
              <ul className="nav flex-column">
                <li className="nav-item --active">
                  <FontAwesomeIcon icon={faHistory} />
                  <a className="nav-link" href="#">История</a>
                </li>
                <li className="nav-item">
                  <FontAwesomeIcon icon={faUser} />
                  <a className="nav-link" href="#">Пользователи</a>
                </li>
              </ul>
            </div>
          </nav>
          <main role="main" className="col-md-9 ml-sm-auto col-lg-10 px-4 bg-light">
            <div className="pt-3 pb-2 mb-3">
              <div className="container-fluid history-holder pt-4">
                {latest.map((val, i) =>
                  <HistoricalEntry
                    key={val._id}
                    i={i}
                    latestLength={latest.length}
                    entry={val}
                  />
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </Fragment>
  )
}
