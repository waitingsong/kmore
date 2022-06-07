/* eslint-disable node/no-process-exit */
/**
 * kmore-cli
 * command: gen  case insensitive
 */
import minimist from 'minimist'

import { genCmdHelp, helpDefault } from '../lib/helper'
import { runCmd } from '../lib/index'
import { parseCliArgs, parseCliOpts } from '../lib/process-opts'
import { CliArgs, InputOptions } from '../lib/types'
// log(yargs.argv)

let args!: CliArgs
const argv = minimist<InputOptions>(process.argv.slice(2))

try {
  args = parseCliArgs(argv)
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
    const ps = { ...argv, _: '' } as unknown as InputOptions
    args.options = parseCliOpts(args.cmd, ps)
    args.debug && console.info(args)

    runCmd(args).subscribe({
      next: data => console.info(data),
      error: (err: Error) => {
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
    })

  }
}
else {
  const msg = helpDefault()
  console.info(msg)
  process.exit(0)
}

