import * as core from '@actions/core'
import * as httpm from '@actions/http-client'

/**
 * Represents a Datadog metric to be submitted via the metrics API.
 * Supports all standard Datadog metric types: count, gauge, rate, and distribution.
 * Distribution metrics are submitted to a separate endpoint and require their
 * value to be wrapped in an array when building the series payload.
 */
export interface Metric {
  /** The metric type: 'count', 'gauge', 'rate', or 'distribution'. */
  type: string
  /** The dot-separated metric name (e.g. 'myapp.requests.count'). */
  name: string
  /** The numeric value to record for the metric. */
  value: number
  /** Optional list of tags in 'key:value' format to attach to the metric. */
  tags: string[]
  /** The hostname to associate with the metric. */
  host: string
}

/**
 * Represents a Datadog event to be submitted via the events API.
 * Events appear in the Datadog event stream and can optionally trigger monitors.
 */
export interface Event {
  /** A short title for the event. */
  title: string
  /** The full body text of the event. */
  text: string
  /** The severity level: 'error', 'warning', 'info', or 'success'. */
  alert_type: string
  /** Optional list of tags in 'key:value' format to attach to the event. */
  tags: string[]
  /** The hostname to associate with the event. */
  host: string
}

/**
 * Represents a Datadog service check result to be submitted via the check_run API.
 * Service checks report the status of a named check and appear on host and service maps.
 */
export interface ServiceCheck {
  /** The name of the service check (e.g. 'app.ok'). */
  check: string
  /** The check status: 0 (OK), 1 (WARNING), 2 (CRITICAL), or 3 (UNKNOWN). */
  status: number
  /** An optional descriptive message for the check result. */
  message: string
  /** Optional list of tags in 'key:value' format to attach to the service check. */
  tags: string[]
  /** The hostname to associate with the service check. */
  host_name: string
}

/**
 * Represents a Datadog log entry to be submitted via the log ingestion API.
 * Logs appear in the Datadog Log Management interface.
 */
export interface Log {
  /** The technology or integration source of the log (e.g. 'nginx', 'python'). */
  ddsource: string
  /** Comma-separated list of tags to attach to the log (e.g. 'env:staging,version:1.0'). */
  ddtags: string
  /** The hostname from which the log originates. */
  hostname: string
  /** The log message body. */
  message: string
  /** The name of the application or service that produced the log. */
  service: string
}

/**
 * Creates and returns a pre-configured HTTP client for communicating with the Datadog API.
 * The client automatically injects the required `DD-API-KEY` authentication header and
 * sets `Content-Type` to `application/json` on every request.
 *
 * @param apiKey   A valid Datadog API key used to authenticate requests.
 * @param timeout  Socket timeout in milliseconds; requests that stall longer than this
 *                 value will be aborted with a timeout error.
 * @returns        A configured `HttpClient` instance ready to post data to Datadog.
 */
export function getClient(apiKey: string, timeout: number): httpm.HttpClient {
  return new httpm.HttpClient('dd-http-client', [], {
    headers: {
      'DD-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    socketTimeout: timeout
  })
}

/**
 * Determines whether a caught error represents an HTTP socket timeout.
 * The check is performed against the string representation of the error so that
 * it works for both `Error` instances and plain string rejections.
 *
 * @param error  The error object (or string) thrown by the HTTP client.
 * @returns      `true` if the error message contains the literal string `'timeout'` or
 *               `'Timeout'` (i.e. two specific case variants are checked, not a full
 *               case-insensitive match).
 */
function isTimeoutError(error: Error): boolean {
  // force the error into a string so it both works for Error instances and plain strings
  const error_msg = `${error}`
  return error_msg.includes('timeout') || error_msg.includes('Timeout')
}

/**
 * Posts a metrics series payload to a Datadog API endpoint, but only when the
 * series contains at least one data point (empty batches are silently skipped).
 *
 * If the server returns an HTTP 4xx/5xx status the function throws an error.
 * When `ignoreTimeouts` is `true` and the HTTP client raises a timeout error,
 * the error is downgraded to a warning and the function returns normally so that
 * the overall workflow step can continue.
 *
 * @param http            The pre-configured Datadog HTTP client.
 * @param apiURL          Base URL of the Datadog API (e.g. 'https://api.datadoghq.com').
 * @param metrics         The series payload object (must have a `series` array property).
 * @param endpoint        The API path to POST to (e.g. 'v1/series').
 * @param ignoreTimeouts  When `true`, socket timeouts are logged as warnings instead of
 *                        being re-thrown.
 */
async function postMetricsIfAny(
  http: httpm.HttpClient,
  apiURL: string,
  metrics: {series: Array<Record<string, unknown>>},
  endpoint: string,
  ignoreTimeouts: boolean
): Promise<void> {
  // POST data
  if (metrics.series.length) {
    try {
      core.debug(
        `About to send ${metrics.series.length} metrics to ${apiURL}/api/${endpoint}`
      )
      const res: httpm.HttpClientResponse = await http.post(
        `${apiURL}/api/${endpoint}`,
        JSON.stringify(metrics)
      )

      if (
        res.message.statusCode === undefined ||
        res.message.statusCode >= 400
      ) {
        throw new Error(
          `HTTP request failed: ${res.message.statusMessage} ${res.message.statusCode}`
        )
      }
    } catch (error) {
      if (ignoreTimeouts && isTimeoutError(error)) {
        core.warning(
          `Timeout occurred while sending metrics, but continuing due to ignore-timeout setting`
        )
        return
      }
      throw error
    }
  }
}

/**
 * Sends a batch of metrics to Datadog.
 *
 * Metrics are split into two groups before transmission:
 * - **Distribution metrics** (`type === 'distribution'`) are posted to the
 *   `/api/v1/distribution_points` endpoint because they use a different wire
 *   format (the value is wrapped in an array).
 * - **All other metric types** (count, gauge, rate, …) are posted to the
 *   standard `/api/v1/series` endpoint.
 *
 * Both requests share the same HTTP client and respect the `ignoreTimeouts`
 * flag – if the flag is set and a request times out, a warning is emitted and
 * execution continues instead of failing the step.
 *
 * @param apiURL          Base URL of the Datadog API (e.g. 'https://api.datadoghq.com').
 * @param apiKey          A valid Datadog API key.
 * @param metrics         Array of {@link Metric} objects to submit.
 * @param ignoreTimeouts  When `true`, socket timeouts are treated as warnings and do not
 *                        cause the action to fail.
 * @param timeout         Socket timeout in milliseconds for the underlying HTTP client.
 */
export async function sendMetrics(
  apiURL: string,
  apiKey: string,
  metrics: Metric[],
  ignoreTimeouts: boolean,
  timeout: number
): Promise<void> {
  const http: httpm.HttpClient = getClient(apiKey, timeout)
  // distributions use a different procotol.
  const distributions = {series: Array()}
  const otherMetrics = {series: Array()}
  const now = Date.now() / 1000 // timestamp must be in seconds

  // build series payload containing our metrics
  for (const m of metrics) {
    const isDistribution = m.type === 'distribution'
    const value = isDistribution ? [m.value] : m.value
    const collector = isDistribution ? distributions : otherMetrics
    collector.series.push({
      metric: m.name,
      points: [[now, value]],
      type: m.type,
      host: m.host,
      tags: m.tags
    })
  }

  await postMetricsIfAny(
    http,
    apiURL,
    otherMetrics,
    'v1/series',
    ignoreTimeouts
  )
  await postMetricsIfAny(
    http,
    apiURL,
    distributions,
    'v1/distribution_points',
    ignoreTimeouts
  )
}

/**
 * Sends a collection of events to the Datadog events API (`/api/v1/events`).
 *
 * Each event is POSTed individually. HTTP errors are counted rather than
 * immediately re-thrown so that the remaining events are still attempted; once
 * all events have been processed, a single aggregated error is thrown if any
 * individual request failed.
 *
 * Timeout handling follows the same contract as {@link sendMetrics}: when
 * `ignoreTimeouts` is `true`, timed-out requests emit a warning and the loop
 * continues to the next event instead of aborting.
 *
 * @param apiURL          Base URL of the Datadog API (e.g. 'https://api.datadoghq.com').
 * @param apiKey          A valid Datadog API key.
 * @param events          Array of {@link Event} objects to submit.
 * @param ignoreTimeouts  When `true`, socket timeouts are treated as warnings and do not
 *                        cause the action to fail.
 * @param timeout         Socket timeout in milliseconds for the underlying HTTP client.
 */
export async function sendEvents(
  apiURL: string,
  apiKey: string,
  events: Event[],
  ignoreTimeouts: boolean,
  timeout: number
): Promise<void> {
  const http: httpm.HttpClient = getClient(apiKey, timeout)
  let errors = 0

  core.debug(`About to send ${events.length} events to ${apiURL}/api/v1/events`)
  for (const ev of events) {
    try {
      const res: httpm.HttpClientResponse = await http.post(
        `${apiURL}/api/v1/events`,
        JSON.stringify(ev)
      )
      if (
        res.message.statusCode === undefined ||
        res.message.statusCode >= 400
      ) {
        errors++
        core.error(`HTTP request failed: ${res.message.statusMessage}`)
      }
    } catch (error) {
      if (ignoreTimeouts && isTimeoutError(error)) {
        core.warning(
          `Timeout occurred while sending event, but continuing due to ignore-timeout setting`
        )
        continue
      }
      throw error
    }
  }

  if (errors > 0) {
    throw new Error(`Failed sending ${errors} out of ${events.length} events`)
  }
}

/**
 * Sends a collection of service check results to the Datadog check_run API
 * (`/api/v1/check_run`).
 *
 * Each service check is POSTed individually. HTTP errors are accumulated so that
 * every check is attempted regardless of prior failures; a single aggregated error
 * is thrown after all checks have been processed if any request failed.
 *
 * Timeout handling mirrors {@link sendEvents}: when `ignoreTimeouts` is `true`,
 * timed-out requests emit a warning and the loop moves on to the next check.
 *
 * @param apiURL          Base URL of the Datadog API (e.g. 'https://api.datadoghq.com').
 * @param apiKey          A valid Datadog API key.
 * @param serviceChecks   Array of {@link ServiceCheck} objects to submit.
 * @param ignoreTimeouts  When `true`, socket timeouts are treated as warnings and do not
 *                        cause the action to fail.
 * @param timeout         Socket timeout in milliseconds for the underlying HTTP client.
 */
export async function sendServiceChecks(
  apiURL: string,
  apiKey: string,
  serviceChecks: ServiceCheck[],
  ignoreTimeouts: boolean,
  timeout: number
): Promise<void> {
  const http: httpm.HttpClient = getClient(apiKey, timeout)
  let errors = 0

  core.debug(
    `About to send ${serviceChecks.length} service checks to ${apiURL}/api/v1/check_run`
  )
  for (const sc of serviceChecks) {
    try {
      const res: httpm.HttpClientResponse = await http.post(
        `${apiURL}/api/v1/check_run`,
        JSON.stringify(sc)
      )
      if (
        res.message.statusCode === undefined ||
        res.message.statusCode >= 400
      ) {
        errors++
        core.error(`HTTP request failed: ${res.message.statusMessage}`)
      }
    } catch (error) {
      if (ignoreTimeouts && isTimeoutError(error)) {
        core.warning(
          `Timeout occurred while sending service check, but continuing due to ignore-timeout setting`
        )
        continue
      }
      throw error
    }
  }

  if (errors > 0) {
    throw new Error(
      `Failed sending ${errors} out of ${serviceChecks.length} events`
    )
  }
}

/**
 * Sends a collection of log entries to the Datadog log ingestion API
 * (`/v1/input` on the log-intake host).
 *
 * Each log entry is POSTed individually to the separate log intake URL (which
 * differs from the main API URL used by metrics, events, and service checks).
 * Unlike {@link sendEvents} and {@link sendServiceChecks} which accumulate HTTP errors
 * across the full batch and throw a single aggregated error at the end, `sendLogs`
 * throws immediately on the first HTTP error response (the error counter is incremented
 * and an error is thrown inside the loop body, which causes the `catch` block to
 * re-throw it without waiting for remaining log entries).  The guard at the end of
 * the function is therefore a safety net that is only reached when no per-entry error
 * was thrown (e.g. if future refactoring changes the inner throw).
 *
 * Timeout handling follows the same contract as the other send functions: when
 * `ignoreTimeouts` is `true`, timed-out requests emit a warning and the loop
 * continues to the next log entry.
 *
 * @param logApiURL       Base URL of the Datadog log intake API
 *                        (e.g. 'https://http-intake.logs.datadoghq.com').
 * @param apiKey          A valid Datadog API key.
 * @param logs            Array of {@link Log} objects to submit.
 * @param ignoreTimeouts  When `true`, socket timeouts are treated as warnings and do not
 *                        cause the action to fail.
 * @param timeout         Socket timeout in milliseconds for the underlying HTTP client.
 */
export async function sendLogs(
  logApiURL: string,
  apiKey: string,
  logs: Log[],
  ignoreTimeouts: boolean,
  timeout: number
): Promise<void> {
  const http: httpm.HttpClient = getClient(apiKey, timeout)
  let errors = 0

  core.debug(`About to send ${logs.length} logs to ${logApiURL}/v1/input`)
  for (const log of logs) {
    try {
      const res: httpm.HttpClientResponse = await http.post(
        `${logApiURL}/v1/input`,
        JSON.stringify(log)
      )
      if (
        res.message.statusCode === undefined ||
        res.message.statusCode >= 400
      ) {
        errors++
        core.error(`HTTP request failed: ${res.message.statusMessage}`)
        throw new Error(`Failed sending ${errors} out of ${logs.length} events`)
      }
    } catch (error) {
      if (ignoreTimeouts && isTimeoutError(error)) {
        core.warning(
          `Timeout occurred while sending logs, but continuing due to ignore-timeout setting`
        )
        continue
      }
      throw error
    }
  }

  if (errors > 0) {
    throw new Error(`Failed sending ${errors} out of ${logs.length} events`)
  }
}
