import pkg from 'ical.js';
const { parse } = pkg;

import { getEvents } from './mob.js'
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
  const m = event.description.match(/grical%(.+)%/)
  if (m) {
    const id = m[1]
    gricalToMob[id] = event.uuid
  }
}

const predefinedSummary = [
  [/Mitgliedertreffen/, `
    <p><strong>Worum geht’s?</strong></p><p>Der realraum ist ein Treffpunkt zum Basteln, Experimentieren und vielem mehr – ein Hackerspace für die Bereiche Software, Hardware, Computer und Elektronik, Molekularbiologie und Chemie. <a target="_blank" rel="noopener noreferrer ugc" href="https://wp.realraum.at/realraum/">Lies mehr über uns</a></p>
  `],
  [/Funkfeuer/i, `
    <p>Funkfeuer Graz ist ein freies, experimentelles Funk-Netzwerk in Graz. Funkfeuer ist offen für Jeden und Jede, der/die Interesse hat und bereit ist mitzuarbeiten. Funkfeuer ist ein nicht reguliertes Netzwerk, das den digitalen Graben zwischen den sozialen Schichten überbrückt und Infrastruktur und Wissen zur Verfügung zu stellen.</p><p>Funkfeuer wird von computerbegeisterten Menschen mit unterschiedlicher Motivation und Interessen betrieben. Das Projekt verfolgt keine kommerziellen Interessen.</p><p>Funkfeuer ist auch ein Soziales Experiment denn es versucht Arbeitsweisen aus der Open Source Welt in einem gesellschaftlichen Kontext zu etablieren.</p><p>Es gibt keine Zentrale Institution, wir bauen uns unser Netzwerk selber!</p>
  `]
]

for (const [, event] of events) {
  const categories = getKey(event, 'categories')
  if (categories.indexOf('r3') !== -1) {
    console.log(event)

    const uid = getVal(event, 'uid')
    const start = getVal(event, 'dtstart')
    const end = getVal(event, 'dtend')
    let summary = getVal(event, 'description')
    const title = getVal(event, 'summary')

    summary = mdConverter.makeHtml(summary)

    for (const [regex, predef] of predefinedSummary) {
      if (title.match(regex)) {
        summary = predef
      }
    }

    summary += `<p hidden>grical%${uid}%</p>`

    console.log({
      beginsOn: start,
      endsOn: end,
      title,
      summary
    })
  }
}

import { inspect } from 'util'

// console.log(inspect(mobEvents, { depth: null, colors: true }))
