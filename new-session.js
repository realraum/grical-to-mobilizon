import { request } from 'graphql-request'
// Format for creds.json: { email: '...', password: '...' }
import Creds from './creds.json' with { type: "json" }
import Config from './config.json' with { type: "json" }
import { Login } from './mobilizon.graphql'
import { writeFile } from 'fs/promises'

const { login } = await request(Config.mobilizon, Login, Creds)

console.log('Signed in as %s - Actor %s', login.user.email, login.user.defaultActor.name)

await writeFile('session.json', JSON.stringify(login))
