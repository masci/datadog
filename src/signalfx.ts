import * as core from '@actions/core'
import * as httpm from '@actions/http-client'

export interface Metric {
  type: string
  name: string
  value: number
}

export interface ServiceCheck {
  check: string
  status: number
  message: string
  tags: string[]
  host_name: string
}

export interface Event {
  title: string
  text: string
  alert_type: string
  tags: string[]
  host: string
}

export function getClient(token: string): httpm.HttpClient {
  return new httpm.HttpClient('sfx-http-client', [], {
    headers: {
      'X-SF-TOKEN': token,
      'Content-Type': 'application/json'
    }
  })
}

export async function sendEvents(
  apiURL: string,
  token: string,
  events: Event[]
): Promise<void> {
  const http: httpm.HttpClient = getClient(token)

  core.debug(`About to send ${events.length} events`)
  const res: httpm.HttpClientResponse = await http.post(
    `${apiURL}/v2/event`,
    JSON.stringify(events)
  )
  if (res.message.statusCode === undefined || res.message.statusCode >= 400) {
    core.error(`HTTP request failed: ${res.message.statusMessage}`)
    throw new Error(`Failed to send events`)
  }
}

export async function sendMetrics(
  apiURL: string,
  apiKey: string,
  metrics: Metric[]
): Promise<void> {
  const http: httpm.HttpClient = getClient(apiKey)
  const jsonPayload = `{
    "counter": [
      ${metrics
        .filter(metric => metric.type == 'counter')
        .map(
          metric => `
        {
          "metric": "${metric.name}",
          "value": ${metric.value}
        }
      `
        )}
    ]
  }`
  core.debug(`made jsonpayload`)
  // build series payload containing our metrics
  // for (const m of metrics) {
  //   s.series.push({
  //     type: m.type,
  //     value: [[m.value]],
  //     name: m.type
  //   })
  // }

  // POST data
  core.debug(`About to send ${metrics.length} metrics`)
  const res: httpm.HttpClientResponse = await http.post(
    `${apiURL}/v2/datapoint`,
    jsonPayload
  )
  console.log(jsonPayload);
  console.log(await res.readBody());
  if (res.message.statusCode === undefined || res.message.statusCode >= 400) {
    throw new Error(`HTTP request failed: ${res.message.statusMessage}`)
  }
}
