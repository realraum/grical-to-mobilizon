import { request, GraphQLClient } from 'graphql-request'
import Session from './session.json' assert { type: "json" }
import Config from './config.json' assert { type: "json" }
import { writeFile } from 'fs/promises'

const endpoint = Config.mobilizon

import { Refresh, EventList, EventAdd, EventModify } from './mobilizon.graphql'

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

export async function addEvent(variables) {
  return await client.request(EventAdd, {
    organizerActorId: Session.user.defaultActor.id,
    ...variables
  })
}

export async function modifyEvent(id, param) {
  return await client.request(EventModify, {
    eventId: id,
    ...param
  })
}

export async function addOrModify(idOrNull, param) {
  if (idOrNull) return await modifyEvent(idOrNull, param)
  else return await addEvent(param)
}
