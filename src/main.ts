import * as core from '@actions/core'
import * as dd from './datadog'
import * as yaml from 'js-yaml'

async function run(): Promise<void> {
  try {
    const apiKey: string = core.getInput('api-key')

    const metrics: dd.Metric[] = yaml.safeLoad(core.getInput('metrics'))
    await dd.sendMetrics(apiKey, metrics)

    const events: dd.Event[] = yaml.safeLoad(core.getInput('events'))
    await dd.sendEvents(apiKey, events)
  } catch (error) {
    core.setFailed(`Run failed: ${error.message}`)
  }
}

run()
