import type { ParsedArgs } from 'minimist'

import { cmdSet, initialCliArgs } from './config.js'
import { helpDefault } from './helper.js'
import { CliArgs, CmdType, InputOptions, Options } from './types.js'


export function parseCliArgs(argv: ParsedArgs): CliArgs {
  const args: CliArgs = { ...initialCliArgs }
  const cmdArr: string[] = argv._.map(value => value.toString())

  args.cmd = parseCmd(cmdArr)
  args.needHelp = !! argv['h']
  args.debug = !! argv['d']

  return args
}


function parseCmd(args: string[]): CmdType {
  let command = ''

  for (let cmd of args) {
    cmd = cmd.toLowerCase()

    if (cmdSet.has(cmd)) {
      if (command) {
        throw new Error(`Duplicate command: "${cmd}" and "${command}"`)
      }
      else {
        command = cmd
      }
    }
  }

  if (! command) {
    const help = helpDefault()
    throw new Error(help)
  }
  return command as CmdType
}


export function parseCliOpts(
  _cmd: string,
  inputOptions: InputOptions,
): CliArgs['options'] {

  const opts = mergeOptions<Options>(initialCliArgs.options, inputOptions)
  const paths = parseMultiValue(opts.path)
  opts.path = paths.map(path => path.replace(/\\/ug, '/'))
  if (opts.project) {
    opts.project = opts.project.replace(/\\/ug, '/')
  }
  return opts
}


export function mergeOptions<T>(
  initOptions: T,
  inputOptions: InputOptions,
): T {

  const opts: T = { ...initOptions }
  const propMap: Map<string, string> = new Map<string, string>() // <upperKey, oriKey>

  Object.keys(opts).forEach((key) => {
    propMap.set(key.toUpperCase(), key)
  })

  Object.keys(inputOptions).forEach((key) => {
    const upperKey = key.toUpperCase()

    if (propMap.has(upperKey)) {
      Object.defineProperty(opts, propMap.get(upperKey) as string, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: inputOptions[key],
      })
    }
  })

  return opts
}


export function parseMultiValue(arg: unknown): string[] {
  const arr = arg ? String(arg).split(',') : []
  const ret: string[] = []

  if (arr.length) {
    for (let value of arr) {
      value = value.trim()
      if (value) {
        ret.push(value)
      }
    }
  }

  return ret
}

