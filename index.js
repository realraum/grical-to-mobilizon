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

const mobEvents = await getEvents()

const gricalToMob = {}

for (const event of mobEvents.group.organizedEvents.elements) {
  console.log(event)
  if (event.onlineAddress && event.onlineAddress.includes('grical')) {
    gricalToMob[event.onlineAddress] = event.id
  }
}

const predefinedSummaries = Config.predefinedSummaries.map(([regex, sum]) => {
  return [new RegExp(regex, 'i'), sum]
})

for (const [, event] of events) {
  const categories = getKey(event, 'categories')
  if (categories.indexOf('r3') !== -1) {
    console.log(event)

    const url = getVal(event, 'url')

    const beginsOn = getVal(event, 'dtstart')
    const endsOn = getVal(event, 'dtend')
    const gricalUrl = getVal(event, 'url')

    const tags = (getKey(event, 'categories') || []).slice(3)

    const title = getVal(event, 'summary')
    let summary = getVal(event, 'description')

    summary = mdConverter.makeHtml(summary)

    for (const [regex, predef] of predefinedSummaries) {
      if (title.match(regex)) {
        summary = predef
      }
    }

    const eventData = {
      beginsOn,
      endsOn,
      gricalUrl,
      title,
      tags,
      description: summary,
    }

    console.log(eventData)

    const res = await addOrModify(gricalToMob[url], eventData)

    console.log(res)
  }
}
