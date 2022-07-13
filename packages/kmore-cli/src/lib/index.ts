import { Observable } from 'rxjs'

import { buildSource } from './transformer.js'
import { RunCmdArgs, Options, FilePath } from './types.js'


export function runCmd(args: RunCmdArgs): Observable<FilePath> {
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


function gen(options: Options): Observable<FilePath> {
  return buildSource(options)
}

