/**
 * Core Modules
 */

import React, { useEffect, Fragment, useState, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faHistory,
  faBell as fasBell,
  faCheck as fasCheck,
  faTimes as fasTimes,
  faExclamationTriangle as fasExclamationTriangle
} from '@fortawesome/free-solid-svg-icons'
import { faBell, faUser } from '@fortawesome/free-regular-svg-icons'
import { roundArrow } from 'tippy.js'
import Tippy from '@tippyjs/react'
import cx from 'classnames'
import { useHistory } from 'react-router-dom'

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

type PossiblePeriods = 'day' | 'week' | 'month'

const LIST_SIZE = 20

export const Dashboard = (): JSX.Element => {
  const dispatch = useDispatch()
  const history = useHistory()
  const { latest, notifications, statistics } = useSelector(stateSelector)

  const [code, setCode] = useState('')
  const [statsPeriod, setStatsPeriod] = useState<PossiblePeriods>(localStorage.getItem('dashboardStatisticsPeriod') as PossiblePeriods || 'week')
  const [periodSelectorVisible, setPeriodSelectorVisible] = useState(false)
  const [notifyVisible, setNotifyVisible] = useState(false)

  const skips = useRef(1)
  const isInitialMount = useRef(true)

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

    sendWebSocketData({
      type: 'latest-entries',
      data: {
        count: LIST_SIZE,
        skip: 0
      }
    })

    sendWebSocketData({
      type: 'dashboard-statistics',
      data: {
        period: statsPeriod
      }
    })

    return () => {
      document.body.classList.remove('dashboard')
      window.removeEventListener('scroll', onScrollCallback)
    }
  }, [dispatch])

  useEffect(() => {
    if (isInitialMount.current === true) {
      isInitialMount.current = false
    } else {
      sendWebSocketData({
        type: 'dashboard-statistics',
        data: {
          period: statsPeriod
        }
      })
    }
  }, [statsPeriod])

  const showNotifications = () => setNotifyVisible(true)
  const hideNotification = () => setNotifyVisible(false)

  const handleSignOut = useCallback((e: React.MouseEvent) => {
    e.preventDefault()

    localStorage.removeItem('jwt')
    localStorage.removeItem('uuid')

    history.push('/')

    dispatch(signOut())
  }, [dispatch, history])

  const getStatsLabel = (type: PossiblePeriods) => {
    if (type === 'day') return 'день'
    if (type === 'week') return 'неделю'
    if (type === 'month') return 'месяц'
  }

  const hidePeriodSelector = () => setPeriodSelectorVisible(false)
  const showPeriodSelector = () => setPeriodSelectorVisible(true)

  const setPeriod = (type: PossiblePeriods) => {
    setStatsPeriod(type)
    hidePeriodSelector()
    localStorage.setItem('dashboardStatisticsPeriod', type)
  }

  const submit2FA = useCallback(() => {
    sendWebSocketData({ type: 'server-2fa', data: { code } })
    hideNotification()
  }, [code])

  const typedObjectEntries = Object.entries as <T>(o: T) => [Extract<keyof T, string>, T[keyof T]][]

  return (
    <Fragment>
      <nav id="top-navigation" className="navbar navbar-dark fixed-top bg-dark flex-md-nowrap p-0 shadow">
        <a className="navbar-brand col-sm-3 col-md-2 mr-0" href="#">Anomaly</a>
        <ul className="navbar-nav px-3 flex-row align-items-center">
          <li className={cx('nav-item', 'notifications', 'mr-5', { '--animate': notifications.length > 0 })}>
            <Tippy
              visible={notifyVisible}
              onClickOutside={hideNotification}
              trigger="click"
              interactive={true}
              arrow={roundArrow}
              theme="light"
              offset={[0, 20]}
              onHidden={() => dispatch(clearNotifications())}
              content={
                notifications.length > 0
                  ? (
                    <div className="notifications-holder">
                      {notifications.map(x => {
                        if (x === '2FA') {
                          return (
                            <div className="notification two-fa" key={x}>
                              <p className="description">Необходимо пройти двухфакторную аутентификацию</p>
                              <form className="form-inline" onSubmit={(e: React.FormEvent) => e.preventDefault()}>
                                <div className="form-group">
                                  <label htmlFor="facebook-2fa">Введите код:</label>
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
                                  onClick={submit2FA}
                                >Отправить</button>
                              </form>
                            </div>
                          )
                        }
                      })}
                    </div>
                  ) : (
                    <span className="empty">Когда что-то сломается - тут будут сообщения :)</span>
                  )
              }
            >
              <span tabIndex={0} onClick={notifyVisible ? hideNotification : showNotifications}>
                <FontAwesomeIcon icon={notifications.length > 0 ? fasBell : faBell} />
              </span>
            </Tippy>
          </li>
          <li className="nav-item text-nowrap sign-out">
            <a className="nav-link" href="#" onClick={handleSignOut}>Выйти</a>
          </li>
        </ul>
      </nav>
      <div className="container-fluid">
        <div className="row">
          <nav className="col-md-3 col-lg-2 d-none d-md-block sidebar">
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
              <h6 className="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted">
                Статистика
              </h6>
              <div className="statistics-period-selector">
                <Tippy
                  visible={periodSelectorVisible}
                  onClickOutside={hidePeriodSelector}
                  interactive={true}
                  arrow={roundArrow}
                  theme="light"
                  offset={[0, 20]}
                  duration={300}
                  placement="bottom"
                  content={
                    <div className="dropdown-content">
                      <button className="item" type="button" onClick={() => setPeriod('day')}>День</button>
                      <button className="item" type="button" onClick={() => setPeriod('week')}>Неделя</button>
                      <button className="item" type="button" onClick={() => setPeriod('month')}>Месяц</button>
                    </div>
                  }
                >
                  <button className="dropdown-toggle" onClick={periodSelectorVisible ? hidePeriodSelector : showPeriodSelector}>
                    Статистика за:&nbsp;{getStatsLabel(statsPeriod)}
                  </button>
                </Tippy>
              </div>
              <div className="statistics-holder">
                {typedObjectEntries(statistics).map(([key, value]) =>
                  <StatsCard key={key} _key={key} value={value} />
                )}
              </div>
            </div>
          </nav>
          <main role="main" className="col-md-9 col-lg-10 ml-sm-auto px-4 bg-light">
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

const StatsCard = ({ _key, value }: { _key: 'succeeded' | 'failed' | 'declined', value: number }) => {
  const keyToLabel = (x: typeof _key) => {
    if (x === 'succeeded') return 'Отправлено в группу'
    if (x === 'declined') return 'Не соответствует параметрам'
    if (x === 'failed') return 'Завершилось с ошибкой'
  }

  const keyToIcon = (x: typeof _key) => {
    if (x === 'succeeded') return fasCheck
    if (x === 'declined') return fasTimes
    if (x === 'failed') return fasExclamationTriangle
  }

  return (
    <div className={cx('stats-card', _key)}>
      <div className="content">
        <p>{keyToLabel(_key)}</p>
        <span className="number">{value}</span>
      </div>
      <FontAwesomeIcon icon={keyToIcon(_key)} />
    </div>
  )
}
