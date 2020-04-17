// import * as dd from '../src/datadog'
import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import * as yaml from 'js-yaml'

// test('throws invalid number', async () => {
//   const input = parseInt('foo', 10)
//   await expect(wait(input)).rejects.toThrow('milliseconds not a number')
// })

// test('wait 500 ms', async () => {
//   const start = new Date()
//   await wait(500)
//   const end = new Date()
//   var delta = Math.abs(end.getTime() - start.getTime())
//   expect(delta).toBeGreaterThan(450)
// })

// shows how the runner will run a javascript action with env / stdout protocol
test('test runs', () => {
  process.env['INPUT_API-KEY'] = process.env['DD_API_KEY']
  process.env['INPUT_METRICS'] = yaml.safeDump([
    {
      type: 'count',
      name: 'test.builds.count',
      value: 1.0,
      tags: ['foo:bar'],
      host: 'example.com'
    }
  ])
  process.env['INPUT_EVENTS'] = yaml.safeDump([
    {
      title: 'Building success',
      text: 'Version 1.0.0 is available on Docker Hub',
      alert_type: 'info',
      host: 'example.com'
    }
  ])

  const ip = path.join(__dirname, '..', 'lib', 'main.js')
  const options: cp.ExecSyncOptions = {
    env: process.env
  }

  try {
    console.log(cp.execSync(`node ${ip}`, options).toString())
  } catch (e) {
    console.log(e.output.toString())
  }
})
