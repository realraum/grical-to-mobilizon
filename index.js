import pkg from 'ical.js';
const { parse } = pkg;

import { getEvents, addOrModify } from './mob.js'
import showdown from 'showdown'
import { DateTime } from 'luxon'

import Config from './config.json' assert { type: "json" }

import { JSDOM } from 'jsdom'
import jQuery from 'jquery'

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

    let beginsOn = getVal(event, 'dtstart')
    let endsOn = getVal(event, 'dtend')

    if (new Date(beginsOn).getTime() <= now) {
      continue
    }

    // cursed date-time
    if (!endsOn && beginsOn.length === 10) { // event is a single day long
      endsOn = beginsOn
    }

    if (beginsOn.length === 10) { // all-day event, set start-of-day
      beginsOn = DateTime.fromJSDate(new Date(beginsOn)).startOf('day').toString()
    }

    if (endsOn && endsOn.length === 10) { // all-day event, extend until end-of-day
      endsOn = DateTime.fromJSDate(new Date(endsOn)).endOf('day').toString()    
    }

    const gricalUrl = getVal(event, 'url')
    const tags = (getKey(event, 'categories') || []).slice(3)

    const title = getVal(event, 'summary')
    let summary = getVal(event, 'description') || ''

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
      picture: { mediaId: Config.defaultPicture }
    }

    for (const [regex, predef] of predefined) {
      if (title.match(regex)) {
        Object.assign(eventData, predef)
      }
    }

    const gricalHTML = await (await fetch(gricalUrl)).text()
    const gricalDOM = new JSDOM(gricalHTML)
    const gricalURLs = jQuery(gricalDOM.window)('.urls').find('a').toArray()

    if (gricalURLs.length) {
      eventData.summary += '<h2>Links</h2><ul>'
      for (const url of gricalURLs) {
        eventData.summary += '<li>' + url.outerHTML + '</li>'
      }
      eventData.summary += '</ul>'
    }

    eventData.organizer = username2id[eventData.organizer]

    console.log('mobi: %o', eventData)

    const res = await addOrModify(gricalToMob[url], eventData)

    console.log(res)
  }
}
