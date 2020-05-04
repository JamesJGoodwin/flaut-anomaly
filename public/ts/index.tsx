/**
 * Core Modules
 */

import React from 'react'
import ReactDOM from 'react-dom'

import 'normalize.css'
import 'bootstrap/dist/css/bootstrap.css'

/**
 * Engine Modules
 */

import { App } from './App';

import '../scss/dashboard.scss'

/**
 * Logic
 */

;(function init(): void {
    ReactDOM.render(<App />, document.getElementById('root'))
})()