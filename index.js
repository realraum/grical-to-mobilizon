import pkg from 'ical.js';
const { parse } = pkg;

import { getEvents, addOrModify, updateImage } from './mob.js'
import showdown from 'showdown'
import { DateTime } from 'luxon'

import Config from './config.json' assert { type: "json" }

import { JSDOM } from 'jsdom'
import jQuery from 'jquery'
import { basename } from 'path'

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
const mobById = {}

for (const event of eventsMob) {
  if (event.onlineAddress && event.onlineAddress.includes('grical')) {
    gricalToMob[event.onlineAddress] = event.id
    mobById[event.id] = event
  }
}

const predefined = Config.predefined.map(([regex, sum]) => {
  return [new RegExp(regex, 'i'), sum]
})

const now = Date.now()

const extraMetaRegex = /#([a-z]+)=([^ ]+)/gmi

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

    const extraMeta = {}

    summary = summary.replace(extraMetaRegex, (_, key, value) => {
      extraMeta[key] = value

      return ''
    })

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

    Object.assign(eventData, extraMeta)

    let customBanner

    const gricalHTML = await(await fetch(gricalUrl)).text()
    const gricalDOM = new JSDOM(gricalHTML)
    const $ = jQuery(gricalDOM.window)
    const gricalURLs = $('.urls').find('a').toArray().map(url => {
      if ($(url).text() == 'img') {
        customBanner = url.href
        return
      }

      return url
    }).filter(Boolean)

    if (gricalURLs.length) {
      eventData.summary += '<h2>Links</h2><ul>'
      for (const url of gricalURLs) {
        eventData.summary += '<li>' + url.outerHTML + '</li>'
      }
      eventData.summary += '</ul>'
    }

    eventData.organizer = username2id[eventData.organizer]

    if (eventData.banner) {
      customBanner = eventData.banner
      delete eventData.banner
    }

    const bannerName = customBanner && basename(new URL(customBanner).pathname)

    if (customBanner) {
      if (gricalToMob[url] && mobById[gricalToMob[url]].picture && mobById[gricalToMob[url]].picture.name === bannerName) {
        // nothing todo, keep picture
        eventData.picture = { mediaId: mobById[gricalToMob[url]].picture.id }
      } else {
        // remove existing to prevent mobilizion bug from replacing all pictures with same instance
        eventData.picture = null
      }
    }

    console.log('mobi: %o', eventData)

    const res = await addOrModify(gricalToMob[url], eventData)

    console.log(res)

    const id = res[Object.keys(res)[0]].id

    if (customBanner && !eventData.picture) {
      // upload image, add mediaId
      const bannerName = basename(new URL(customBanner).pathname)
      console.log('uploading banner on %o: %o from %o', id, bannerName, customBanner)
      const blob = await(await fetch(customBanner)).blob()
      console.log(await updateImage(blob, bannerName, customBanner, id))
    }
  }
}
