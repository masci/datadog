import * as core from '@actions/core'
import * as yaml from 'js-yaml'
import * as dd from './datadog'

export async function run(): Promise<void> {
  const apiKey: string = core.getInput('api-key', {required: true})
  const apiURL: string = core.getInput('api-url') || 'https://api.datadoghq.com'

  const metrics: dd.Metric[] =
    (yaml.safeLoad(core.getInput('metrics')) as dd.Metric[]) || []
  await dd.sendMetrics(apiURL, apiKey, metrics)

  const events: dd.Event[] =
    (yaml.safeLoad(core.getInput('events')) as dd.Event[]) || []
  await dd.sendEvents(apiURL, apiKey, events)

  const serviceChecks: dd.ServiceCheck[] =
    (yaml.safeLoad(core.getInput('service-checks')) as dd.ServiceCheck[]) || []
  await dd.sendServiceChecks(apiURL, apiKey, serviceChecks)

  const logApiURL: string =
    core.getInput('log-api-url') || 'https://http-intake.logs.datadoghq.com'
  const logs: dd.Log[] =
    (yaml.safeLoad(core.getInput('logs')) as dd.Log[]) || []
  await dd.sendLogs(logApiURL, apiKey, logs)
}
