import { buildSource } from 'kmore-types'
import { Observable } from 'rxjs'

import { RunCmdArgs, Options } from './model'


export function runCmd(args: RunCmdArgs): Observable<string> {
  const { cmd, options, debug } = args

  debug && console.info(options)
  switch (cmd) {
    case 'gen':
      return gen(options)

    default:
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`invalid cmd: "${cmd}"`)
  }
}


function gen(options: Options): Observable<string> {
  return buildSource(options)
}

