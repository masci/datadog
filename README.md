# Signalfx Action

[![Build Status](https://github.com/actions/typescript-action/workflows/build-test/badge.svg)](https://github.com/actions/typescript-action/actions)

This Action lets you send events to Signalfx from a GitHub workflow. 

Forked from [masci/datadog](https://github.com/masci/datadog) and translated for Signalfx

## Usage

The action can send events to any Signalfx site by setting the `api-url` param. When
omitted, it defaults to the US endpoint: `https://ingest.us1.signalfx.com`.

You can send Signalfx events from workflows. Please note
how `events` is indeed a string containing YAML code. For example, an use case
might be sending an event when a job has failed:

```yaml
steps:
  - name: checkout
    uses: actions/checkout@v2
  - name: build
    run: this-will-fail
  - name: Signalfx
    if: failure()
    uses: RentTheRunway/signalfx-reporting-action@v1
    with:
      token: ${{ secrets.SIGNALFX_TOKEN }}
      events: |
        - eventType: 'Test'
          dimensions: {dimension1: 'value1', dimension2: 'value2'}
          properties: {property1: 'value1', property2: 'value2'}
          category: 'USER_DEFINED'
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

> signalfx-action@1.0.0 test /signalfx
> jest

 PASS  __tests__/main.test.ts
  unit-tests
    ✓ token input param must be set (3 ms)
    ✓ default api endpoint URL (1 ms)
    ✓ custom api endpoint URL
    ✓ run calls the sending functions (1 ms)
  end-to-end tests
    ✓ actually sends data to the backend when SFX_TOKEN env var is set
...
Ran all test suites.
```

When the SFX_TOKEN env var is set with a valid token, the tests will
also perform an actual call sending some events.
