/**
 * Core Modules
 */

import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'

dotenv.config()

/**
 * Logic
 */

export async function signJwt(data: any): Promise<string> {
    return await new Promise((resolve, reject) => {
        jwt.sign(data, process.env.JWT_SECRET, { expiresIn: '30d' }, function(err, token) {
            if (err) reject(err)
            resolve(token)
        })
    })
}

export async function verifyJwt(token: string): Promise<jwt.VerifyErrors | object> {
    return await new Promise((resolve, reject) => {
        jwt.verify(token, process.env.JWT_SECRET, function(err, decoded) {
            if (err) reject(err)
            resolve(decoded)
        })
    })
}
