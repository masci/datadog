import * as core from '@actions/core'
import * as httpm from '@actions/http-client'

export interface Metric {
  type: string
  name: string
  value: number
  tags: string[]
  host: string
}

export interface Event {
  title: string
  text: string
  alert_type: string
  tags: string[]
  host: string
}

export function getClient(apiKey: string): httpm.HttpClient {
  return new httpm.HttpClient('dd-http-client', [], {
    headers: {
      'DD-API-KEY': apiKey,
      'Content-Type': 'application/json'
    }
  })
}

export async function sendMetrics(
  apiURL: string,
  apiKey: string,
  metrics: Metric[]
): Promise<void> {
  const http: httpm.HttpClient = getClient(apiKey)
  const s = {series: Array()}
  const now = Date.now() / 1000 // timestamp must be in seconds

  // build series payload containing our metrics
  for (const m of metrics) {
    s.series.push({
      metric: m.name,
      points: [[now, m.value]],
      type: m.type,
      host: m.host,
      tags: m.tags
    })
  }

  // POST data
  core.debug(`About to send ${metrics.length} metrics`)
  const res: httpm.HttpClientResponse = await http.post(
    `${apiURL}/api/v1/series`,
    JSON.stringify(s)
  )

  if (res.message.statusCode === undefined || res.message.statusCode >= 400) {
    throw new Error(`HTTP request failed: ${res.message.statusMessage}`)
  }
}

export async function sendEvents(
  apiURL: string,
  apiKey: string,
  events: Event[]
): Promise<void> {
  core.debug(`About to send ${events.length} events`)
  const http: httpm.HttpClient = getClient(apiKey)

  let errors = 0
  for (const ev of events) {
    const res: httpm.HttpClientResponse = await http.post(
      `${apiURL}/api/v1/series`,
      JSON.stringify(ev)
    )
    if (res.message.statusCode === undefined || res.message.statusCode >= 400) {
      errors++
      core.error(`HTTP request failed: ${res.message.statusMessage}`)
    }
  }

  if (errors > 0) {
    throw new Error(`Failed sending ${errors} out of ${events.length} events`)
  }
}
