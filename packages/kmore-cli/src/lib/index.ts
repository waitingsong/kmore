import { buildSource } from './transformer.js'
import { RunCmdArgs, Options, FilePath } from './types.js'


export async function runCmd(args: RunCmdArgs): Promise<FilePath[]> {
  const { cmd, options, debug } = args

  debug && console.info(options)
  switch (cmd) {
    case 'gen': {
      const resp = await gen(options)
      return [...resp]
    }

    default:
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`invalid cmd: "${cmd}"`)
  }

}


async function gen(options: Options): Promise<Set<FilePath>> {
  const ret = await buildSource(options)
  return ret
}

