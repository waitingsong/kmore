import { buildSource } from 'kmore-types'
import { Observable } from 'rxjs'

import { RunCmdArgs, Options } from './model'


export function runCmd(args: RunCmdArgs): Observable<string> {
  const { cmd, options, debug } = args

  debug && options && console.info(options)
  switch (cmd) {
    case 'gen':
      return gen(options)

    default:
      throw new Error(`invalid cmd: "${cmd}"`)
  }
}


function gen(options: Options): Observable<string> {
  return buildSource(options)
}

