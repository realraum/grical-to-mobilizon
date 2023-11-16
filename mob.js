import { request, GraphQLClient } from 'graphql-request'

import Session from './session.json' assert { type: "json" }
import Config from './config.json' assert { type: "json" }
import { writeFile } from 'fs/promises'

import { Curl } from 'node-libcurl'
import { print } from 'graphql/language/printer.js'
import { writeFileSync } from 'fs'

const endpoint = Config.mobilizon

import { Refresh, EventList, EventAdd, EventModify, UpdateImage } from './mobilizon.graphql'

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

export async function getEvents(username) {
  return await client.request(EventList, {
    username,
    now: new Date()
  })
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

export async function updateImage(blob, name, origURL, eventId) {
  // why not form-data? because it doesn't work. it just creates a 400.
  const curl = new Curl()
  const placeholder = 'p...i...c...t...u...r...e...m.e.d.i.a.file'

  const content = Buffer.from(await blob.arrayBuffer())

  const tmp = `/tmp/${Math.random()}`

  writeFileSync(tmp, content)

  curl.setOpt(Curl.option.HTTPHEADER,
    [`Authorization: Bearer ${Session.accessToken}`])

  curl.setOpt(Curl.option.URL, endpoint)
  curl.setOpt(Curl.option.HTTPPOST, [
    {
      name: 'query', contents: print(UpdateImage)
    },
    {
      name: 'variables', contents: JSON.stringify({
        file: placeholder,
        name,
        origURL,
        eventId
      })
    },
    { name: placeholder, file: tmp, type: 'application/octet-stream' },
  ])

  return new Promise((resolve, reject) => {
    curl.on('end', function(statusCode, data, _headers) {
      if (statusCode !== 200) {
        return reject(new Error('Status code: ' + statusCode))
      }

      this.close()

      return resolve(JSON.parse(data).data)
    })

    curl.on('error', (error) => {
      curl.close.bind(curl)
      reject(error)
    })

    curl.perform()
  })
}
