import { request } from 'graphql-request'
// Format for creds.json: { email: '...', password: '...' }
import Creds from './creds.json' assert { type: "json" }
import Config from './config.json' assert { type: "json" }
import { LOGIN_MUTATION } from './graph.js'
import { writeFile } from 'fs/promises'

const { login } = await request(Config.mobilizon, LOGIN_MUTATION, Creds)

console.log('Signed in as %s', login.user.email)

await writeFile('session.json', JSON.stringify(login))
