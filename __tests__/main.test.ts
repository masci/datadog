import {run} from '../src/run'
import * as sfx from '../src/signalfx'
import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import * as yaml from 'js-yaml'
jest.mock('../src/signalfx')

describe('unit-tests', () => {
  let outSpy: jest.SpyInstance

  beforeEach(() => {
    process.env['INPUT_TOKEN'] = 'fooBarBaz'
    outSpy = jest.spyOn(process.stdout, 'write')
  })

  afterEach(() => {
    outSpy.mockClear()
    jest.clearAllMocks()
  })

  test('token input param must be set', async () => {
    process.env['INPUT_TOKEN'] = ''
    await run()
    expect(sfx.sendEvents).toHaveBeenCalledTimes(0)
    expect(outSpy).toHaveBeenCalledWith(
      '::error::Run failed: Input required and not supplied: token\n'
    )
  })

  test('default api endpoint URL', async () => {
    await run()
    expect(sfx.sendEvents).toHaveBeenCalledWith(
      'https://ingest.us1.signalfx.com',
      'fooBarBaz',
      []
    )
  })

  test('custom api endpoint URL', async () => {
    process.env['INPUT_API-URL'] = 'http://example.com'
    await run()
    expect(sfx.sendEvents).toHaveBeenCalledWith(
      'http://example.com',
      'fooBarBaz',
      []
    )
    process.env['INPUT_API-URL'] = ''
  })

  test('run calls the sending functions', async () => {
    await run()
    expect(sfx.sendEvents).toHaveBeenCalledWith(
      'https://ingest.us1.signalfx.com',
      'fooBarBaz',
      []
    )
  })
})

describe('end-to-end tests', () => {
  it('actually sends data to the backend when SFX_TOKEN env var is set', () => {
    process.env['INPUT_TOKEN'] = process.env['SFX_TOKEN'] || ''
    if (process.env['INPUT_TOKEN'] === '') {
      return
    }

    process.env['INPUT_EVENTS'] = yaml.safeDump([
      {
        dimensions: {dimension1: 'value1', dimension2: 'value2'},
        eventType: 'Test',
        properties: {property1: 'value1', property2: 'value2'},
        category: 'USER_DEFINED'
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
})
