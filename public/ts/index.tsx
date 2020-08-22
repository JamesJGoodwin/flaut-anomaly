/**
 * Core Modules
 */

import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'react-redux'

import 'core-js/stable'
import 'regenerator-runtime/runtime'


import 'normalize.css'
import 'bootstrap/dist/css/bootstrap.css'

/**
 * Engine Modules
 */

import App from './App'
import store from './store'

import '../scss/dashboard.scss'
import '../scss/animations.scss'

/**
 * Logic
 */

render(
    <Provider store={store}>
        <App />
    </Provider>,
    document.getElementById('root')
)