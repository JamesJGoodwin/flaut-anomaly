/**
 * Core Modules
 */

import { HistoryEntry, AllowedStatuses } from '../../../../types'

import { animateFill } from 'tippy.js';
import Tippy, { TippyProps } from '@tippyjs/react';
import React, { useState, useEffect, Fragment, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle, faTimes } from '@fortawesome/free-solid-svg-icons'
import { useDropzone } from 'react-dropzone'
import cx from 'classnames'

import 'tippy.js/dist/tippy.css';
import 'tippy.js/dist/backdrop.css';
import 'tippy.js/animations/shift-away.css';

/**
 * Engine Modules
 */

import { sendWebSocketData } from '../../websocket'
import { showSuccessToast, showErrorToast } from '../toast'


/**
 * Logic
 */

interface Props {
  i: number;
  latestLength: number;
  entry: HistoryEntry;
}

const TippyOptions: TippyProps = {
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

const declOfNum = (number: number, titles: string[]): string => {
  const cases = [2, 0, 1, 1, 1, 2]
  return titles[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]]
}

const timeSince = (date: Date): string => {
  const seconds = Math.floor((new Date().valueOf() - date.valueOf()) / 1000)

  const data = [
    { x: 31536000, cases: ['год', 'года', 'лет'] },
    { x: 2592000, cases: ['месяц', 'месяца', 'месяцев'] },
    { x: 86400, cases: ['день', 'дня', 'дней'] },
    { x: 3600, cases: ['час', 'часа', 'часов'] },
    { x: 60, cases: ['минуту', 'минуты', 'минут'] },
  ]

  for (const grade of data) {
    const interval = Math.floor(seconds / grade.x)

    if (interval >= 1) {
      return interval + ' ' + declOfNum(interval, grade.cases)
    }
  }

  const secs = Math.floor(seconds)
  return secs + ' ' + declOfNum(secs, ['секунду', 'секунды', 'секунд'])
}

export function Entry(props: Props): JSX.Element {
  const [stage, setStage] = useState<'entering' | 'entered'>('entering')
  const [timeFromNow, setTimeFromNow] = useState(timeSince(new Date(props.entry.createdAt)))

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file, i) => {
      const reader = new FileReader()

      reader.onloadend = async () => {
        if (!window.awaitingUploadNotification) {
          window.awaitingUploadNotification = true
        }

        const res = await fetch('/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            [`${props.entry.destination}`]: reader.result as string
          })
        })

        if (!res.ok) {
          showErrorToast(`${res.status} ${res.statusText}`)
        }
      }

      reader.readAsDataURL(file)
    })
  }, [props.entry.destination])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: 'image/jpeg, image/png, image/webp',
    onDrop: onDrop
  })

  const deleteImage = (name: string): void => {
    window.awaitingDeletionNotification = true

    const data = {
      type: 'delete-image',
      data: {
        name: name
      }
    }

    sendWebSocketData(data)
  }

  useEffect(() => {
    setTimeout(() => setStage('entered'), 200)

    const interval = setInterval(() => {
      setTimeFromNow(timeSince(new Date(props.entry.createdAt)))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className={cx('card', stage, { 'mb-3': props.i + 1 < props.latestLength, dragged: isDragActive })}>
      <div className="card-header text-muted bg-white">
        {timeFromNow + ' назад'}
      </div>
      <div {...getRootProps({ className: 'dropzone' })}>
        <input {...getInputProps()} />
        <div className="card-body d-flex align-items-center" style={{ cursor: 'default' }}>
          {isDragActive
            ? (<div className="d-flex align-items-center justify-content-center drag-n-drop col-12">
              <p className="h5 text-muted">Drop your files here...</p>
            </div>)
            : (
              <Fragment>
                <Tippy content={props.entry.fullInfo.airline} {...TippyOptions}>
                  <div className="image-holder col-md-1 col-xs-12 text-center">
                    <img
                      src={`https://pics.avs.io/al_square/160/160/${props.entry.fullInfo.airline}@2x.png`}
                      style={{ width: '100%' }}
                    />
                  </div>
                </Tippy>
                <div className="route d-flex col-md-5 col-xs-12">
                  <Tippy content={props.entry.fullInfo.segments[0].origin.name} {...TippyOptions}>
                    <div className="origin d-block text-truncate col-md-6 col-xs-12 text-center">
                      {props.entry.fullInfo.segments[0].origin.name}
                      <small className="text-muted d-block">Город отправки</small>
                    </div>
                  </Tippy>
                  <Tippy content={props.entry.fullInfo.segments[0].destination.name} {...TippyOptions}>
                    <div className="destination d-block text-truncate col-md-6 col-xs-12 text-center">
                      {props.entry.fullInfo.segments[0].destination.name}
                      <small className="text-muted d-block">Город прибытия</small>
                    </div>
                  </Tippy>
                </div>
                <div className="dates col-md-2 col-xs-12 text-center">
                  <div className="there">
                    <small className="text-muted">Туда: </small>
                    <small>{parseDate(props.entry.departureDate)}</small>
                  </div>
                  {props.entry.backDate && (
                    <div className="thence">
                      <small className="text-muted">Назад: </small>
                      <small>{parseDate(props.entry.backDate)}</small>
                    </div>
                  )}
                </div>
                <div className="status col-md-4 col-xs-12">
                  <Status statusText={props.entry.status} descr={props.entry.statusDescription} />
                </div>
              </Fragment>
            )
          }
        </div>
      </div>
      {props.entry?.images?.length > 0 && (
        <div className="card-body d-flex align-items-center images-holder border-top pl-0 pr-0 mr-4 ml-4">
          {props.entry.images.map(img =>
            <div
              className="image col-md-2 col-xs-12 mr-4"
              style={{ backgroundImage: `url(/images/thumbnails/${img.name})` }}
              key={img._id}
            >
              <FontAwesomeIcon onClick={() => deleteImage(img.name)} icon={faTimes} />
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
      <Tippy disabled={!props.descr} content={props.descr} {...TippyOptions}>
        <div className="text-danger text-center">
          <strong>{props.statusText === 'declined' ? 'Отклонено' : 'Ошибка'}</strong>
          <small className="d-block text-truncate">{props.descr}</small>
        </div>
      </Tippy>
    )
  } else if (props.statusText === 'processing') {
    return (
      <Tippy disabled={!props.descr} content={props.descr} {...TippyOptions}>
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
        <FontAwesomeIcon style={{ fontSize: '28px' }} icon={faCheckCircle} />
      </div>
    )
  }
}