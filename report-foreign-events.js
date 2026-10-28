import pkg from 'ical.js'
const { parse } = pkg

import { getEvents, deleteEvent } from './mob.js'
import { normalizeUrl, syncLautiHosts } from './url-utils.js'
import { DateTime } from 'luxon'
import Config from './config.json' with { type: "json" }

function getKey(vevent, key) {
  for (const kv of vevent) {
    if (kv[0] === key) return kv
  }
}

function getVal(vevent, key) {
  let val
  return (val = getKey(vevent, key)) && val[3]
}

function formatDate(value) {
  const date = DateTime.fromISO(value)
  return date.isValid ? date.toFormat('yyyy-LL-dd HH:mm') : String(value || '')
}

function printEvent(event) {
  console.log(`  ${formatDate(event.beginsOn)}  ${event.title}`)
  console.log(`    group:         ${event.group}`)
  console.log(`    reason:        ${event.reason}`)
  console.log(`    onlineAddress: ${event.onlineAddress || '(none)'}`)
  console.log(`    event page:    ${event.url || '(no URL)'}`)
  if (event.error) console.log(`    error:         ${event.error}`)
  console.log('')
}

const args = process.argv.slice(2)
let autoremoveDeleted = false
let sourceUrl = Config.lauti

for (const arg of args) {
  if (arg === '--autoremove-deleted') {
    autoremoveDeleted = true
  } else if (arg === '--help' || arg === '-h') {
    console.log('Usage: node report-foreign-events.js [--autoremove-deleted] [sourceUrl]')
    process.exit(0)
  } else if (arg.startsWith('-')) {
    console.error(`Unknown option: ${arg}`)
    process.exit(2)
  } else {
    sourceUrl = arg
  }
}

// Fetch and parse the lauti source first. If this fails, do not delete anything.
const response = await fetch(sourceUrl)
if (!response.ok) {
  console.error(`Failed to fetch lauti source ${sourceUrl}: HTTP ${response.status}`)
  process.exit(1)
}

const icsEvents = parse(await response.text())[2] || []
const icsUrls = new Set()

for (const [, event] of icsEvents) {
  const url = normalizeUrl(getVal(event, 'url'))
  if (url) icsUrls.add(url)
}

const lautiHosts = new Set([
  ...(Array.isArray(Config.lautiHosts) ? Config.lautiHosts : []),
  new URL(Config.lauti).hostname,
  new URL(sourceUrl).hostname,
  ...[...icsUrls].map(url => new URL(url).hostname),
].map(host => host.toLowerCase()))

// Hosts the sync manages. Only events on these hosts take part in duplicate
// detection, because only those are read from and rewritten by index.js.
const syncHosts = syncLautiHosts(Config)

console.log(`Lauti source: ${sourceUrl}`)
console.log(`Lauti URLs in ICS: ${icsUrls.size}`)
console.log(`Autoremove deleted lauti events: ${autoremoveDeleted ? 'yes' : 'no'}\n`)

const kept = []
const deleted = []

// Fetch every group first: duplicate detection must see all copies, not just
// the ones inside a single group.
const groups = []

for (const username of Config.usernames) {
  let result

  try {
    result = await getEvents(username)
  } catch (err) {
    console.error(`Failed to fetch events for group ${username}: ${(err && err.message) || err}`)
    continue
  }

  if (!result.group) {
    console.error(`Group not found: ${username}`)
    continue
  }

  groups.push({ username, events: result.group.organizedEvents.elements })
}

function eventPageUrl(event) {
  return event.url || (event.uuid
    ? `${new URL(Config.mobilizon).origin}/events/${event.uuid}`
    : null)
}

// Copies of the same lauti event, i.e. events sharing the same normalized
// onlineAddress. The sync keeps the lowest event id and deletes the others.
const copiesByUrl = new Map()

for (const { username, events } of groups) {
  for (const event of events) {
    const url = normalizeUrl(event.onlineAddress)
    if (!url) continue
    if (!syncHosts.has(new URL(url).hostname.toLowerCase())) continue

    const copies = copiesByUrl.get(url)

    if (copies) copies.push({ group: username, event })
    else copiesByUrl.set(url, [{ group: username, event }])
  }
}

const duplicates = [...copiesByUrl].filter(([, copies]) => copies.length > 1)

if (duplicates.length === 0) {
  console.log('No duplicate lauti URLs.\n')
} else {
  console.log(`Duplicate lauti URLs (${duplicates.length}):\n`)

  for (const [url, copies] of duplicates) {
    copies.sort((a, b) => Number(a.event.id) - Number(b.event.id))

    console.log(`  ${url}  (${copies.length} copies; sync keeps the lowest event id)`)

    for (const { group, event } of copies) {
      console.log(`    ${event.id}  ${formatDate(event.beginsOn)}  ${event.title}`)
      console.log(`      group:      ${group}`)
      console.log(`      event page: ${eventPageUrl(event) || '(no URL)'}`)
    }

    console.log('')
  }
}

for (const { username, events } of groups) {
  for (const event of events) {
    const onlineAddress = event.onlineAddress || null
    const normalizedOnlineAddress = normalizeUrl(onlineAddress)
    const host = normalizedOnlineAddress
      ? new URL(normalizedOnlineAddress).hostname.toLowerCase()
      : null

    const isInIcs = normalizedOnlineAddress && icsUrls.has(normalizedOnlineAddress)
    const isLauti = isInIcs || (host && lautiHosts.has(host))

    // Event is still present in lauti: the normal sync handles it (including
    // reporting and removing duplicates).
    if (isLauti && isInIcs) continue

    const base = {
      id: event.id,
      group: username,
      title: event.title,
      beginsOn: event.beginsOn,
      url: eventPageUrl(event),
      onlineAddress,
    }

    if (isLauti) {
      // Sourced from lauti, but the source URL is no longer in the ICS.
      if (autoremoveDeleted) {
        try {
          await deleteEvent(event.id)
          deleted.push(base)
          console.log(`DELETED stale lauti event: ${event.title}`)
          console.log(`  ${base.url || '(no URL)'}\n`)
        } catch (err) {
          kept.push({
            ...base,
            reason: 'lauti event no longer in ICS; deletion failed',
            error: (err && err.message) || String(err),
          })
        }
      } else {
        kept.push({
          ...base,
          reason: 'lauti event no longer in ICS (kept; use --autoremove-deleted to delete)',
        })
      }
    } else {
      kept.push({
        ...base,
        reason: onlineAddress
          ? 'not sourced from lauti'
          : 'not sourced from lauti (no onlineAddress)',
      })
    }
  }
}

if (deleted.length > 0) {
  console.log(`Deleted ${deleted.length} stale lauti event(s).\n`)
}

if (kept.length === 0) {
  console.log('No other events to report.')
} else {
  console.log(`Events kept (${kept.length}):\n`)
  for (const event of kept) printEvent(event)
}

process.exit(0)
