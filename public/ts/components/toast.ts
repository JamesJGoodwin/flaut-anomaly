/**
 * Core Modules
 */

import { toast } from 'react-toastify'

/**
 * Engine Modules
 */

/**
 * Logic
 */

export const showErrorToast = (msg: string, duration?: number): void => {
    toast.error(msg, {
        position: 'top-right',
        autoClose: duration || 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: false,
        progress: undefined
    })
}

export const showSuccessToast = (msg: string, duration?: number): void => {
    toast.success(msg, {
        position: 'top-right',
        autoClose: duration ?? 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: false,
        progress: undefined
    })
}