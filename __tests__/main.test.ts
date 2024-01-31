import * as cp from 'child_process'
import * as yaml from 'js-yaml'
import * as path from 'path'
import * as process from 'process'
import * as dd from '../src/datadog'
import {run} from '../src/run'
jest.mock('../src/datadog')

describe('unit-tests', () => {
  let outSpy: jest.SpyInstance

  beforeEach(() => {
    process.env['INPUT_API-KEY'] = 'fooBarBaz'
    outSpy = jest.spyOn(process.stdout, 'write')
  })

  afterEach(() => {
    outSpy.mockClear()
    jest.clearAllMocks()
  })

  test('default api endpoint URL', async () => {
    await run()
    expect(dd.sendMetrics).toHaveBeenCalledWith(
      'https://api.datadoghq.com',
      'fooBarBaz',
      []
    )
  })

  test('custom api endpoint URL', async () => {
    process.env['INPUT_API-URL'] = 'http://example.com'
    await run()
    expect(dd.sendMetrics).toHaveBeenCalledWith(
      'http://example.com',
      'fooBarBaz',
      []
    )
    process.env['INPUT_API-URL'] = ''
  })

  test('default log api endpoint URL', async () => {
    await run()
    expect(dd.sendLogs).toHaveBeenCalledWith(
      'https://http-intake.logs.datadoghq.com',
      'fooBarBaz',
      []
    )
  })

  test('custom log api endpoint URL', async () => {
    process.env['INPUT_LOG-API-URL'] = 'http://example.com'
    await run()
    expect(dd.sendLogs).toHaveBeenCalledWith(
      'http://example.com',
      'fooBarBaz',
      []
    )
    process.env['INPUT_LOG-API-URL'] = ''
  })

  test('run calls the sending functions', async () => {
    await run()
    expect(dd.sendMetrics).toHaveBeenCalledWith(
      'https://api.datadoghq.com',
      'fooBarBaz',
      []
    )
    expect(dd.sendEvents).toHaveBeenCalledWith(
      'https://api.datadoghq.com',
      'fooBarBaz',
      []
    )
    expect(dd.sendServiceChecks).toHaveBeenCalledWith(
      'https://api.datadoghq.com',
      'fooBarBaz',
      []
    )
    expect(dd.sendLogs).toHaveBeenCalledWith(
      'https://http-intake.logs.datadoghq.com',
      'fooBarBaz',
      []
    )
  })
})

describe('end-to-end tests', () => {
  it('actually sends data to the backend when DD_API_KEY env var is set', () => {
    process.env['INPUT_API-KEY'] = process.env['DD_API_KEY'] || ''
    if (process.env['INPUT_API-KEY'] === '') {
      return
    }

    process.env['INPUT_METRICS'] = yaml.safeDump([
      {
        type: 'count',
        name: 'test.builds.count',
        value: 1.0,
        tags: ['foo:bar'],
        host: 'example.com'
      },
      {
        type: 'distribution',
        name: 'test.builds.distribution',
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
    process.env['INPUT_SERVICE-CHECKS'] = yaml.safeDump([
      {
        check: 'app.ok',
        message: 'Build has failed',
        status: 0,
        host_name: 'example.com',
        tags: ['foo:bar']
      }
    ])
    process.env['INPUT_LOGS'] = yaml.safeDump([
      {
        ddsource: 'nginx',
        ddtags: 'env:staging,version:5.1',
        hostname: 'i-012345678',
        message:
          '2019-11-19T14:37:58,995 INFO [process.name][20081] Hello World',
        service: 'payment'
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
      throw e
    }
  })
})
