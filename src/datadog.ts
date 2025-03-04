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

export function getClient(apiKey: string, timeout: number): httpm.HttpClient {
  return new httpm.HttpClient('dd-http-client', [], {
    headers: {
      'DD-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    socketTimeout: timeout
  })
}

function isTimeoutError(error: Error): boolean {
  // force the error into a string so it both works for Error instances and plain strings
  const error_msg = `${error}`
  return error_msg.includes('timeout') || error_msg.includes('Timeout')
}

async function postMetricsIfAny(
  http: httpm.HttpClient,
  apiURL: string,
  metrics: {series: Array<Record<string, unknown>>},
  endpoint: string,
  ignoreTimeouts: boolean
): Promise<void> {
  // POST data
  if (metrics.series.length) {
    try {
      core.debug(
        `About to send ${metrics.series.length} metrics to ${apiURL}/api/${endpoint}`
      )
      const res: httpm.HttpClientResponse = await http.post(
        `${apiURL}/api/${endpoint}`,
        JSON.stringify(metrics)
      )

      if (
        res.message.statusCode === undefined ||
        res.message.statusCode >= 400
      ) {
        throw new Error(
          `HTTP request failed: ${res.message.statusMessage} ${res.message.statusCode}`
        )
      }
    } catch (error) {
      if (ignoreTimeouts && isTimeoutError(error)) {
        core.warning(
          `Timeout occurred while sending metrics, but continuing due to ignore-timeout setting`
        )
        return
      }
      throw error
    }
  }
}

export async function sendMetrics(
  apiURL: string,
  apiKey: string,
  metrics: Metric[],
  ignoreTimeouts: boolean,
  timeout: number
): Promise<void> {
  const http: httpm.HttpClient = getClient(apiKey, timeout)
  // distributions use a different procotol.
  const distributions = {series: Array()}
  const otherMetrics = {series: Array()}
  const now = Date.now() / 1000 // timestamp must be in seconds

  // build series payload containing our metrics
  for (const m of metrics) {
    const isDistribution = m.type === 'distribution'
    const value = isDistribution ? [m.value] : m.value
    const collector = isDistribution ? distributions : otherMetrics
    collector.series.push({
      metric: m.name,
      points: [[now, value]],
      type: m.type,
      host: m.host,
      tags: m.tags
    })
  }

  await postMetricsIfAny(
    http,
    apiURL,
    otherMetrics,
    'v1/series',
    ignoreTimeouts
  )
  await postMetricsIfAny(
    http,
    apiURL,
    distributions,
    'v1/distribution_points',
    ignoreTimeouts
  )
}

export async function sendEvents(
  apiURL: string,
  apiKey: string,
  events: Event[],
  ignoreTimeouts: boolean,
  timeout: number
): Promise<void> {
  const http: httpm.HttpClient = getClient(apiKey, timeout)
  let errors = 0

  core.debug(`About to send ${events.length} events to ${apiURL}/api/v1/events`)
  for (const ev of events) {
    try {
      const res: httpm.HttpClientResponse = await http.post(
        `${apiURL}/api/v1/events`,
        JSON.stringify(ev)
      )
      if (
        res.message.statusCode === undefined ||
        res.message.statusCode >= 400
      ) {
        errors++
        core.error(`HTTP request failed: ${res.message.statusMessage}`)
      }
    } catch (error) {
      if (ignoreTimeouts && isTimeoutError(error)) {
        core.warning(
          `Timeout occurred while sending event, but continuing due to ignore-timeout setting`
        )
        continue
      }
      throw error
    }
  }

  if (errors > 0) {
    throw new Error(`Failed sending ${errors} out of ${events.length} events`)
  }
}

export async function sendServiceChecks(
  apiURL: string,
  apiKey: string,
  serviceChecks: ServiceCheck[],
  ignoreTimeouts: boolean,
  timeout: number
): Promise<void> {
  const http: httpm.HttpClient = getClient(apiKey, timeout)
  let errors = 0

  core.debug(
    `About to send ${serviceChecks.length} service checks to ${apiURL}/api/v1/check_run`
  )
  for (const sc of serviceChecks) {
    try {
      const res: httpm.HttpClientResponse = await http.post(
        `${apiURL}/api/v1/check_run`,
        JSON.stringify(sc)
      )
      if (
        res.message.statusCode === undefined ||
        res.message.statusCode >= 400
      ) {
        errors++
        core.error(`HTTP request failed: ${res.message.statusMessage}`)
      }
    } catch (error) {
      if (ignoreTimeouts && isTimeoutError(error)) {
        core.warning(
          `Timeout occurred while sending service check, but continuing due to ignore-timeout setting`
        )
        continue
      }
      throw error
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
  logs: Log[],
  ignoreTimeouts: boolean,
  timeout: number
): Promise<void> {
  const http: httpm.HttpClient = getClient(apiKey, timeout)
  let errors = 0

  core.debug(`About to send ${logs.length} logs to ${logApiURL}/v1/input`)
  for (const log of logs) {
    try {
      const res: httpm.HttpClientResponse = await http.post(
        `${logApiURL}/v1/input`,
        JSON.stringify(log)
      )
      if (
        res.message.statusCode === undefined ||
        res.message.statusCode >= 400
      ) {
        errors++
        core.error(`HTTP request failed: ${res.message.statusMessage}`)
        throw new Error(`Failed sending ${errors} out of ${logs.length} events`)
      }
    } catch (error) {
      if (ignoreTimeouts && isTimeoutError(error)) {
        core.warning(
          `Timeout occurred while sending logs, but continuing due to ignore-timeout setting`
        )
        continue
      }
      throw error
    }
  }

  if (errors > 0) {
    throw new Error(`Failed sending ${errors} out of ${logs.length} events`)
  }
}
