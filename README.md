# Datadog Action

[![Build Status](https://github.com/actions/typescript-action/workflows/build-test/badge.svg)](https://github.com/actions/typescript-action/actions)

This Action lets you send events and metrics to Datadog from a GitHub workflow.

## Usage

The action can send metrics and events to any Datadog site by setting the `api-url` param. When
omitted, it defaults to the US endpoint: `https://api.datadoghq.com`.

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
