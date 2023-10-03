import { request, GraphQLClient } from 'graphql-request'
import Session from './session.json' assert { type: "json" }
import Config from './config.json' assert { type: "json" }
import { writeFile } from 'fs/promises'

const endpoint = Config.mobilizon

import { REFRESH_MUTATION, EVENT_LIST, EVENT_ADD } from './graph.js'

const { refreshToken: refresh } = await request(
  endpoint, REFRESH_MUTATION,
  { refreshToken: Session.refreshToken }
)

Object.assign(Session, refresh)
await writeFile('session.json', JSON.stringify(Session))

const client = new GraphQLClient(endpoint, {
  headers: {
    authorization: `Bearer ${Session.accessToken}`,
  },
})

export async function getEvents() {
  return await client.request(EVENT_LIST)
}

export async function addEvent() {

}

export async function modifyEvent() {

}
