import * as core from '@actions/core'
import * as dd from './datadog'
import * as yaml from 'js-yaml'

export async function run(): Promise<void> {
  try {
    const apiKey: string = core.getInput('api-key', {required: true})
    const apiURL: string =
      core.getInput('api-url') || 'https://api.datadoghq.com'

    const metrics: dd.Metric[] =
      (yaml.safeLoad(core.getInput('metrics')) as dd.Metric[]) || []
    await dd.sendMetrics(apiURL, apiKey, metrics)

    const events: dd.Event[] =
      (yaml.safeLoad(core.getInput('events')) as dd.Event[]) || []
    await dd.sendEvents(apiURL, apiKey, events)
  } catch (error) {
    core.setFailed(`Run failed: ${error.message}`)
  }
}
