import * as core from '@actions/core'
import * as dd from './datadog'

async function run(): Promise<void> {
  try {
    const apiKey: string = core.getInput('api-key')

    const metrics: dd.Metric[] = JSON.parse(core.getInput('metrics'))
    await dd.sendMetrics(apiKey, metrics)

    const events: dd.Event[] = JSON.parse(core.getInput('events'))
    await dd.sendEvents(apiKey, events)
  } catch (error) {
    core.setFailed(`Run failed: ${error.message}`)
  }
}

run()
