// Normalizes event URLs so trivially different spellings map to the same key.
//
// A trailing slash is treated as equivalent (except for the root path) and the
// #fragment is dropped. Path and query differences are preserved on purpose,
// they identify different events.
export function normalizeUrl(value) {
  if (!value) return null

  try {
    const url = new URL(String(value).trim())
    url.hash = ''

    if (url.pathname !== '/' && url.href.endsWith('/')) {
      return url.href.slice(0, -1)
    }

    return url.href
  } catch {
    return null
  }
}

// Hosts whose events the sync reads from and writes to mobilizon. Must be the
// same set in index.js (what gets synced) and report-foreign-events.js (what is
// reported as duplicate).
export function syncLautiHosts(config) {
  return new Set([
    'laut.realraum.at', // keep working with configs that have no lautiHosts entry
    ...(Array.isArray(config.lautiHosts) ? config.lautiHosts : []),
  ].map(host => host.toLowerCase()))
}
