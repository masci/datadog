import {run} from './run'

run()
  .catch(err => {
    process.exit(1)
  })
  .then(() => {
    process.exit(0)
  })
