import * as core from '@actions/core'
import * as sfx from './signalfx'
import * as yaml from 'js-yaml'

export async function run(): Promise<void> {
  try {
    const apiKey: string = core.getInput('token', {required: true})
    const apiURL: string =
      core.getInput('api-url') || 'https://ingest.us1.signalfx.com'

    const metrics: sfx.Metric[] =
      (yaml.safeLoad(core.getInput('metrics')) as sfx.Metric[]) || []
    await sfx.sendMetrics(apiURL, apiKey, metrics)

    core.debug('set metric')
    console.log(metrics)

    const events: sfx.Event[] =
      (yaml.safeLoad(core.getInput('events')) as sfx.Event[]) || []
    await sfx.sendEvents(apiURL, apiKey, events)
  } catch (error: any) {
    core.setFailed(`Run failed: ${error.message}`)
  }
}
