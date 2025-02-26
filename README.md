# Datadog Action

[![build-test](https://github.com/masci/datadog/actions/workflows/test.yml/badge.svg)](https://github.com/masci/datadog/actions/workflows/test.yml)

This Action lets you send events and metrics to Datadog from a GitHub workflow.

## Usage

> [!IMPORTANT]
> The action can send metrics and events to any Datadog site by setting the `api-url` param. When
> omitted, it defaults to the US endpoint: `https://api.datadoghq.com`.

Please note how `metrics` is defined as a string containing YAML code - this
allows to send more than one metric at once if needed. To send one metric,
configure a job step like the following:

```yaml
- name: Build count
  uses: masci/datadog@v1
  with:
    api-key: ${{ secrets.DATADOG_API_KEY }}
    metrics: |
      - type: "count"
        name: "test.runs.count"
        value: 1.0
        host: ${{ github.repository_owner }}
        tags:
          - "project:${{ github.repository }}"
          - "branch:${{ github.head_ref }}"
```

You can also send Datadog events from workflows, same as `metric` please note
how `events` is indeed a string containing YAML code. For example, an use case
might be sending an event when a job has failed:

```yaml
steps:
  - name: checkout
    uses: actions/checkout@v2
  - name: build
    run: this-will-fail
  - name: Datadog
    if: failure()
    uses: masci/datadog@v1
    with:
      api-key: ${{ secrets.DATADOG_API_KEY }}
      events: |
        - title: "Failed building Foo"
          text: "Branch ${{ github.head_ref }} failed to build"
          alert_type: "error"
          host: ${{ github.repository_owner }}
          tags:
            - "project:${{ github.repository }}"
```

You can also send Datadog service checks from workflows, same as others please note
how `service-checks` is indeed a string containing YAML code. For example, an use case
might be sending when a job has failed:

```yaml
steps:
  - name: checkout
    uses: actions/checkout@v2
  - name: build
    run: this-will-fail
  - name: Datadog
    if: failure()
    uses: masci/datadog@v1
    with:
      api-key: ${{ secrets.DATADOG_API_KEY }}
      service-checks: |
        - check: "app.ok"
          message: "Branch ${{ github.head_ref }} failed to build"
          status: 0
          host_name: ${{ github.repository_owner }}
          tags:
            - "project:${{ github.repository }}"
```

You can also send Datadog logs from workflows, same as others please note
how `logs` is indeed a string containing YAML code. For example, an use case
might be sending when a job has failed:

```yaml
steps:
  - name: checkout
    uses: actions/checkout@v2
  - name: build
    run: this-will-fail
  - name: Datadog
    if: failure()
    uses: masci/datadog@v1
    with:
      api-key: ${{ secrets.DATADOG_API_KEY }}
      logs: |
        - ddsource: "nginx"
          ddtags: "env:staging,version:5.1"
          hostname: "i-012345678"
          message: "{\"message\":\"2019-11-19T14:37:58,995 ERROR [process.name][20081] Hello World\", \"level\":\"error\"}"
          service: "payment"
```

## Inputs

```yaml
- name: Datadog
  uses: masci/datadog@v1
  with:
    # The api key to use.
    # Type: string
    # Required
    api-key: ${{ secrets.DATADOG_API_KEY }}

    # The ingestion endpoint to use, US by default.
    # Type: string
    # Default: 'https://api.datadoghq.com'
    api-url: ''

    # The URL of the Log API endpoint.
    # Type: string
    # Default: 'https://http-intake.logs.datadoghq.com'
    log-api-url: ''

    # If true, timeout errors will be ignored and step will always succeed
    # Type: boolean
    # Default: false
    ignore-timeouts:

    # A list of metric objects to send, defined in YAML format
    # Type: string
    # Default: '[]'
    metrics: ''

    # A list of event objects to send, defined in YAML format.
    # Type: string
    # Default: '[]'
    events: ''

    # A list of service check objects to send, defined in YAML format.
    # Type: string
    # Default: '[]'
    service-checks: ''

    # A list of log objects to send, defined in YAML format.
    # Type: string
    # Default: '[]'
    logs: ''
```

## Development

Install the dependencies
```bash
$ npm install
```

Lint, test and build the typescript and package it for distribution
```bash
$ npm run all
```

Run the tests :heavy_check_mark:
```bash
$ npm test

> datadog-action@1.0.0 test /datadog
> jest

 PASS  __tests__/main.test.ts
  unit-tests
    ✓ api-key input param must be set (3 ms)
    ✓ default api endpoint URL (1 ms)
    ✓ custom api endpoint URL
    ✓ run calls the sending functions (1 ms)
  end-to-end tests
    ✓ actually sends data to the backend when DD_API_KEY env var is set
...
Ran all test suites.
```

When the DD_API_KEY env var is set with a valid API Key, the tests will
also perform an actual call sending some metrics, events and service checks.
