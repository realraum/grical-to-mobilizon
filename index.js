import pkg from 'ical.js';
const { parse } = pkg;

import { getEvents, addOrModify } from './mob.js'
import showdown from 'showdown'

import Config from './config.json' assert { type: "json" }

const mdConverter = new showdown.Converter()

const req = await fetch(Config.grical)
const res = await req.text()
const events = parse(res)[2]

function getKey(vevent, key) {
  for (const kv of vevent) {
    if (kv[0] === key) return kv
  }
}

function getVal(vevent, key) {
  let val
  return (val = getKey(vevent, key)) && val[3]
}

const eventsMob = []
const username2id = {}

for (const username of Config.usernames) {
  const res = await getEvents(username)
  username2id[username] = res.group.id
  eventsMob.push(...res.group.organizedEvents.elements)
}

const gricalToMob = {}

for (const event of eventsMob) {
  if (event.onlineAddress && event.onlineAddress.includes('grical')) {
    gricalToMob[event.onlineAddress] = event.id
  }
}

const predefined = Config.predefined.map(([regex, sum]) => {
  return [new RegExp(regex, 'i'), sum]
})

const now = Date.now()

for (const [, event] of events) {
  const categories = getKey(event, 'categories')
  if (true) {
  // if (categories.indexOf('r3') !== -1) {
    console.log('ical: %O', event)

    const url = getVal(event, 'url')

    const beginsOn = getVal(event, 'dtstart')
    const endsOn = getVal(event, 'dtend')
    const gricalUrl = getVal(event, 'url')

    if (new Date(beginsOn).getTime() <= now) {
      continue
    }

    const tags = (getKey(event, 'categories') || []).slice(3)

    const title = getVal(event, 'summary')
    let summary = getVal(event, 'description')

    summary = mdConverter.makeHtml(summary)

    const eventData = {
      organizer: Config.usernames[0],
      addressID: Config.addressID,
      beginsOn,
      endsOn,
      gricalUrl,
      title,
      tags,
      summary,
    }

    for (const [regex, predef] of predefined) {
      if (title.match(regex)) {
        Object.assign(eventData, predef)
      }
    }

    eventData.organizer = username2id[eventData.organizer]

    console.log('mobi: %o', eventData)

    const res = await addOrModify(gricalToMob[url], eventData)

    console.log(res)
  }
}
