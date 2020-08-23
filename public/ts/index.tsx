/**
 * Core Modules
 */

import 'core-js/stable'
import 'regenerator-runtime/runtime'

import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import { BrowserRouter as Router, Route } from 'react-router-dom'

import 'normalize.css'
import 'bootstrap/dist/css/bootstrap.css'

/**
 * Engine Modules
 */

import App from './App'
import store from './store'
import { init as initWebSocket } from './websocket'

import '../scss/dashboard.scss'
import '../scss/animations.scss'

/**
 * Logic
 */

const init = async () => {
  initWebSocket()
  await window.startWebSocket()

  while (window.ws.readyState !== 1) {
    await new Promise(resolve => {
      setTimeout(() => {
        resolve()
      }, 100)
    })
  }

  render(
    <Provider store={store}>
      <Router>
        <Route path="/" component={App} />
      </Router>
  
    </Provider>,
    document.getElementById('root')
  )
}

init().catch(e => console.error(e))