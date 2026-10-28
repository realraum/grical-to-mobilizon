import pkg from 'ical.js'
const { parse } = pkg

import { getEvents, deleteEvent } from './mob.js'
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

function normalizeUrl(value) {
  if (!value) return null

  try {
    const url = new URL(value.trim())
    url.hash = ''

    // Treat a trailing slash as equivalent, but keep path/query differences.
    if (url.pathname !== '/' && url.href.endsWith('/')) {
      return url.href.slice(0, -1)
    }

    return url.href
  } catch {
    return null
  }
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

console.log(`Lauti source: ${sourceUrl}`)
console.log(`Lauti URLs in ICS: ${icsUrls.size}`)
console.log(`Autoremove deleted lauti events: ${autoremoveDeleted ? 'yes' : 'no'}\n`)

const kept = []
const deleted = []

for (const username of Config.usernames) {
  let result

  try {
    result = await getEvents(username)
  } catch (err) {
    console.error(`Failed to fetch events for group ${username}: ${(err && err.message) || err}`)
    continue
  }

  const group = result.group

  if (!group) {
    console.error(`Group not found: ${username}`)
    continue
  }

  for (const event of group.organizedEvents.elements) {
    const onlineAddress = event.onlineAddress || null
    const normalizedOnlineAddress = normalizeUrl(onlineAddress)
    const host = normalizedOnlineAddress
      ? new URL(normalizedOnlineAddress).hostname.toLowerCase()
      : null

    const isInIcs = normalizedOnlineAddress && icsUrls.has(normalizedOnlineAddress)
    const isLauti = isInIcs || (host && lautiHosts.has(host))

    // Event is still present in lauti: the normal sync handles it.
    if (isLauti && isInIcs) continue

    const base = {
      id: event.id,
      group: username,
      title: event.title,
      beginsOn: event.beginsOn,
      url: event.url || (event.uuid
        ? `${new URL(Config.mobilizon).origin}/events/${event.uuid}`
        : null),
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
