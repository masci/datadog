import {run} from '../src/run'
import * as dd from '../src/datadog'
import * as process from 'process'
import * as core from '@actions/core'
import * as cp from 'child_process'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { getHeapStatistics } from 'v8'
jest.mock('../src/datadog')

describe('unit-tests', ()=>{
  let outSpy: jest.SpyInstance

  beforeEach(()=>{
    process.env['INPUT_API-KEY'] = 'fooBarBaz'
    outSpy = jest.spyOn(process.stdout, 'write');
  })

  afterEach(() => {
    outSpy.mockClear();
    jest.clearAllMocks();
  });

  test('api-key input param must be set', async () => {
    process.env['INPUT_API-KEY'] = ''
    await run()
    expect(dd.sendMetrics).toHaveBeenCalledTimes(0)
    expect(dd.sendEvents).toHaveBeenCalledTimes(0)
    expect(outSpy).toHaveBeenCalledWith('::error::Run failed: Input required and not supplied: api-key\n')
  })

  test('default api endpoint URL', async ()=>{
    await run()
    expect(dd.sendMetrics).toHaveBeenCalledWith('https://api.datadoghq.com', 'fooBarBaz', [])
  })

  test('custom api endpoint URL', async ()=>{
    process.env['INPUT_API-URL'] = 'http://example.com'
    await run()
    expect(dd.sendMetrics).toHaveBeenCalledWith('http://example.com', 'fooBarBaz', [])
    process.env['INPUT_API-URL'] = ''
  })

  test('run calls the sending functions', async () => {
    await run()
    expect(dd.sendMetrics).toHaveBeenCalledWith('https://api.datadoghq.com', 'fooBarBaz', [])
    expect(dd.sendEvents).toHaveBeenCalledWith('https://api.datadoghq.com', 'fooBarBaz', [])
  })
})

describe('end-to-end tests', ()=>{
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
})
