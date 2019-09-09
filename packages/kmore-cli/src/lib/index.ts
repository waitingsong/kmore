import { log } from '@waiting/log'
import { Observable } from 'rxjs'
import { buildSource } from 'kmore-types'

import { RunCmdArgs, Options } from './model'


export function runCmd(args: RunCmdArgs): Observable<string> {
  const { cmd, options, debug } = args

  debug && options && log(options)
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

