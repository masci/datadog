import * as core from '@actions/core'
import {run} from './run'

run()
  .catch(err => {
    core.setFailed(err.message)
    process.exit(1)
  })
  .then(() => {
    process.exit(0)
  })
