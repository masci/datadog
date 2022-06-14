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

export interface ServiceCheck {
  check: string
  status: number
  message: string
  tags: string[]
  host_name: string
}

export interface Log {
  ddsource: string
  ddtags: string
  hostname: string
  message: string
  service: string
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
  const http: httpm.HttpClient = getClient(apiKey)
  let errors = 0

  core.debug(`About to send ${events.length} events`)
  for (const ev of events) {
    const res: httpm.HttpClientResponse = await http.post(
      `${apiURL}/api/v1/events`,
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

export async function sendServiceChecks(
  apiURL: string,
  apiKey: string,
  serviceChecks: ServiceCheck[]
): Promise<void> {
  const http: httpm.HttpClient = getClient(apiKey)
  let errors = 0

  core.debug(`About to send ${serviceChecks.length} service checks`)
  for (const sc of serviceChecks) {
    const res: httpm.HttpClientResponse = await http.post(
      `${apiURL}/api/v1/check_run`,
      JSON.stringify(sc)
    )
    if (res.message.statusCode === undefined || res.message.statusCode >= 400) {
      errors++
      core.error(`HTTP request failed: ${res.message.statusMessage}`)
    }
  }

  if (errors > 0) {
    throw new Error(
      `Failed sending ${errors} out of ${serviceChecks.length} events`
    )
  }
}

export async function sendLogs(
  logApiURL: string,
  apiKey: string,
  logs: Log[]
): Promise<void> {
  const http: httpm.HttpClient = getClient(apiKey)
  let errors = 0

  core.debug(`About to send ${logs.length} logs`)
  for (const log of logs) {
    const res: httpm.HttpClientResponse = await http.post(
      `${logApiURL}/v1/input`,
      JSON.stringify(log)
    )
    if (res.message.statusCode === undefined || res.message.statusCode >= 400) {
      errors++
      core.error(`HTTP request failed: ${res.message.statusMessage}`)
      throw new Error(`Failed sending ${errors} out of ${logs.length} events`)
    }
  }

  if (errors > 0) {
    throw new Error(`Failed sending ${errors} out of ${logs.length} events`)
  }
}
