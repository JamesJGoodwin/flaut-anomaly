/**
 * Core Modules
 */

import React, { useEffect } from 'react'

import '../../scss/loading.scss'

/**
 * Engine
 */

export function Loader(): JSX.Element {
    useEffect(() => {
        document.body.classList.add('loading')

        return (): void => document.body.classList.remove('loading')
    }, [])

    return (
        <div className="loader-box">
            <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Loading...</span>
            </div>
        </div>
    )
}
