/**
 * Core Modules
 */

import { WebSocketTransfer, HistoryEntry } from '../../../types'

import React, { useEffect, useState, Fragment, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHistory } from '@fortawesome/free-solid-svg-icons'

/**
 * Engine Modules
 */

import { sendWebSocketData } from '../websocket'
import { Entry as HistoricalEntry } from './historicalEntry'

/**
 * Logic
 */

interface Props {
    handleSignOut(): void;
}

const LIST_SIZE = 20

export function Dashboard(props: Props): JSX.Element {
    const [latest, setLatest] = useState<Array<HistoryEntry>>([])
    const audio = new Audio('/static/notify.mp3')
    audio.volume = 0.20

    const wsDataHandler = useCallback((e: CustomEvent) => {
        const message: WebSocketTransfer.DashboardIncoming = JSON.parse(e.detail)

        if (message.type === 'latest-entries') {
            setLatest(message.data)
        } else if (message.type === 'new-entry') {
            audio.play()

            setLatest(prevLatest => {
                const newEntries = [...prevLatest]
                
                if (newEntries.length === LIST_SIZE) {
                    newEntries.pop()
                }

                newEntries.unshift(message.data.entry)

                return newEntries
            })
        } else if (message.type === 'entry-status-update') {
            setLatest(prevLatest => {
                const newEntries = [...prevLatest]

                for (const x of newEntries) {
                    if (x.id === message.data.id) {
                        x.status = message.data.status

                        if (x.status_descr) {
                            x.status_descr = message.data.status_descr
                        }
                        break
                    }
                }

                return newEntries
            })
        }
    }, [])

    useEffect(() => {
        document.body.classList.add('dashboard')

        document.addEventListener('WebSocketStringMessage', wsDataHandler as EventListener)

        sendWebSocketData(
            JSON.stringify({
                type: 'latest-entries',
                data: {
                    count: LIST_SIZE
                }
            } as WebSocketTransfer.AskForLatest)
        )

        return (): void => {
            document.body.classList.remove('dashboard')
            document.removeEventListener('WebSocketStringMessage', wsDataHandler as EventListener)
        }
    }, [wsDataHandler])

    const handleSignOut = (e: React.MouseEvent): void => {
        e.preventDefault()
        props.handleSignOut()
    }

    return (
        <Fragment>
            <nav className="navbar navbar-dark fixed-top bg-dark flex-md-nowrap p-0 shadow">
                <a className="navbar-brand col-sm-3 col-md-2 mr-0" href="#">Anomaly</a>
                <ul className="navbar-nav px-3">
                    <li className="nav-item text-nowrap">
                        <a className="nav-link" href="#" onClick={(e): void => handleSignOut(e)}>Sign out</a>
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
