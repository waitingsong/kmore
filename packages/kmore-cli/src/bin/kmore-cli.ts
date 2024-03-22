/**
 * kmore-cli
 * command: gen  case insensitive
 */
import minimist from 'minimist'

import { genCmdHelp, helpDefault } from '../lib/helper.js'
import { runCmd } from '../lib/index.js'
import { parseCliArgs, parseCliOpts } from '../lib/process-opts.js'
import { CliArgs, InputOptions } from '../lib/types.js'
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

    const data = await runCmd(args)
    console.info(data)
  }
}
else {
  const msg = helpDefault()
  console.info(msg)
  process.exit(0)
}

