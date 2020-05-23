/* eslint-disable node/no-process-exit */
/**
 * kmore-cli
 * command: gen  case insensitive
 */

import * as yargs from 'yargs'

import { genCmdHelp, helpDefault } from '../lib/helper'
import { runCmd } from '../lib/index'
import { CliArgs } from '../lib/model'
import { parseCliArgs, parseCliOpts } from '../lib/parse-opts'
// log(yargs.argv)

let args!: CliArgs

try {
  args = parseCliArgs(yargs.argv)
}
catch (ex) {
  console.info((ex as Error).message)
  process.exit(1)
}


if (args.cmd) {
  if (args.needHelp) {
    const msg = genCmdHelp(args.cmd)
    console.info(msg)
    process.exit(0)
  }
  else {
    // eslint-disable-next-line id-length
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    args.options = parseCliOpts(args.cmd, { ...yargs.argv, _: '' })
    args.debug && console.info(args)

    runCmd(args).subscribe(
      data => console.info(data),
      (err: Error) => {
        if (err.message) {
          console.info(err.message)
        }
        else {
          console.info(err)
        }

        return err.message.includes('-h')
          ? process.exit(0)
          : process.exit(1)
      },
    )

  }
}
else {
  const msg = helpDefault()
  console.info(msg)
  process.exit(0)
}

