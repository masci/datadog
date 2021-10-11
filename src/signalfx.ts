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