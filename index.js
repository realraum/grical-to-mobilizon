import pkg from 'ical.js';
const { parse } = pkg;

import { getEvents, addOrModify, updateImage, deleteEvent } from './mob.js'
import { normalizeUrl, syncLautiHosts } from './url-utils.js'
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

// lauti stores the tags comma separated in the CATEGORIES property, e.g.
// `CATEGORIES:r3\,treffen`. ical.js exposes that as a single text value
// ("r3,treffen") instead of one value per tag, so split it ourselves.
function getTags(vevent) {
  const tags = []

  for (const kv of vevent) {
    if (kv[0] !== 'categories') continue

    // jCal property layout: [name, params, type, ...values]
    for (const value of kv.slice(3)) {
      for (const tag of String(value).split(',')) {
        const trimmed = tag.trim()
        if (trimmed) tags.push(trimmed)
      }
    }
  }

  return tags
}

// lauti has separate hashtags on the event page that are not exported in the
// ICS at all. They are rendered as `#tag` links in an .info-tags block, below
// the category/topic block.
function getPageTags(doc) {
  const tags = []

  for (const link of doc.querySelectorAll('.info-tags a[itemprop="keywords"]')) {
    const text = link.textContent.trim()

    if (!text.startsWith('#')) continue

    const tag = text.slice(1).trim()
    if (tag) tags.push(tag)
  }

  return tags
}

function mergeTags(...lists) {
  const tags = []
  const seen = new Set()

  for (const list of lists) {
    for (const tag of list) {
      const key = tag.toLowerCase()

      if (seen.has(key)) continue

      seen.add(key)
      tags.push(tag)
    }
  }

  return tags
}

const eventsMob = []
const username2id = {}

for (const username of Config.usernames) {
  const res = await getEvents(username)
  username2id[username] = res.group.id
  eventsMob.push(...res.group.organizedEvents.elements)
}

const lautiHosts = syncLautiHosts(Config)

function isLautiEvent(event) {
  const url = normalizeUrl(event.onlineAddress)
  if (!url) return false

  return lautiHosts.has(new URL(url).hostname.toLowerCase())
}

function eventIdNumber(id) {
  const num = Number(id)
  return Number.isFinite(num) ? num : Number.MAX_SAFE_INTEGER
}

const mobById = {}
const mobByLautiUrl = new Map()
const seenMobIds = new Set()

for (const event of eventsMob) {
  if (seenMobIds.has(event.id)) continue
  seenMobIds.add(event.id)

  if (!isLautiEvent(event)) continue

  mobById[event.id] = event

  const url = normalizeUrl(event.onlineAddress)
  const copies = mobByLautiUrl.get(url)

  if (copies) copies.push(event)
  else mobByLautiUrl.set(url, [event])
}

// Several mobilizon events may claim the same lauti URL. A plain map would
// silently keep only the last one (leaving the others stale forever), so pick
// a winner deterministically and delete the rest.
//
// Deterministic winner: the oldest event (lowest id). That is the copy users
// have interacted with (comments, shares), and its state is rewritten from the
// ICS anyway.
const lautiToMob = {}

for (const [url, copies] of mobByLautiUrl) {
  copies.sort((a, b) => eventIdNumber(a.id) - eventIdNumber(b.id))

  const [keep, ...extras] = copies
  lautiToMob[url] = keep.id

  if (extras.length === 0) continue

  console.warn(
    `duplicate lauti URL ${url}: ${copies.length} events; keeping ${keep.id} ${keep.url}, ` +
    `deleting ${extras.map(extra => extra.id).join(', ')}`
  )

  for (const extra of extras) {
    try {
      await deleteEvent(extra.id)
      console.log(`deleted duplicate event ${extra.id} ${extra.url}`)
    } catch (err) {
      // Keep syncing: the winner is still updated, the extra is retried on the
      // next run.
      console.error(
        `failed to delete duplicate event ${extra.id} ${extra.url}: ${(err && err.message) || err}`
      )
    }
  }
}

const predefined = Config.predefined.map(([regex, sum]) => {
  return [new RegExp(regex, 'i'), sum]
})

const now = Date.now()
const maxFuture = Config.maxFutureDuration
  ? DateTime.fromMillis(now).plus(Config.maxFutureDuration).toMillis()
  : Infinity

const extraMetaRegex = /#([a-z]+)=([^ ]+)/gmi

for (const [, event] of events) {
  try {
    console.log('ical: %O', event)

    const url = getVal(event, 'url')

    // Duplicates were already resolved above; this finds the single mobilizon
    // event (if any) that currently represents this lauti URL.
    const lautiKey = normalizeUrl(url)
    const existingMobId = lautiKey ? lautiToMob[lautiKey] : null
    const existingMob = existingMobId ? mobById[existingMobId] : null

    let beginsOn = getVal(event, 'dtstart')
    let endsOn = getVal(event, 'dtend')

    if (new Date(beginsOn).getTime() <= now) {
      continue
    }

    if (new Date(beginsOn).getTime() > maxFuture) {
      console.log('skipping far-future event %o (%o)', url, beginsOn)
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

    const title = getVal(event, 'summary')
    let summary = getVal(event, 'description') || ''

    // Fetch the lauti event page once: it holds both the event hashtags and the
    // attached image, neither of which is fully available in the ICS export.
    const lautiHTML = await (await fetch(url)).text()
    const lautiDOM = new JSDOM(lautiHTML)
    const lautiDoc = lautiDOM.window.document

    // The attached image URL appears in these tags on the lauti event page:
    //   //meta[@property="og:image"]/@content
    //   //meta[@name="twitter:image"]/@content
    //   //img[@class="image" and @itemprop="image"]/@src
    // The meta tags always exist and fall back to the realraum logo, so the
    // <img class="image"> element is the reliable indicator of an attached image.
    const imageSrc = lautiDoc.evaluate(
      '//img[@class="image" and @itemprop="image"]/@src',
      lautiDoc, null,
      lautiDOM.window.XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue?.value

    const imageUrl = imageSrc && new URL(imageSrc, url).href

    const tags = mergeTags(getTags(event), getPageTags(lautiDoc))

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
      picture: Config.defaultPicture ? { mediaUuid: Config.defaultPicture } : null
    }

    for (const [regex, predef] of predefined) {
      if (!title.match(regex)) continue

      const { tags: predefinedTags, ...predefinedRest } = predef

      Object.assign(eventData, predefinedRest)

      if (predefinedTags) {
        eventData.tags = mergeTags(eventData.tags, predefinedTags)
      }
    }

    Object.assign(eventData, extraMeta)

    eventData.organizer = username2id[eventData.organizer]

    // #banner=... is no longer supported; drop it so it is neither rendered nor sent.
    delete eventData.banner

    const imageName = imageUrl && basename(new URL(imageUrl).pathname)

    if (imageUrl) {
      if (existingMob && existingMob.picture && existingMob.picture.name === imageName) {
        // nothing todo, keep picture
        eventData.picture = { mediaUuid: existingMob.picture.uuid }
      } else {
        // remove existing to prevent mobilizion bug from replacing all pictures with same instance
        eventData.picture = null
      }
    }

    console.log('mobi: %o', eventData)

    const res = await addOrModify(existingMobId, eventData)

    console.log(res)

    const id = res[Object.keys(res)[0]].id

    if (imageUrl && !eventData.picture) {
      // upload image, add mediaId
      const imageName = basename(new URL(imageUrl).pathname)
      console.log('uploading banner on %o: %o from %o', id, imageName, imageUrl)
      const blob = await(await fetch(imageUrl)).blob()
      console.log(await updateImage(blob, imageName, imageUrl, id, eventData.tags))
    }
  } catch (err) {
    // Keep syncing the remaining events even if one fails (e.g. missing
    // permissions on a group's behalf).
    console.error('failed to sync event %o: %o', getVal(event, 'summary'), (err && err.message) || err)
  }
}
