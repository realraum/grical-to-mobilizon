import { request, GraphQLClient } from 'graphql-request'
import Session from './session.json' assert { type: "json" }
import Config from './config.json' assert { type: "json" }
import { writeFile } from 'fs/promises'

const endpoint = Config.mobilizon

import { Refresh, EventList, EventAdd } from './mobilizon.graphql'

const { refreshToken: refresh } = await request(
  endpoint, Refresh,
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
  return await client.request(EventList)
}

export async function addEvent() {

}

export async function modifyEvent() {

}
