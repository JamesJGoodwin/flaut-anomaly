import { RootState } from './index'

import { createSlice } from '@reduxjs/toolkit'

interface AuthState {
    isAuthorized: boolean;
    isAuthenticated: boolean;
    isAuthChecked: boolean;
}

const initialState: AuthState = {
    isAuthorized: false,
    isAuthenticated: 'jwt' in localStorage,
    isAuthChecked: false
}

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setAuthenticationChecked: (state): void => {
            state.isAuthChecked = true
        },
        setAuthorizationSucceeded: (state): void => {
            state.isAuthorized = true
            state.isAuthenticated = 'jwt' in localStorage
        },
        setAuthorizationFailed: (state): void => {
            state.isAuthorized = false
            state.isAuthenticated = 'jwt' in localStorage
        },
        setAuthenticationSucceeded: (state): void => {
            state.isAuthChecked = true
            state.isAuthorized = true
        },
        setAuthenticationFailed: (state): void => {
            state.isAuthChecked = true
        },
        signOut: (state): void => {
            state.isAuthenticated = false
            state.isAuthorized = false
        }
    },
})

export const stateSelector = (state: RootState): AuthState => state.auth

export const {
    setAuthenticationChecked,
    setAuthenticationFailed,
    setAuthenticationSucceeded,
    setAuthorizationFailed,
    setAuthorizationSucceeded,
    signOut
} = authSlice.actions

export default authSlice.reducer