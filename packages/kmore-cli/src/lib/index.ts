import { buildSource } from './transformer.js'
import type { FilePath, Options, RunCmdArgs } from './types.js'


export async function runCmd(args: RunCmdArgs): Promise<FilePath[]> {
  const { cmd, options, debug } = args

  debug && console.info(options)
  switch (cmd) {
    case 'gen': {
      const resp = await gen(options)
      return [...resp]
    }

    default:

      throw new Error(`invalid cmd: "${cmd}"`)
  }

}


async function gen(options: Options): Promise<Set<FilePath>> {
  const ret = await buildSource(options)
  return ret
}

