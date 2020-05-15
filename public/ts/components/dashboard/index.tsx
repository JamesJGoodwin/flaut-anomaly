/**
 * Core Modules
 */

import { WebSocketTransfer } from '../../../../types'

import React, { useEffect, Fragment } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHistory } from '@fortawesome/free-solid-svg-icons'

/**
 * Engine Modules
 */

import { sendWebSocketData } from '../../websocket'
import { Entry as HistoricalEntry } from './historicalEntry'
import { signOut } from '../../slices/auth'
import { stateSelector } from '../../slices/dashboard'

/**
 * Logic
 */

const LIST_SIZE = 20

export const Dashboard = (): JSX.Element => {
    const dispatch = useDispatch()
    const { latest } = useSelector(stateSelector)

    useEffect(() => {
        document.body.classList.add('dashboard')
        
        const data: WebSocketTransfer.AskForLatest = {
            type: 'latest-entries',
            data: {
                count: LIST_SIZE
            }
        }
        sendWebSocketData(data)

        return (): void => document.body.classList.remove('dashboard')
    }, [dispatch])

    const handleSignOut = (): void => {
        localStorage.removeItem('jwt')
        localStorage.removeItem('uuid')

        dispatch(signOut())
    }

    return (
        <Fragment>
            <nav className="navbar navbar-dark fixed-top bg-dark flex-md-nowrap p-0 shadow">
                <a className="navbar-brand col-sm-3 col-md-2 mr-0" href="#">Anomaly</a>
                <ul className="navbar-nav px-3">
                    <li className="nav-item text-nowrap">
                        <a className="nav-link" href="#" onClick={(): void => handleSignOut()}>Sign out</a>
                    </li>
                </ul>
            </nav>
            <div className="container-fluid">
                <div className="row">
                    <nav className="col-md-2 d-none d-md-block sidebar">
                        <div className="sidebar-sticky">
                            <ul className="nav flex-column">
                                <li className="nav-item">
                                    <FontAwesomeIcon icon={faHistory} />
                                    <a className="nav-link active" href="#">History</a>
                                </li>
                            </ul>
                        </div>
                    </nav>
                    <main role="main" className="col-md-9 ml-sm-auto col-lg-10 px-4 bg-light">
                        <div className="pt-3 pb-2 mb-3">
                            <h1 className="h2">History</h1>
                            <div className="container-fluid history-holder pt-4">
                                {latest.map((val, i) => 
                                    <HistoricalEntry
                                        key={val.id}
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
