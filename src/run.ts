import * as core from '@actions/core'
import * as dd from './datadog'
import * as yaml from 'js-yaml'
import * as fs from 'fs'

const loadFromFile = (filename: string): string => {
  if (!filename || !fs.existsSync(filename)) return ''

  return fs.readFileSync(filename, 'utf8').toString()
}
export async function run(): Promise<void> {
  try {
    const apiKey: string = core.getInput('api-key', {required: true})
    const apiURL: string =
      core.getInput('api-url') || 'https://api.datadoghq.com'

    const metrics: dd.Metric[] =
      (yaml.safeLoad(
        loadFromFile(core.getInput('metrics-file'))
      ) as dd.Metric[]) ||
      (yaml.safeLoad(core.getInput('metrics')) as dd.Metric[]) ||
      []
    await dd.sendMetrics(apiURL, apiKey, metrics)

    const events: dd.Event[] =
      (yaml.safeLoad(
        loadFromFile(core.getInput('events-file'))
      ) as dd.Event[]) ||
      (yaml.safeLoad(core.getInput('events')) as dd.Event[]) ||
      []
    await dd.sendEvents(apiURL, apiKey, events)

    const serviceChecks: dd.ServiceCheck[] =
      (yaml.safeLoad(
        loadFromFile(core.getInput('service-checks-file'))
      ) as dd.ServiceCheck[]) ||
      (yaml.safeLoad(core.getInput('service-checks')) as dd.ServiceCheck[]) ||
      []
    await dd.sendServiceChecks(apiURL, apiKey, serviceChecks)

    const logApiURL: string =
      core.getInput('log-api-url') || 'https://http-intake.logs.datadoghq.com'
    const logs: dd.Log[] =
      (yaml.safeLoad(loadFromFile(core.getInput('logs-file'))) as dd.Log[]) ||
      (yaml.safeLoad(core.getInput('logs')) as dd.Log[]) ||
      []
    await dd.sendLogs(logApiURL, apiKey, logs)
  } catch (error) {
    core.setFailed(`Run failed: ${error.message}`)
  }
}
