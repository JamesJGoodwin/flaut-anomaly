/**
 * Core Modules
 */

import { HistoryEntry, TicketParser, AllowedStatuses, WebSocketTransfer } from '../../../types'

import { animateFill } from 'tippy.js';
import Tippy, { TippyProps } from '@tippyjs/react';
import React, { useState, useEffect, Fragment, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle, faTimes } from '@fortawesome/free-solid-svg-icons'
import { useDropzone } from 'react-dropzone'

import 'tippy.js/dist/tippy.css';
import 'tippy.js/dist/backdrop.css';
import 'tippy.js/animations/shift-away.css';

/**
 * Engine Modules
 */

import { sendWebSocketData } from '../websocket'

/**
 * Logic
 */

interface Props {
    i: number;
    latestLength: number;
    entry: HistoryEntry;
}

const TippyOptions: TippyProps = {
    arrow: 'round',
    popperOptions: {
        modifiers: [{
            name: 'computeStyles',
            options: {
                gpuAcceleration: false
            }
        }]
    },
    animateFill: true,
    plugins: [animateFill]
}
const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const parseDate = (date: string | Date): string => {
    const d = new Date(date)
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export function Entry(props: Props): JSX.Element {
    const [stage, setStage] = useState<'entering' | 'entered'>('entering')
    const [images, setImages] = useState(props.entry.images)
    const fullinfo: TicketParser = JSON.parse(props.entry.full_info)

    const onDrop = useCallback((acceptedFiles: File[]) => {
        acceptedFiles.forEach(file => {
            const reader = new FileReader()

            reader.onloadend = (): void => {
                const base64data = reader.result
                
                sendWebSocketData(
                    JSON.stringify({
                        type: 'upload-image',
                        data: {
                            base64: base64data,
                            mimeType: file.type,
                            destinationCode: fullinfo.segments[0].destination.cityCode
                        }
                    } as WebSocketTransfer.UploadImage)
                )
            }

            reader.readAsDataURL(file)
        })
    }, [])

    const wsDataHandler = useCallback((e: CustomEvent) => {
        const message: WebSocketTransfer.ClientIncoming = JSON.parse(e.detail)

        if (message.type === 'upload-image' && message.data.image?.destination === fullinfo.segments[0].destination.cityCode) {
            setImages(prevImages => {
                const newImages = [...prevImages]
                newImages.push(message.data.image)
                return newImages
            })
        } else if (message.type === 'delete-image') {
            if (message.data.result === 'success') {
                const dest = message.data.name.split('').splice(0, 3).join('')

                if (dest === props.entry.destination) {
                    const newImages = [...images]

                    for (let i = 0; i < newImages.length; i++) {
                        if (message.data.name === newImages[i].name) {
                            newImages.splice(i, 1)
                        }
                    }

                    setImages(newImages)
                }
            }
        }
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: 'image/jpeg, image/png, image/webp',
        onDrop: onDrop
    })

    const deleteImage = (name: string): void => {
        sendWebSocketData(
            JSON.stringify({
                type: 'delete-image',
                data: {
                    name: name
                }
            } as WebSocketTransfer.DeleteImage)
        )
    }

    useEffect(() => {
        document.addEventListener('WebSocketStringMessage', wsDataHandler as EventListener)

        setTimeout(() => setStage('entered'), props.i * 50)

        return (): void => document.removeEventListener('WebSocketStringMessage', wsDataHandler as EventListener)
    }, [wsDataHandler])

    return (
        <div className={['card', props.i + 1 < props.latestLength ? 'mb-3': '', stage, , isDragActive ? 'dragged' : ''].join(' ')}>
            <div {...getRootProps({className: 'dropzone'})}>
                <input {...getInputProps()} />
                <div className="card-body d-flex align-items-center" style={{ cursor: 'default' }}>
                    {isDragActive
                        ? (<div className="d-flex align-items-center justify-content-center drag-n-drop col-12">
                                <p className="h5 text-muted">Drop your files here...</p>
                            </div>)
                        : (
                            <Fragment>
                                <Tippy content={fullinfo.airline} { ...TippyOptions }>
                                    <div className="image-holder col-md-1 col-xs-12 text-center">
                                        <img
                                            src={`https://pics.avs.io/al_square/160/160/${fullinfo.airline}@2x.png`}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </Tippy>
                                <div className="route d-flex col-md-5 col-xs-12">
                                    <Tippy content={fullinfo.segments[0].origin.name} { ...TippyOptions }>
                                        <div className="origin d-block text-truncate col-md-6 col-xs-12 text-center">
                                            {fullinfo.segments[0].origin.name}
                                            <small className="text-muted d-block">Город отправки</small>
                                        </div>
                                    </Tippy>
                                    <Tippy content={fullinfo.segments[0].destination.name} { ...TippyOptions }>
                                        <div className="destination d-block text-truncate col-md-6 col-xs-12 text-center">
                                            {fullinfo.segments[0].destination.name}
                                            <small className="text-muted d-block">Город прибытия</small>
                                        </div>
                                    </Tippy>
                                </div>
                                <div className="dates col-md-2 col-xs-12 text-center">
                                    <div className="there">
                                        <small className="text-muted">Туда: </small>
                                        <small>{parseDate(props.entry.there_date)}</small>
                                    </div>
                                    {props.entry.back_date && (
                                        <div className="thence">
                                            <small className="text-muted">Назад: </small>
                                            <small>{parseDate(props.entry.back_date)}</small>
                                        </div>
                                    )}
                                </div>
                                <div className="status col-md-4 col-xs-12">
                                    <Status statusText={props.entry.status} descr={props.entry.status_descr} />
                                </div>
                            </Fragment>
                        )
                    }
                </div>
            </div>
            {images.length > 0 && (
                <div className="card-body d-flex align-items-center images-holder border-top pl-0 pr-0 mr-4 ml-4">
                    {images.map(img =>
                        <div
                            className="image col-md-2 col-xs-12 mr-4"
                            style={{ backgroundImage: `url(/images/thumbnails/${img.name})` }}
                            key={img.id}
                        >
                            <FontAwesomeIcon onClick={(): void => deleteImage(img.name)} icon={faTimes} />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

interface StatusProps {
    statusText: AllowedStatuses;
    descr: string;
}

function Status(props: StatusProps): JSX.Element {
    if (props.statusText === 'declined' || props.statusText === 'failed') {
        return (
            <Tippy disabled={!props.descr} content={props.descr} { ...TippyOptions }>
                <div className="text-danger text-center">
                    <strong>{props.statusText === 'declined' ? 'Отклонено' : 'Ошибка'}</strong>
                    <small className="d-block text-truncate">{props.descr}</small>
                </div>
            </Tippy>
        )
    } else if (props.statusText === 'processing') {
        return (
            <Tippy disabled={!props.descr} content={props.descr} { ...TippyOptions }>
                <div className="text-primary text-center">
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="sr-only">Loading...</span>
                    </div>
                    <small className="d-block text-truncate">{props.descr}</small>
                </div>
            </Tippy>
        )
    } else {
        return (
            <div className="text-success text-center">
                <FontAwesomeIcon icon={faCheckCircle} />
            </div>
        )
    }
}