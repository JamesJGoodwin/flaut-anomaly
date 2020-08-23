/**
 * Core Modules
 */

import React, { Fragment } from 'react'
import { useSelector } from 'react-redux'
import { ToastContainer } from 'react-toastify'
import { Redirect, Switch, Route, RouteProps } from 'react-router-dom'

import 'react-toastify/dist/ReactToastify.css'

/**
 * Engine Modules
 */

import { Authorization as AuthForm } from './components/auth'
import { Dashboard } from './components/dashboard'
import { stateSelector as authSelector } from './slices/auth'

/**
 * Logic
 */

const App = (): JSX.Element => {
  const { isAuthenticated, isAuthorized } = useSelector(authSelector)

  return (
    <Fragment>
      <Switch>
        <Redirect exact from="/" to="/auth" />
        <Route path="/auth" component={AuthForm} />
        <PrivateRoute path="/dashboard" isAuthenticated={isAuthorized && isAuthenticated}>
          <Dashboard />
        </PrivateRoute>
      </Switch>
      <ToastContainer />
    </Fragment >
  )
}

export default App

function PrivateRoute({ children, isAuthenticated, ...rest }: { children: React.ReactNode, isAuthenticated: boolean } & RouteProps) {
  return (
    <Route
      {...rest}
      render={({ location }) => isAuthenticated
        ? children
        : <Redirect to={{ pathname: '/auth', state: { from: location } }} />
      }
    />
  );
}
