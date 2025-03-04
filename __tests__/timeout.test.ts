import * as cp from 'child_process'
import * as yaml from 'js-yaml'
import * as path from 'path'
import * as process from 'process'
import * as dd from '../src/datadog'
import {run} from '../src/run'
jest.mock('@actions/http-client')

describe('Datadog client timeout tests', () => {
  it('should handle timeout errors correctly in sendMetrics', async () => {
    // Mock the http client to simulate a timeout
    const mockPost = jest.fn().mockImplementation(() => {
      return new Promise((_, reject) => {
        // Simulate a timeout error
        reject(new Error('Request timeout: /api/v1/series'))
      })
    })

    // Mock the HttpClient constructor
    require('@actions/http-client').HttpClient.mockImplementation(() => ({
      post: mockPost
    }))

    const metric: dd.Metric = {
      type: 'gauge',
      name: 'test.metric',
      value: 1,
      tags: ['test:true'],
      host: 'test-host'
    }

    // Test with ignoreTimeouts = true
    await expect(
      dd.sendMetrics('http://api.url', 'fake-key', [metric], true, 30000)
    ).resolves.not.toThrow()

    // Test with ignoreTimeouts = false
    await expect(
      dd.sendMetrics('http://api.url', 'fake-key', [metric], false, 30000)
    ).rejects.toThrow('Request timeout: /api/v1/series')
  })
})
