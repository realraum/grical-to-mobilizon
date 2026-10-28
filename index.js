import pkg from 'ical.js';
const { parse } = pkg;

import { getEvents, addOrModify, updateImage } from './mob.js'
import showdown from 'showdown'
import { DateTime } from 'luxon'

import Config from './config.json' with { type: "json" }

import { JSDOM } from 'jsdom'
import { basename } from 'path'

const mdConverter = new showdown.Converter()

const sourceUrl = process.argv[2] || Config.lauti
const req = await fetch(sourceUrl)
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

const lautiToMob = {}
const mobById = {}

for (const event of eventsMob) {
  if (event.onlineAddress && event.onlineAddress.includes('laut.realraum.at')) {
    lautiToMob[event.onlineAddress] = event.id
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
      eventUrl: url,
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

    // The attached image URL appears in these tags on the lauti event page:
    //   //meta[@property="og:image"]/@content
    //   //meta[@name="twitter:image"]/@content
    //   //img[@class="image" and @itemprop="image"]/@src
    // The meta tags always exist and fall back to the realraum logo, so the
    // <img class="image"> element is the reliable indicator of an attached image.
    const lautiHTML = await (await fetch(url)).text()
    const lautiDOM = new JSDOM(lautiHTML)
    const lautiDoc = lautiDOM.window.document
    const imageSrc = lautiDoc.evaluate(
      '//img[@class="image" and @itemprop="image"]/@src',
      lautiDoc, null,
      lautiDOM.window.XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue?.value

    const imageUrl = imageSrc && new URL(imageSrc, url).href

    eventData.organizer = username2id[eventData.organizer]

    // #banner=... is no longer supported; drop it so it is neither rendered nor sent.
    delete eventData.banner

    const imageName = imageUrl && basename(new URL(imageUrl).pathname)

    if (imageUrl) {
      if (lautiToMob[url] && mobById[lautiToMob[url]].picture && mobById[lautiToMob[url]].picture.name === imageName) {
        // nothing todo, keep picture
        eventData.picture = { mediaId: mobById[lautiToMob[url]].picture.id }
      } else {
        // remove existing to prevent mobilizion bug from replacing all pictures with same instance
        eventData.picture = null
      }
    }

    console.log('mobi: %o', eventData)

    const res = await addOrModify(lautiToMob[url], eventData)

    console.log(res)

    const id = res[Object.keys(res)[0]].id

    if (imageUrl && !eventData.picture) {
      // upload image, add mediaId
      const imageName = basename(new URL(imageUrl).pathname)
      console.log('uploading banner on %o: %o from %o', id, imageName, imageUrl)
      const blob = await(await fetch(imageUrl)).blob()
      console.log(await updateImage(blob, imageName, imageUrl, id))
    }
  }
}
