import { cmdSet, tw2 } from './config.js'
import { CmdType } from './types.js'


export function genCmdHelp(command: CmdType | ''): string {
  switch (command) {
    case 'gen':
      return helpGen()

    default:
      return helpDefault()
  }
}


export function helpDefault(): string {
  const head = 'Standard commands\n'
  const arr = Array.from(cmdSet)
  const more = 'More help: kmore <command> -h'

  return `${head}${arr.join('\t')}\n\n${more}`
}


export function helpGen(): string {
  const head = 'Usage: gen [options]'
  const body = 'Valid options are:'
  const opts = [
    ` -h${tw2}Display this summary`,
    ` -d${tw2}Display debug info`,
  ]

  return `${head}\n${body}\n${opts.join('\n')}`
}

